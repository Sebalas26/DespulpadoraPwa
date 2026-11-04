const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

let makeWASocket = null;
let useMultiFileAuthState = null;
let DisconnectReason = { loggedOut: 401, badSession: 500 };
let downloadMediaMessage = null;
let baileysLoadPromise = null;

/**
 * Dynamically loads @whiskeysockets/baileys supporting both CommonJS require and ESM dynamic import.
 */
async function ensureBaileysLoaded() {
  if (makeWASocket && useMultiFileAuthState) {
    return;
  }
  if (baileysLoadPromise) {
    await baileysLoadPromise;
    return;
  }
  baileysLoadPromise = (async () => {
    let mod = null;
    try {
      mod = require('@whiskeysockets/baileys');
    } catch (requireErr) {
      void requireErr;
      mod = await import('@whiskeysockets/baileys');
    }
    const resolved = mod && mod.default && typeof mod.default === 'object' && !mod.useMultiFileAuthState ? mod.default : mod;
    makeWASocket = (resolved && (resolved.default || resolved.makeWASocket)) || (mod && mod.default);
    useMultiFileAuthState = (resolved && resolved.useMultiFileAuthState) || (mod && mod.useMultiFileAuthState);
    DisconnectReason = (resolved && resolved.DisconnectReason) || (mod && mod.DisconnectReason) || DisconnectReason;
    downloadMediaMessage = (resolved && resolved.downloadMediaMessage) || (mod && mod.downloadMediaMessage);
  })();
  try {
    await baileysLoadPromise;
  } finally {
    baileysLoadPromise = null;
  }
}

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.WHATSAPP_GATEWAY_PORT) || 3005;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const BOT_CONFIG_FILE = path.join(__dirname, 'bot_config.json');
const INCOMING_ORDERS_FILE = path.join(__dirname, 'whatsapp_incoming_orders.json');

let sock = null;
let gatewayState = {
  status: 'DISCONNECTED',
  connected: false,
  qrDataUrl: null,
  phoneNumber: null,
  name: null,
  lastUpdatedAt: new Date().toISOString()
};
let isInitializing = false;
let connectionAttemptId = 0;
let reconnectTimer = null;
let cachedBaileysVersion = null;
let qrWaiters = [];

let botConfig = {
  botEnabled: true,
  autoReplyEnabled: true,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  backendApiUrl: 'https://apidevdespulpadora.parking-flow.com/api',
  lastSyncedAt: null
};

let contextStore = {
  fruits: [],
  clients: [],
  orders: []
};

let incomingOrders = [];
const pendingDraftsByPhone = new Map();
const pendingHistoryChoicesByPhone = new Map();

/**
 * Loads saved bot configuration and incoming orders from disk on startup.
 */
function loadPersistedData() {
  try {
    if (fs.existsSync(BOT_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(BOT_CONFIG_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        botConfig = {
          ...botConfig,
          botEnabled: typeof parsed.botEnabled === 'boolean' ? parsed.botEnabled : botConfig.botEnabled,
          autoReplyEnabled:
            typeof parsed.autoReplyEnabled === 'boolean' ? parsed.autoReplyEnabled : botConfig.autoReplyEnabled,
          geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : botConfig.geminiApiKey,
          backendApiUrl:
            typeof parsed.backendApiUrl === 'string' && parsed.backendApiUrl.trim()
              ? parsed.backendApiUrl.trim()
              : botConfig.backendApiUrl,
          lastSyncedAt: parsed.lastSyncedAt || null
        };
        if (Array.isArray(parsed.fruits)) {
          contextStore.fruits = parsed.fruits;
        }
        if (Array.isArray(parsed.clients)) {
          contextStore.clients = parsed.clients;
        }
        if (Array.isArray(parsed.orders)) {
          contextStore.orders = parsed.orders;
        }
      }
    }
  } catch (err) {
    console.error('Error loading bot_config.json:', err);
  }

  try {
    if (fs.existsSync(INCOMING_ORDERS_FILE)) {
      const savedOrders = JSON.parse(fs.readFileSync(INCOMING_ORDERS_FILE, 'utf8'));
      if (Array.isArray(savedOrders)) {
        incomingOrders = savedOrders;
      }
    }
  } catch (err) {
    console.error('Error loading whatsapp_incoming_orders.json:', err);
  }
}

/**
 * Persists the current bot configuration and synchronized catalog/history to disk.
 */
function saveBotConfigToDisk() {
  try {
    const payload = {
      ...botConfig,
      fruits: contextStore.fruits,
      clients: contextStore.clients,
      orders: contextStore.orders.slice(0, 300)
    };
    fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving bot_config.json:', err);
  }
}

/**
 * Persists the list of orders created via WhatsApp to disk.
 */
function saveIncomingOrdersToDisk() {
  try {
    fs.writeFileSync(INCOMING_ORDERS_FILE, JSON.stringify(incomingOrders.slice(0, 200), null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving whatsapp_incoming_orders.json:', err);
  }
}

/**
 * Fetches the active fruit catalog directly from the backend API when needed.
 */
async function refreshCatalogFromBackend() {
  try {
    const baseUrl = (botConfig.backendApiUrl || '').replace(/\/+$/, '');
    if (!baseUrl) {
      return;
    }
    const response = await fetch(`${baseUrl}/fruits`);
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const list = Array.isArray(data) ? data : Array.isArray(data && data.data) ? data.data : [];
    if (list.length > 0) {
      contextStore.fruits = list.map((f) => ({
        fruitId: Number(f.fruitId || f.id || 0),
        name: String(f.name || '').trim(),
        prices: {
          g140: Number((f.prices && f.prices.g140) || f.price140g || f.unitPrice || 0),
          g250: Number((f.prices && f.prices.g250) || f.price250g || f.unitPrice || 0),
          g500: Number((f.prices && f.prices.g500) || f.price500g || f.unitPrice || 0),
          g1000: Number((f.prices && f.prices.g1000) || f.price1000g || f.unitPrice || 0)
        }
      }));
      botConfig.lastSyncedAt = new Date().toISOString();
      saveBotConfigToDisk();
    }
  } catch (catalogErr) {
    void catalogErr;
  }
}

/**
 * Normalizes text by lowercasing and stripping diacritics/accents.
 */
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Extracts the last 10 digits of a phone number for reliable Colombian phone matching.
 */
function normalizePhoneDigits(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D+/g, '');
  if (digits.length > 10 && digits.startsWith('57')) {
    return digits.slice(2, 12);
  }
  return digits.slice(-10);
}

/**
 * Formats a Colombian or international phone number to a valid WhatsApp JID.
 */
function formatPhoneToJid(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D+/g, '');
  if (!digits || digits.length < 7) {
    return null;
  }
  const normalized = digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits;
  return `${normalized}@s.whatsapp.net`;
}

/**
 * Finds a registered client and their historical orders by phone number or name.
 */
function findCustomerContext(rawPhone, pushName) {
  const cleanPhone = normalizePhoneDigits(rawPhone);
  const matchedClient =
    contextStore.clients.find((c) => {
      const cPhone = normalizePhoneDigits(c.phone || c.clientPhone || '');
      return cPhone && cleanPhone && cPhone === cleanPhone;
    }) || null;

  const clientOrders = contextStore.orders
    .filter((o) => {
      const oPhone = normalizePhoneDigits(o.clientPhone || o.customerPhone || '');
      if (oPhone && cleanPhone && oPhone === cleanPhone) {
        return true;
      }
      if (
        matchedClient &&
        matchedClient.fullName &&
        normalizeText(o.clientName) === normalizeText(matchedClient.fullName)
      ) {
        return true;
      }
      return false;
    })
    .filter((o) => Array.isArray(o.items) && o.items.length > 0 && o.status !== 'CANCELLED')
    .sort((a, b) => {
      const da = String(b.orderDate || b.createdAt || '');
      const db = String(a.orderDate || a.createdAt || '');
      return da.localeCompare(db);
    });

  const mostRecentOrder = clientOrders[0] || null;
  const resolvedName =
    (matchedClient && (matchedClient.fullName || matchedClient.name)) ||
    (mostRecentOrder && mostRecentOrder.clientName) ||
    (pushName && String(pushName).trim()) ||
    `Cliente WhatsApp (${cleanPhone})`;

  const resolvedAddress =
    (matchedClient && matchedClient.address) ||
    (mostRecentOrder && mostRecentOrder.clientAddress) ||
    'Por confirmar por WhatsApp';

  return {
    phone: cleanPhone,
    clientName: resolvedName,
    clientAddress: resolvedAddress,
    matchedClient,
    recentOrders: clientOrders.slice(0, 5)
  };
}

/**
 * Resolves the current unit price of a fruit and grammage from the synchronized catalog.
 */
function resolveFruitPrice(fruitObj, grammage, fallbackUnitPrice = 0) {
  if (!fruitObj || !fruitObj.prices) {
    return Number(fallbackUnitPrice || 0);
  }
  const key = `g${grammage}`;
  const price = Number(fruitObj.prices[key] || 0);
  if (price > 0) {
    return price;
  }
  return Number(fallbackUnitPrice || fruitObj.prices.g250 || fruitObj.prices.g500 || 0);
}

/**
 * Converts Spanish number words into numeric quantities, ignoring presentation grammage numbers.
 */
function parseSpanishQuantityTokens(textSegment) {
  const wordMap = {
    un: 1,
    una: 1,
    uno: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    docena: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    veinte: 20,
    veinticinco: 25,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100
  };
  const strippedGrammage = String(textSegment || '').replace(
    /\b(140|250|500|1000)\s*(g|gr|gramos|kilo|kilos|kg)?\b/gi,
    ' '
  );
  const digitMatch = strippedGrammage.match(/\b(\d{1,3})\b/);
  if (digitMatch) {
    const val = parseInt(digitMatch[1], 10);
    if (val > 0 && val <= 500) {
      return val;
    }
  }
  const tokens = normalizeText(strippedGrammage)
    .replace(/[.,;!?¡¿]/g, ' ')
    .split(/\s+/);
  for (const token of tokens) {
    if (wordMap[token]) {
      return wordMap[token];
    }
  }
  return 1;
}

/**
 * Detects the requested presentation grammage (140, 250, 500, 1000) in a phrase.
 */
function parseGrammageFromSegment(textSegment) {
  const norm = normalizeText(textSegment).replace(/[.,;!?¡¿]/g, ' ');
  if (/\b(1000|1000g|1000gr|mil\s*gramos|un\s*kilo|1\s*kg|1\s*kilo|kilo|kilos|kl)\b/.test(norm)) {
    return 1000;
  }
  if (/\b(250|250g|250gr|doscientos\s*cincuenta|media\s*libra)\b/.test(norm)) {
    return 250;
  }
  if (/\b(500|500g|500gr|quinientos\s*gramos|quinientos|medio\s*kilo|libra|libras|lb)\b/.test(norm)) {
    return 500;
  }
  if (/\b(140|140g|140gr|ciento\s*cuarenta|personal|pequena|pequeno)\b/.test(norm)) {
    return 140;
  }
  return 500;
}

/**
 * Parses natural-language Colombian Spanish order text against the live fruit catalog.
 */
function parseOrderItemsLocally(rawText) {
  const normFull = normalizeText(rawText);
  if (!normFull || contextStore.fruits.length === 0) {
    return [];
  }

  const sortedFruits = [...contextStore.fruits]
    .filter((f) => f && f.name)
    .sort((a, b) => b.name.length - a.name.length);

  const clauses = normFull
    .split(/(?:,|;|\+|\by\b|\be\b|\n)+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const extractedMap = new Map();

  for (const clause of clauses) {
    for (const fruit of sortedFruits) {
      const normFruit = normalizeText(fruit.name);
      if (!normFruit) {
        continue;
      }
      if (clause.includes(normFruit)) {
        const beforeFruit = clause.split(normFruit)[0] || clause;
        const quantity = parseSpanishQuantityTokens(beforeFruit || clause);
        const grammage = parseGrammageFromSegment(clause);
        const unitPrice = resolveFruitPrice(fruit, grammage, 0);
        const mapKey = `${fruit.name.toLowerCase()}_${grammage}`;
        const existing = extractedMap.get(mapKey);
        if (existing) {
          existing.quantity += quantity;
          existing.subtotal = existing.quantity * existing.unitPrice;
        } else {
          extractedMap.set(mapKey, {
            fruitId: Number(fruit.fruitId || 0),
            fruitName: fruit.name,
            grammage,
            quantity,
            unitPrice,
            subtotal: quantity * unitPrice
          });
        }
        break;
      }
    }
  }

  return Array.from(extractedMap.values());
}

/**
 * Checks whether the customer's message asks to repeat a previous/recent order ("el pedido de qué días").
 */
function isRepeatOrderIntent(rawText) {
  const norm = normalizeText(rawText);
  const patterns = [
    /pedido\s+de\s+que\s+dias/,
    /el\s+de\s+que\s+dias/,
    /de\s+que\s+dias/,
    /pedido\s+anterior/,
    /ultimo\s+pedido/,
    /mismo\s+pedido/,
    /el\s+de\s+la\s+vez\s+pasada/,
    /el\s+de\s+siempre/,
    /lo\s+de\s+siempre/,
    /repetir\s+(el\s+)?pedido/,
    /repitame\s+(el\s+)?pedido/,
    /mandeme\s+el\s+mismo/,
    /deme\s+el\s+mismo/
  ];
  return patterns.some((re) => re.test(norm));
}

/**
 * Checks if the message is a short confirmation ("SÍ", "CONFIRMO", "DALE").
 */
function isConfirmationMessage(rawText) {
  const norm = normalizeText(rawText)
    .replace(/[.,;!:¡¿?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^(si|sii+|si\s+senor|si\s+claro|si\s+confirmo|confirmo|confirmar|confirmado|confirmelo|dale|listo|listo\s+hagale|de\s+una|ok|hagale|envielo|si\s+por\s+favor|por\s+supuesto|correcto|asi\s+esta\s+bien)$/.test(
    norm
  );
}

/**
 * Checks if the message is a cancellation ("NO", "CANCELAR").
 */
function isCancellationMessage(rawText) {
  const norm = normalizeText(rawText)
    .replace(/[.,;!:¡¿?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^(no|cancelar|cancela|cancelalo|olvide|no\s+gracias)$/.test(norm);
}

/**
 * Formats an itemized order draft into a WhatsApp message summary.
 */
function formatDraftConfirmationReply(draft, headerText) {
  const lines = (draft.items || []).map(
    (item) =>
      `• ${item.quantity}x *${item.fruitName}* (${item.grammage}g) — $${Number(
        item.quantity * item.unitPrice
      ).toLocaleString('es-CO')}`
  );
  const total = (draft.items || []).reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  return [
    headerText || `🍓 *Resumen de tu pedido (${draft.clientName})*:`,
    ...lines,
    `💰 *Total estimado:* $${Number(total).toLocaleString('es-CO')}`,
    `📍 *Dirección:* ${draft.clientAddress}`,
    '',
    'Responde *SÍ* para confirmar y enviarlo a planta, o escribe cualquier cambio.'
  ].join('\n');
}

/**
 * Calls Google Gemini Multimodal API (text or voice note audio) to extract intent and order items.
 */
async function analyzeWithGemini(options) {
  const apiKey = (botConfig.geminiApiKey || '').trim();
  if (!apiKey) {
    return null;
  }

  try {
    const catalogDescription = contextStore.fruits
      .map(
        (f) =>
          `${f.name} (ID:${f.fruitId}, 140g:$${f.prices?.g140 || 0}, 250g:$${f.prices?.g250 || 0}, 500g:$${
            f.prices?.g500 || 0
          }, 1000g:$${f.prices?.g1000 || 0})`
      )
      .join('; ');

    const recentHistoryDescription = (options.recentOrders || [])
      .slice(0, 3)
      .map((o, idx) => {
        const itemsStr = (o.items || [])
          .map((i) => `${i.quantity}x ${i.fruitName} ${i.grammage}g`)
          .join(', ');
        return `Pedido #${idx + 1} (${o.orderDate || 'Reciente'}): ${itemsStr}`;
      })
      .join(' | ');

    const systemPrompt = [
      'Eres el asistente receptor de pedidos de una despulpadora de fruta en Colombia.',
      `Catálogo real de frutas y precios: ${catalogDescription || 'Sin catálogo sincronizado'}.`,
      `Historial reciente de este cliente (${options.clientName}): ${
        recentHistoryDescription || 'Sin pedidos previos'
      }.`,
      'Gramajes válidos: 140, 250 (media libra), 500 (libra), 1000 (kilo). Si el cliente no especifica gramaje usa 500.',
      'Si el cliente pide "el pedido de qué días", "el de siempre" o "el último pedido", toma los ítems del Pedido #1 del historial (y aplica cualquier cambio o adición que mencione).',
      'Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:',
      '{"intent":"NEW_ORDER"|"REPEAT_ORDER"|"CONFIRM"|"CANCEL"|"IGNORE","transcript":"texto transcrito o interpretado","items":[{"fruitName":"NombreExactoCatalogo","grammage":500,"quantity":10}]}'
    ].join('\n');

    const parts = [{ text: systemPrompt }];
    if (options.audioBase64) {
      parts.push({
        inlineData: {
          mimeType: options.mimeType || 'audio/ogg',
          data: options.audioBase64
        }
      });
      parts.push({ text: 'Transcribe esta nota de voz de WhatsApp y extrae el pedido en JSON.' });
    } else {
      parts.push({ text: `Mensaje del cliente: "${options.text || ''}"` });
    }

    const isVertexExpressKey = apiKey.startsWith('AQ.');
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash'
    ];
    const endpointBuilders = isVertexExpressKey
      ? [
          (model) =>
            `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(
              apiKey
            )}`,
          (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
              apiKey
            )}`
        ]
      : [
          (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
              apiKey
            )}`,
          (model) =>
            `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(
              apiKey
            )}`
        ];

    const requestBody = JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    for (const buildUrl of endpointBuilders) {
      for (const modelName of candidateModels) {
        try {
          const response = await fetch(buildUrl(modelName), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: requestBody
          });

          if (!response.ok) {
            continue;
          }

          const result = await response.json();
          const rawCandidate =
            result &&
            result.candidates &&
            result.candidates[0] &&
            result.candidates[0].content &&
            result.candidates[0].content.parts &&
            result.candidates[0].content.parts[0] &&
            result.candidates[0].content.parts[0].text;

          if (!rawCandidate) {
            continue;
          }

          const cleanedJson = String(rawCandidate)
            .replace(/^```json/i, '')
            .replace(/```$/i, '')
            .trim();
          return JSON.parse(cleanedJson);
        } catch (attemptErr) {
          void attemptErr;
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error calling Gemini API:', err);
    return null;
  }
}

/**
 * Transcribes a WhatsApp voice note (base64 OGG/Opus) using OpenAI Whisper Large-V3 Gradio endpoints without requiring an API key.
 */
async function transcribeAudioWithWhisperFallback(audioBase64, mimeType = 'audio/ogg') {
  if (!audioBase64 || audioBase64 === 'AUDIO_DOWNLOAD_FAILED') {
    return null;
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (!audioBuffer || audioBuffer.length === 0) {
    return null;
  }

  const endpoints = [
    {
      base: 'https://hf-audio-whisper-large-v3.hf.space',
      fnPath: 'transcribe',
      buildData: (uploadedPath) => [
        { path: uploadedPath, meta: { _type: 'gradio.FileData' } },
        'transcribe'
      ]
    },
    {
      base: 'https://openai-whisper.hf.space',
      fnPath: 'predict',
      buildData: (uploadedPath) => [
        { path: uploadedPath, meta: { _type: 'gradio.FileData' } },
        'transcribe'
      ]
    }
  ];

  for (const ep of endpoints) {
    try {
      const form = new FormData();
      const cleanMime = String(mimeType || 'audio/ogg').split(';')[0].trim() || 'audio/ogg';
      const blob = new Blob([audioBuffer], { type: cleanMime });
      form.append('files', blob, 'voice.ogg');

      const uploadCtrl = new AbortController();
      const uploadTimer = setTimeout(() => uploadCtrl.abort(), 8000);
      const uploadRes = await fetch(`${ep.base}/gradio_api/upload`, {
        method: 'POST',
        body: form,
        signal: uploadCtrl.signal
      });
      clearTimeout(uploadTimer);

      if (!uploadRes.ok) {
        continue;
      }

      const uploadedFiles = await uploadRes.json();
      const uploadedPath = Array.isArray(uploadedFiles) ? uploadedFiles[0] : null;
      if (!uploadedPath) {
        continue;
      }

      const callCtrl = new AbortController();
      const callTimer = setTimeout(() => callCtrl.abort(), 8000);
      const callRes = await fetch(`${ep.base}/gradio_api/call/${ep.fnPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: ep.buildData(uploadedPath) }),
        signal: callCtrl.signal
      });
      clearTimeout(callTimer);

      if (!callRes.ok) {
        continue;
      }

      const callJson = await callRes.json();
      const eventId = callJson && callJson.event_id;
      if (!eventId) {
        continue;
      }

      const streamCtrl = new AbortController();
      const streamTimer = setTimeout(() => streamCtrl.abort(), 14000);
      const streamRes = await fetch(`${ep.base}/gradio_api/call/${ep.fnPath}/${eventId}`, {
        signal: streamCtrl.signal
      });
      const sseText = await streamRes.text();
      clearTimeout(streamTimer);

      const lines = sseText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('event: complete') && lines[i + 1] && lines[i + 1].startsWith('data: ')) {
          const parsedData = JSON.parse(lines[i + 1].slice(6));
          const transcript = Array.isArray(parsedData) && parsedData[0] ? String(parsedData[0]).trim() : '';
          if (transcript) {
            return transcript;
          }
        }
      }
    } catch (whisperErr) {
      void whisperErr;
    }
  }

  return null;
}

/**
 * Converts historical order items into a fresh draft with up-to-date catalog prices.
 */
function buildItemsFromHistoricalOrder(historicalOrder, extraItems = []) {
  const baseItems = (historicalOrder.items || []).map((item) => {
    const matchedFruit = contextStore.fruits.find(
      (f) =>
        (item.fruitName && normalizeText(f.name) === normalizeText(item.fruitName)) ||
        (Number(item.fruitId) > 0 && Number(f.fruitId) === Number(item.fruitId))
    );
    const grammage = Number(item.grammage || item.presentationGrams || 500);
    const unitPrice = resolveFruitPrice(matchedFruit, grammage, item.unitPrice);
    const quantity = Number(item.quantity || 1);
    return {
      fruitId: Number((matchedFruit && matchedFruit.fruitId) || item.fruitId || 0),
      fruitName: (matchedFruit && matchedFruit.name) || item.fruitName,
      grammage,
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice
    };
  });

  for (const extra of extraItems) {
    const existing = baseItems.find(
      (b) => normalizeText(b.fruitName) === normalizeText(extra.fruitName) && b.grammage === extra.grammage
    );
    if (existing) {
      existing.quantity += extra.quantity;
      existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
      baseItems.push({ ...extra });
    }
  }

  return baseItems;
}

/**
 * Creates a confirmed order in the backend API and appends it to the incomingOrders queue for the PWA.
 */
async function finalizeAndCreateOrder(draft) {
  const nowIso = new Date().toISOString();
  const datePart = nowIso.substring(0, 10).replace(/-/g, '');
  const randomDigits = Math.floor(100 + Math.random() * 900);
  const generatedOrderNumber = `PED-${datePart}-${randomDigits}`;
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const scheduledDay = days[new Date().getDay()] || 'Lunes';
  const totalAmount = (draft.items || []).reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  let backendOrderId = Date.now();
  let finalOrderNumber = generatedOrderNumber;

  try {
    const baseUrl = (botConfig.backendApiUrl || '').replace(/\/+$/, '');
    if (baseUrl) {
      const apiPayload = {
        clientName: draft.clientName,
        customerName: draft.clientName,
        clientPhone: draft.phone,
        customerPhone: draft.phone,
        clientAddress: draft.clientAddress,
        deliveryAddress: draft.clientAddress,
        paymentMethod: draft.paymentMethod || '',
        scheduledDay,
        isPriority: false,
        notes: draft.notes || `Pedido automático WhatsApp (${draft.sourceType || 'TEXTO'})`,
        items: draft.items.map((item) => ({
          fruitId: item.fruitId || 1,
          fruitName: item.fruitName,
          sizeKey: `${item.grammage}g`,
          presentationGrams: item.grammage,
          grammage: item.grammage,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
      if (res.ok) {
        const created = await res.json();
        const dto = created && created.data ? created.data : created;
        if (dto && (dto.orderId || dto.id)) {
          backendOrderId = Number(dto.orderId || dto.id);
        }
        if (dto && dto.orderNumber) {
          finalOrderNumber = String(dto.orderNumber);
        }
      }
    }
  } catch (err) {
    console.error('Error posting WhatsApp order to backend API:', err);
  }

  const orderRecord = {
    orderId: backendOrderId,
    orderNumber: finalOrderNumber,
    clientName: draft.clientName,
    clientPhone: draft.phone,
    clientAddress: draft.clientAddress,
    status: 'PENDING',
    orderDate: nowIso.substring(0, 10),
    scheduledDay,
    isPriority: false,
    totalAmount,
    isPaid: false,
    paymentMethodName: draft.paymentMethod || '',
    notes: draft.notes || `Pedido automático WhatsApp (${draft.sourceType || 'TEXTO'})`,
    sourceType: draft.sourceType || 'TEXTO',
    rawMessage: draft.rawMessage || '',
    createdAt: nowIso,
    items: draft.items.map((i) => ({
      fruitId: i.fruitId || 0,
      fruitName: i.fruitName,
      grammage: i.grammage,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.quantity * i.unitPrice,
      pickedQuantity: 0
    }))
  };

  incomingOrders.unshift(orderRecord);
  contextStore.orders.unshift(orderRecord);
  saveIncomingOrdersToDisk();
  saveBotConfigToDisk();

  return orderRecord;
}

/**
 * Processes an incoming customer text or audio interaction and returns the bot's action and reply.
 */
async function processCustomerOrderInteraction({
  rawPhone,
  pushName,
  text,
  audioBase64,
  mimeType,
  autoConfirm = false
}) {
  if (!botConfig.botEnabled) {
    return {
      handled: false,
      reason: 'BOT_DISABLED',
      replyText: null,
      createdOrder: null
    };
  }

  if (contextStore.fruits.length === 0) {
    await refreshCatalogFromBackend();
  }

  const customer = findCustomerContext(rawPhone, pushName);
  const phoneKey = customer.phone;
  let incomingText = String(text || '').trim();
  let detectedSourceType = audioBase64 ? 'AUDIO' : 'TEXTO';
  let aiAnalysis = null;

  if (audioBase64 && audioBase64 !== 'AUDIO_DOWNLOAD_FAILED') {
    aiAnalysis = await analyzeWithGemini({
      audioBase64,
      mimeType: mimeType || 'audio/ogg',
      clientName: customer.clientName,
      recentOrders: customer.recentOrders
    });
    if (aiAnalysis && aiAnalysis.transcript) {
      incomingText = String(aiAnalysis.transcript).trim();
    }
    if (!incomingText) {
      const whisperTranscript = await transcribeAudioWithWhisperFallback(
        audioBase64,
        mimeType || 'audio/ogg'
      );
      if (whisperTranscript) {
        incomingText = whisperTranscript;
      }
    }
  }

  const pendingChoices = pendingHistoryChoicesByPhone.get(phoneKey);
  const choiceMatch = incomingText.match(/^[1-3]$/);
  if (pendingChoices && choiceMatch) {
    const idx = parseInt(choiceMatch[0], 10) - 1;
    const chosenOrder = pendingChoices[idx];
    if (chosenOrder) {
      pendingHistoryChoicesByPhone.delete(phoneKey);
      const items = buildItemsFromHistoricalOrder(chosenOrder);
      const draft = {
        phone: phoneKey,
        clientName: customer.clientName,
        clientAddress: customer.clientAddress,
        items,
        sourceType: 'HISTORIAL',
        rawMessage: incomingText,
        notes: `Pedido repetido por WhatsApp (Ref: ${chosenOrder.orderDate || chosenOrder.orderNumber || 'Anterior'})`
      };
      pendingDraftsByPhone.set(phoneKey, draft);
      const replyText = formatDraftConfirmationReply(
        draft,
        `🔄 *¡Listo ${customer.clientName}! Cargamos tu pedido del ${
          chosenOrder.orderDate || 'día seleccionado'
        }:*`
      );
      return {
        handled: true,
        action: 'DRAFT_FROM_HISTORY_CHOICE',
        replyText,
        draft,
        createdOrder: null
      };
    }
  }

  const existingDraft = pendingDraftsByPhone.get(phoneKey);
  if (
    existingDraft &&
    (isConfirmationMessage(incomingText) || (aiAnalysis && aiAnalysis.intent === 'CONFIRM'))
  ) {
    pendingDraftsByPhone.delete(phoneKey);
    pendingHistoryChoicesByPhone.delete(phoneKey);
    const createdOrder = await finalizeAndCreateOrder(existingDraft);
    const replyText = [
      `✅ *¡Pedido Confirmado!*`,
      `📄 Orden: *#${createdOrder.orderNumber}*`,
      `👤 Cliente: ${createdOrder.clientName}`,
      `💰 Total: *$${Number(createdOrder.totalAmount).toLocaleString('es-CO')}*`,
      `Tu pedido ya fue enviado automáticamente a planta para alistamiento.`
    ].join('\n');
    return {
      handled: true,
      action: 'ORDER_CREATED',
      replyText,
      draft: null,
      createdOrder
    };
  }

  if (
    existingDraft &&
    (isCancellationMessage(incomingText) || (aiAnalysis && aiAnalysis.intent === 'CANCEL'))
  ) {
    pendingDraftsByPhone.delete(phoneKey);
    pendingHistoryChoicesByPhone.delete(phoneKey);
    return {
      handled: true,
      action: 'DRAFT_CANCELLED',
      replyText: '🛑 Hemos cancelado el borrador del pedido. Escríbenos qué pulpas deseas pedir cuando gustes.',
      draft: null,
      createdOrder: null
    };
  }

  if (isRepeatOrderIntent(incomingText) || (aiAnalysis && aiAnalysis.intent === 'REPEAT_ORDER')) {
    detectedSourceType = 'HISTORIAL';
    if (customer.recentOrders.length === 0) {
      return {
        handled: true,
        action: 'NO_HISTORY_FOUND',
        replyText: `¡Hola ${customer.clientName}! No encontramos un pedido anterior registrado con este número 📱. Escríbenos o envíanos una nota de voz con las frutas y gramajes que deseas hoy.`,
        draft: null,
        createdOrder: null
      };
    }

    const extraParsedItems = parseOrderItemsLocally(incomingText);
    const mostRecent = customer.recentOrders[0];
    const items = buildItemsFromHistoricalOrder(mostRecent, extraParsedItems);

    const draft = {
      phone: phoneKey,
      clientName: customer.clientName,
      clientAddress: customer.clientAddress,
      items,
      sourceType: 'HISTORIAL',
      rawMessage: incomingText,
      notes: `Pedido repetido por WhatsApp ("el de qué días" - Ref: ${
        mostRecent.orderDate || mostRecent.orderNumber || 'Último pedido'
      })`
    };
    pendingDraftsByPhone.set(phoneKey, draft);

    if (autoConfirm) {
      pendingDraftsByPhone.delete(phoneKey);
      const createdOrder = await finalizeAndCreateOrder(draft);
      return {
        handled: true,
        action: 'ORDER_CREATED',
        replyText: `✅ *¡Pedido #${createdOrder.orderNumber} repetido y creado en planta!* Total: $${Number(
          createdOrder.totalAmount
        ).toLocaleString('es-CO')}`,
        draft: null,
        createdOrder
      };
    }

    if (customer.recentOrders.length > 1 && extraParsedItems.length === 0) {
      pendingHistoryChoicesByPhone.set(phoneKey, customer.recentOrders.slice(0, 3));
      const historyLines = customer.recentOrders.slice(0, 3).map((ord, idx) => {
        const badge = idx === 0 ? '1️⃣' : idx === 1 ? '2️⃣' : '3️⃣';
        const summary = (ord.items || [])
          .map((i) => `${i.quantity}x ${i.fruitName} (${i.grammage}g)`)
          .join(', ');
        return `${badge} *${ord.orderDate || 'Reciente'}*: ${summary}`;
      });

      const replyText = [
        `¡Hola *${customer.clientName}*! Encontramos estos pedidos recientes tuyos:`,
        ...historyLines,
        '',
        formatDraftConfirmationReply(
          draft,
          `📌 *Tu último pedido (${mostRecent.orderDate || 'Más reciente'}) es:*`
        ),
        '👉 Responde *SÍ* para repetir el último, o responde *1*, *2* según la fecha que quieras repetir.'
      ].join('\n');

      return {
        handled: true,
        action: 'DRAFT_REPEAT_WITH_OPTIONS',
        replyText,
        draft,
        createdOrder: null
      };
    }

    const replyText = formatDraftConfirmationReply(
      draft,
      `¡Claro *${customer.clientName}*! Tu último pedido registrado (${
        mostRecent.orderDate || 'Reciente'
      }) es:`
    );
    return {
      handled: true,
      action: 'DRAFT_REPEAT_SINGLE',
      replyText,
      draft,
      createdOrder: null
    };
  }

  let parsedItems = parseOrderItemsLocally(incomingText);

  if (parsedItems.length === 0 && !aiAnalysis && botConfig.geminiApiKey) {
    aiAnalysis = await analyzeWithGemini({
      text: incomingText,
      clientName: customer.clientName,
      recentOrders: customer.recentOrders
    });
  }

  if (parsedItems.length === 0 && aiAnalysis && Array.isArray(aiAnalysis.items) && aiAnalysis.items.length > 0) {
    parsedItems = aiAnalysis.items
      .map((aiItem) => {
        const matchedFruit = contextStore.fruits.find(
          (f) => normalizeText(f.name) === normalizeText(aiItem.fruitName)
        );
        if (!matchedFruit) {
          return null;
        }
        const grammage = [140, 250, 500, 1000].includes(Number(aiItem.grammage))
          ? Number(aiItem.grammage)
          : 500;
        const quantity = Math.max(1, Number(aiItem.quantity || 1));
        const unitPrice = resolveFruitPrice(matchedFruit, grammage, 0);
        return {
          fruitId: Number(matchedFruit.fruitId || 0),
          fruitName: matchedFruit.name,
          grammage,
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice
        };
      })
      .filter(Boolean);
  }

  if (parsedItems.length > 0) {
    const draft = {
      phone: phoneKey,
      clientName: customer.clientName,
      clientAddress: customer.clientAddress,
      items: parsedItems,
      sourceType: detectedSourceType,
      rawMessage: incomingText,
      notes:
        detectedSourceType === 'AUDIO'
          ? `Pedido recibido por Nota de Voz WhatsApp: "${incomingText}"`
          : `Pedido recibido por WhatsApp: "${incomingText}"`
    };

    if (autoConfirm) {
      const createdOrder = await finalizeAndCreateOrder(draft);
      const replyText = [
        `✅ *¡Pedido #${createdOrder.orderNumber} creado automáticamente!*`,
        ...parsedItems.map(
          (i) =>
            `• ${i.quantity}x *${i.fruitName}* (${i.grammage}g) — $${Number(i.subtotal).toLocaleString('es-CO')}`
        ),
        `💰 *Total:* $${Number(createdOrder.totalAmount).toLocaleString('es-CO')}`
      ].join('\n');
      return {
        handled: true,
        action: 'ORDER_CREATED',
        replyText,
        draft: null,
        createdOrder
      };
    }

    pendingDraftsByPhone.set(phoneKey, draft);
    const header =
      detectedSourceType === 'AUDIO'
        ? `🎙️ *Escuchamos tu nota de voz (${customer.clientName}):*\n_"${incomingText}"_\n\n*¿Confirmas tu pedido?*`
        : `🍓 *¡Hola ${customer.clientName}! Armamos tu pedido así:*`;
    const replyText = formatDraftConfirmationReply(draft, header);
    return {
      handled: true,
      action: 'DRAFT_CREATED',
      replyText,
      draft,
      createdOrder: null
    };
  }

  if (audioBase64) {
    const catalogNames = contextStore.fruits.map((f) => f.name).join(', ');
    const catalogHint = catalogNames ? ` (*${catalogNames}*)` : '';
    const heardNote = incomingText ? ` Escuchamos: _"${incomingText}"_.` : '';
    return {
      handled: true,
      reason: 'AUDIO_UNMATCHED_ITEMS',
      replyText: `🎙️ Recibimos tu nota de voz (${customer.clientName}).${heardNote} Por favor indícanos la cantidad, fruta${catalogHint} y presentación (140g, 250g, 500g o 1000g), o di *"deme el pedido de qué días"*.`,
      createdOrder: null
    };
  }

  return {
    handled: false,
    reason: 'NO_ORDER_INTENT_DETECTED',
    replyText: null,
    createdOrder: null
  };
}

/**
 * Unwraps nested WhatsApp message containers (ephemeral, viewOnce, documentWithCaption) to access inner text or audio.
 */
function unwrapWhatsAppMessage(rawMessage) {
  let current = rawMessage || {};
  for (let depth = 0; depth < 4; depth++) {
    if (current.ephemeralMessage && current.ephemeralMessage.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage && current.viewOnceMessage.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2 && current.viewOnceMessageV2.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension && current.viewOnceMessageV2Extension.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage && current.documentWithCaptionMessage.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }
  return current || {};
}

/**
 * Resolves all pending promises waiting for a QR code or an active connection.
 */
function notifyQrWaiters() {
  const waiters = qrWaiters.splice(0, qrWaiters.length);
  for (const resolve of waiters) {
    try {
      resolve(gatewayState);
    } catch (waiterErr) {
      void waiterErr;
    }
  }
}

/**
 * Waits until a QR code is generated or WhatsApp is connected, up to timeoutMs.
 */
function waitForQrOrConnection(timeoutMs = 6000) {
  if (gatewayState.connected || gatewayState.qrDataUrl) {
    return Promise.resolve(gatewayState);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      qrWaiters = qrWaiters.filter((fn) => fn !== onReady);
      resolve(gatewayState);
    }, timeoutMs);

    function onReady(state) {
      clearTimeout(timer);
      resolve(state);
    }

    qrWaiters.push(onReady);
  });
}

/**
 * Safely closes and cleans up the current Baileys socket instance.
 */
function destroyCurrentSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try {
      if (sock.ev && typeof sock.ev.removeAllListeners === 'function') {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        sock.ev.removeAllListeners('messages.upsert');
      }
      sock.end(undefined);
    } catch (closeErr) {
      void closeErr;
    }
    sock = null;
  }
}

/**
 * Removes saved multi-device credentials from disk when logging out or resetting corrupt auth.
 */
function clearAuthDirectory() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Error clearing auth directory:', err);
  }
}

/**
 * Resolves the Baileys protocol version with live WhatsApp Web sw.js revision check (1.8s max) and modern fallback.
 */
async function resolveBaileysVersion() {
  if (cachedBaileysVersion) {
    return cachedBaileysVersion;
  }
  const fallbackVersion = [2, 3000, 1052897873];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const swRes = await fetch('https://web.whatsapp.com/sw.js', {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timer);
    if (swRes && swRes.ok) {
      const swText = await swRes.text();
      const match = swText.match(/"client_revision"\s*:\s*(\d+)/);
      if (match && match[1]) {
        const rev = Number(match[1]);
        if (Number.isFinite(rev) && rev > 1000000000) {
          cachedBaileysVersion = [2, 3000, rev];
          return cachedBaileysVersion;
        }
      }
    }
  } catch (err) {
    void err;
  }
  cachedBaileysVersion = fallbackVersion;
  return fallbackVersion;
}

/**
 * Initializes the Baileys WhatsApp Multi-Device socket and handles QR, connection, and incoming message events.
 */
async function connectToWhatsApp(forceFresh = false) {
  if (forceFresh) {
    destroyCurrentSocket();
    isInitializing = false;
  }

  if (sock && !forceFresh) {
    return;
  }

  if (isInitializing) {
    return;
  }
  isInitializing = true;
  const attemptId = ++connectionAttemptId;

  try {
    if (!gatewayState.connected) {
      gatewayState.status = 'CONNECTING';
      gatewayState.lastUpdatedAt = new Date().toISOString();
    }

    await ensureBaileysLoaded();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await resolveBaileysVersion();

    if (attemptId !== connectionAttemptId) {
      return;
    }

    const activeSock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: ['DGL Despulpadora PWA', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false
    });

    if (attemptId !== connectionAttemptId) {
      try {
        activeSock.end(undefined);
      } catch (_err) {
        return;
      }
      return;
    }

    sock = activeSock;

    activeSock.ev.on('creds.update', saveCreds);

    activeSock.ev.on('messages.upsert', async (upsertEvent) => {
      try {
        if (!botConfig.botEnabled) {
          return;
        }
        if (!upsertEvent || upsertEvent.type !== 'notify' || !Array.isArray(upsertEvent.messages)) {
          return;
        }

        for (const msg of upsertEvent.messages) {
          if (!msg || !msg.key || msg.key.fromMe) {
            continue;
          }
          const remoteJid = String(msg.key.remoteJid || '');
          if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
            continue;
          }

          const messageContent = unwrapWhatsAppMessage(msg.message);
          const textBody =
            messageContent.conversation ||
            (messageContent.extendedTextMessage && messageContent.extendedTextMessage.text) ||
            '';
          const audioMsg =
            messageContent.audioMessage ||
            (messageContent.documentMessage &&
            messageContent.documentMessage.mimetype &&
            String(messageContent.documentMessage.mimetype).startsWith('audio/')
              ? messageContent.documentMessage
              : null);

          if (!textBody && !audioMsg) {
            continue;
          }

          let audioBase64 = null;
          let mimeType = 'audio/ogg';
          if (audioMsg && typeof downloadMediaMessage === 'function') {
            try {
              const normalizedMsg = {
                ...msg,
                message: messageContent
              };
              const buffer = await downloadMediaMessage(
                normalizedMsg,
                'buffer',
                {},
                {
                  logger: pino({ level: 'silent' }),
                  reuploadRequest: activeSock.updateMediaMessage
                }
              );
              if (buffer && Buffer.isBuffer(buffer)) {
                audioBase64 = buffer.toString('base64');
                mimeType = audioMsg.mimetype ? String(audioMsg.mimetype).split(';')[0] : 'audio/ogg';
              }
            } catch (mediaErr) {
              console.error('Error downloading WhatsApp audio note:', mediaErr);
            }
          }

          const altJid = String(
            msg.key.senderPn || msg.key.remoteJidAlt || msg.key.participant || ''
          );
          const phoneSourceJid =
            remoteJid.endsWith('@lid') && altJid ? altJid : remoteJid;
          const senderDigits = phoneSourceJid.split(':')[0].split('@')[0];
          const interactionResult = await processCustomerOrderInteraction({
            rawPhone: senderDigits,
            pushName: msg.pushName || '',
            text: textBody,
            audioBase64: audioBase64 || (audioMsg ? 'AUDIO_DOWNLOAD_FAILED' : null),
            mimeType,
            autoConfirm: false
          });

          if (
            interactionResult &&
            interactionResult.handled &&
            interactionResult.replyText &&
            botConfig.autoReplyEnabled &&
            sock === activeSock
          ) {
            await activeSock.sendMessage(remoteJid, { text: interactionResult.replyText });
          }
        }
      } catch (upsertErr) {
        console.error('Error in messages.upsert listener:', upsertErr);
      }
    });

    activeSock.ev.on('connection.update', async (update) => {
      try {
        if (sock !== activeSock) {
          return;
        }

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 1 });
          gatewayState = {
            status: 'QR_READY',
            connected: false,
            qrDataUrl,
            phoneNumber: null,
            name: null,
            lastUpdatedAt: new Date().toISOString()
          };
          notifyQrWaiters();
        }

        if (connection === 'open') {
          const rawId = activeSock.user && activeSock.user.id ? activeSock.user.id : '';
          const phoneNumber = rawId.split(':')[0].split('@')[0] || null;
          const profileName =
            activeSock.user && activeSock.user.name ? activeSock.user.name : 'WhatsApp Vinculado';

          gatewayState = {
            status: 'CONNECTED',
            connected: true,
            qrDataUrl: null,
            phoneNumber,
            name: profileName,
            lastUpdatedAt: new Date().toISOString()
          };
          console.log(`[WhatsAppQrGateway] Connected as +${phoneNumber} (${profileName})`);
          notifyQrWaiters();
        }

        if (connection === 'close') {
          const statusCode =
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output &&
            lastDisconnect.error.output.statusCode;

          const loggedOut = statusCode === DisconnectReason.loggedOut;
          const badOrIncompatibleSession =
            statusCode === 405 ||
            statusCode === 500 ||
            statusCode === DisconnectReason.badSession;
          sock = null;

          if (loggedOut || badOrIncompatibleSession) {
            clearAuthDirectory();
            cachedBaileysVersion = null;
          }

          if (loggedOut) {
            gatewayState = {
              status: 'DISCONNECTED',
              connected: false,
              qrDataUrl: null,
              phoneNumber: null,
              name: null,
              lastUpdatedAt: new Date().toISOString()
            };
          } else {
            gatewayState.status = 'CONNECTING';
            gatewayState.connected = false;
            gatewayState.qrDataUrl = null;
            gatewayState.lastUpdatedAt = new Date().toISOString();
          }

          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          const delayMs = badOrIncompatibleSession || statusCode === 515 ? 250 : 1000;
          reconnectTimer = setTimeout(() => {
            connectToWhatsApp();
          }, delayMs);
        }
      } catch (eventErr) {
        console.error('Error handling connection.update:', eventErr);
      }
    });
  } catch (err) {
    console.error('Error initializing WhatsApp socket:', err);
    gatewayState.status = 'DISCONNECTED';
    gatewayState.connected = false;
  } finally {
    isInitializing = false;
  }
}

app.get('/api/whatsapp/status', async (_req, res) => {
  try {
    if (!gatewayState.connected && !gatewayState.qrDataUrl) {
      connectToWhatsApp();
      await waitForQrOrConnection(9000);
    }
    res.json({
      ...gatewayState,
      botEnabled: botConfig.botEnabled,
      autoReplyEnabled: botConfig.autoReplyEnabled
    });
  } catch (_err) {
    res.json(gatewayState);
  }
});

app.get('/api/whatsapp/bot-config', (_req, res) => {
  res.json({
    ok: true,
    botEnabled: botConfig.botEnabled,
    autoReplyEnabled: botConfig.autoReplyEnabled,
    hasGeminiApiKey: Boolean(botConfig.geminiApiKey && botConfig.geminiApiKey.trim().length > 0),
    geminiApiKeyMasked:
      botConfig.geminiApiKey && botConfig.geminiApiKey.length > 8
        ? `${botConfig.geminiApiKey.slice(0, 4)}••••${botConfig.geminiApiKey.slice(-4)}`
        : '',
    backendApiUrl: botConfig.backendApiUrl,
    fruitsCount: contextStore.fruits.length,
    clientsCount: contextStore.clients.length,
    ordersHistoryCount: contextStore.orders.length,
    incomingOrdersCount: incomingOrders.length,
    lastSyncedAt: botConfig.lastSyncedAt
  });
});

app.post('/api/whatsapp/bot-config', (req, res) => {
  try {
    const body = req.body || {};
    if (typeof body.botEnabled === 'boolean') {
      botConfig.botEnabled = body.botEnabled;
    }
    if (typeof body.autoReplyEnabled === 'boolean') {
      botConfig.autoReplyEnabled = body.autoReplyEnabled;
    }
    if (typeof body.geminiApiKey === 'string') {
      botConfig.geminiApiKey = body.geminiApiKey.trim();
    }
    if (typeof body.backendApiUrl === 'string' && body.backendApiUrl.trim().length > 0) {
      botConfig.backendApiUrl = body.backendApiUrl.trim();
    }
    saveBotConfigToDisk();
    return res.json({
      ok: true,
      botEnabled: botConfig.botEnabled,
      autoReplyEnabled: botConfig.autoReplyEnabled,
      hasGeminiApiKey: Boolean(botConfig.geminiApiKey && botConfig.geminiApiKey.trim().length > 0),
      geminiApiKeyMasked:
        botConfig.geminiApiKey && botConfig.geminiApiKey.length > 8
          ? `${botConfig.geminiApiKey.slice(0, 4)}••••${botConfig.geminiApiKey.slice(-4)}`
          : '',
      backendApiUrl: botConfig.backendApiUrl,
      fruitsCount: contextStore.fruits.length,
      clientsCount: contextStore.clients.length,
      ordersHistoryCount: contextStore.orders.length,
      incomingOrdersCount: incomingOrders.length,
      lastSyncedAt: botConfig.lastSyncedAt
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/whatsapp/sync-context', (req, res) => {
  try {
    const { fruits, clients, orders } = req.body || {};
    if (Array.isArray(fruits) && fruits.length > 0) {
      contextStore.fruits = fruits;
    }
    if (Array.isArray(clients)) {
      contextStore.clients = clients;
    }
    if (Array.isArray(orders)) {
      contextStore.orders = orders;
    }
    botConfig.lastSyncedAt = new Date().toISOString();
    saveBotConfigToDisk();
    return res.json({
      ok: true,
      fruitsCount: contextStore.fruits.length,
      clientsCount: contextStore.clients.length,
      ordersCount: contextStore.orders.length,
      lastSyncedAt: botConfig.lastSyncedAt
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.get('/api/whatsapp/incoming-orders', (_req, res) => {
  res.json({
    ok: true,
    orders: incomingOrders
  });
});

app.post('/api/whatsapp/simulate-incoming', async (req, res) => {
  try {
    const { phone, pushName, message, audioBase64, mimeType, autoConfirm } = req.body || {};
    if (!phone || (!message && !audioBase64)) {
      return res.status(400).json({
        ok: false,
        error: 'Se requieren los campos phone y message (o audioBase64) para simular un pedido.'
      });
    }
    const result = await processCustomerOrderInteraction({
      rawPhone: phone,
      pushName: pushName || '',
      text: message || '',
      audioBase64: audioBase64 || null,
      mimeType: mimeType || 'audio/ogg',
      autoConfirm: Boolean(autoConfirm)
    });
    return res.json({
      ok: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos phone y message.'
      });
    }

    if (!sock || !gatewayState.connected) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp aún no está vinculado. Escanea el código QR primero.'
      });
    }

    const jid = formatPhoneToJid(phone);
    if (!jid) {
      return res.status(400).json({
        success: false,
        error: 'Número de teléfono inválido.'
      });
    }

    const sent = await sock.sendMessage(jid, { text: String(message) });
    return res.json({
      success: true,
      to: jid,
      messageId: sent && sent.key ? sent.key.id : null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    return res.status(500).json({
      success: false,
      error: err && err.message ? err.message : 'Error enviando mensaje de WhatsApp.'
    });
  }
});

app.post('/api/whatsapp/logout', async (_req, res) => {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch (logoutErr) {
        void logoutErr;
      }
    }
    destroyCurrentSocket();
    clearAuthDirectory();
    gatewayState = {
      status: 'CONNECTING',
      connected: false,
      qrDataUrl: null,
      phoneNumber: null,
      name: null,
      lastUpdatedAt: new Date().toISOString()
    };
    await connectToWhatsApp(true);
    await waitForQrOrConnection(10000);
    return res.json({ success: true, ...gatewayState });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/api/whatsapp/reconnect', async (_req, res) => {
  try {
    if (!gatewayState.connected) {
      destroyCurrentSocket();
      clearAuthDirectory();
      gatewayState = {
        status: 'CONNECTING',
        connected: false,
        qrDataUrl: null,
        phoneNumber: null,
        name: null,
        lastUpdatedAt: new Date().toISOString()
      };
      await connectToWhatsApp(true);
      await waitForQrOrConnection(12000);
    }
    return res.json({ success: true, ...gatewayState });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  }
});

process.on('uncaughtException', (err) => {
  console.error('[WhatsAppQrGateway] Uncaught exception:', err);
  if (err && err.code === 'EADDRINUSE') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[WhatsAppQrGateway] Unhandled rejection:', reason);
});

/**
 * Starts the WhatsAppQrGateway server or runs the build-time smoke test when --smoke-test is passed.
 */
async function bootstrapGateway() {
  if (process.argv.includes('--smoke-test')) {
    await ensureBaileysLoaded();
    const sampleQr = await QRCode.toDataURL('smoke-test-qr', { width: 280, margin: 1 });
    if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function' || !sampleQr.startsWith('data:image/png;base64,')) {
      console.error('[WhatsAppQrGateway] Smoke test failed: invalid Baileys or QRCode exports');
      process.exit(1);
    }
    console.log('[WhatsAppQrGateway] Smoke test passed: Baileys + QRCode + Express verified.');
    process.exit(0);
  }

  loadPersistedData();
  refreshCatalogFromBackend();
  resolveBaileysVersion();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WhatsAppQrGateway] Listening on 0.0.0.0:${PORT} (/api/whatsapp)`);
    connectToWhatsApp();
  });

  server.on('error', (err) => {
    console.error('[WhatsAppQrGateway] HTTP server error:', err);
    process.exit(1);
  });
}

bootstrapGateway();
