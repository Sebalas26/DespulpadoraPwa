import { Injectable } from '@angular/core';

/**
 * Resolved geographic coordinate and address metadata.
 */
export interface GeocodedLocation {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  zone: string;
  locality: string;
  source: 'coords' | 'arcgis' | 'photon' | 'nominatim' | 'bogota-grid';
  confidence: number;
}

/**
 * Normalized structure of a Colombian road address.
 */
export interface ParsedColombianAddress {
  original: string;
  cleaned: string;
  normalizedFull: string;
  intersectionQuery: string | null;
  municipality: string;
  mainRoadType: 'Calle' | 'Carrera' | 'Diagonal' | 'Transversal' | 'Avenida' | null;
  mainRoadNum: number | null;
  mainRoadIsSur: boolean;
  crossRoadNum: number | null;
  crossRoadIsEste: boolean;
  plaqueMeters: number | null;
}

interface ArcGisCandidate {
  address?: string;
  score?: number;
  location?: { x?: number; y?: number };
  attributes?: {
    Match_addr?: string;
    Addr_type?: string;
    StAddr?: string;
    City?: string;
    Subregion?: string;
  };
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    osm_id?: string | number;
    street?: string;
    housenumber?: string;
    name?: string;
    city?: string;
    county?: string;
  };
}

interface NominatimItem {
  place_id?: string | number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
}

const CUNDINAMARCA_MUNICIPALITIES: Record<string, { name: string; lat: number; lng: number }> = {
  chia: { name: 'Chía', lat: 4.8616, lng: -74.0587 },
  cota: { name: 'Cota', lat: 4.8094, lng: -74.1019 },
  cajica: { name: 'Cajicá', lat: 4.9186, lng: -74.0278 },
  zipaquira: { name: 'Zipaquirá', lat: 5.0221, lng: -74.0044 },
  mosquera: { name: 'Mosquera', lat: 4.7059, lng: -74.2302 },
  funza: { name: 'Funza', lat: 4.7164, lng: -74.212 },
  madrid: { name: 'Madrid', lat: 4.7324, lng: -74.2642 },
  soacha: { name: 'Soacha', lat: 4.5794, lng: -74.2168 },
  calera: { name: 'La Calera', lat: 4.7208, lng: -73.9689 },
  sopo: { name: 'Sopó', lat: 4.9081, lng: -73.9397 },
  tocancipa: { name: 'Tocancipá', lat: 4.9658, lng: -73.9136 },
  tabio: { name: 'Tabio', lat: 4.9172, lng: -74.0983 },
  tenjo: { name: 'Tenjo', lat: 4.8722, lng: -74.1444 },
  siberia: { name: 'Cota (Siberia)', lat: 4.758, lng: -74.146 }
};

/**
 * Multi-provider Colombian address geocoding and urban grid interpolation service.
 */
@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly cache = new Map<string, GeocodedLocation[]>();

  /**
   * Searches and geocodes a Colombian address, GPS coordinate pair, or map URL.
   */
  async searchAddress(rawQuery: string): Promise<GeocodedLocation[]> {
    try {
      const trimmed = (rawQuery || '').trim();
      if (trimmed.length < 3) {
        return [];
      }

      const cacheKey = trimmed.toLowerCase();
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const directCoords = this.extractCoordinatesFromInput(trimmed);
      if (directCoords) {
        const zone = this.detectBogotaZone(directCoords.lat, directCoords.lng);
        const revLabel = await this.reverseGeocodeLabel(directCoords.lat, directCoords.lng);
        const item: GeocodedLocation = {
          id: `coords_${directCoords.lat.toFixed(5)}_${directCoords.lng.toFixed(5)}`,
          name:
            revLabel ||
            `Coordenadas GPS (${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)})`,
          label: revLabel
            ? `${revLabel} [${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)}]`
            : `Punto exacto GPS: ${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)}`,
          lat: directCoords.lat,
          lng: directCoords.lng,
          zone,
          locality: zone.includes('Cundinamarca') ? zone : 'Bogotá D.C.',
          source: 'coords',
          confidence: 1.0
        };
        this.cache.set(cacheKey, [item]);
        return [item];
      }

      const parsed = this.parseColombianAddress(trimmed);
      const results: GeocodedLocation[] = [];

      const [arcgisResults, photonResults] = await Promise.all([
        this.queryArcGisColombia(parsed),
        this.queryPhotonKomoot(parsed)
      ]);

      this.mergeUniqueResults(results, arcgisResults);
      this.mergeUniqueResults(results, photonResults);

      if (results.length < 2) {
        const nominatimResults = await this.queryNominatimColombia(parsed);
        this.mergeUniqueResults(results, nominatimResults);
      }

      const gridFallback = this.estimateBogotaGridCoordinates(parsed);
      if (gridFallback) {
        const hasPreciseMatch = results.some(r => r.confidence >= 0.85);
        if (!hasPreciseMatch || results.length === 0) {
          this.mergeUniqueResults(results, [gridFallback]);
        }
      }

      results.sort((a, b) => b.confidence - a.confidence);
      const finalResults = results.slice(0, 7);

      if (finalResults.length > 0) {
        this.cache.set(cacheKey, finalResults);
      }

      return finalResults;
    } catch {
      return [];
    }
  }

  /**
   * Geocodes an address query and returns the highest-confidence location match.
   */
  async geocodeBestMatch(rawQuery: string): Promise<GeocodedLocation | null> {
    try {
      const list = await this.searchAddress(rawQuery);
      return list.length > 0 ? list[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Extracts direct latitude/longitude coordinates from raw coordinate text or Google Maps/Waze URLs.
   */
  extractCoordinatesFromInput(input: string): { lat: number; lng: number } | null {
    try {
      const bangMatch = input.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (bangMatch) {
        const lat = parseFloat(bangMatch[1]);
        const lng = parseFloat(bangMatch[2]);
        if (this.isValidColombiaCoord(lat, lng)) {
          return { lat, lng };
        }
      }

      const urlCoordMatch = input.match(
        /(?:@|q=|ll=|destination=)(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{2}\.\d{3,})/i
      );
      if (urlCoordMatch) {
        const lat = parseFloat(urlCoordMatch[1]);
        const lng = parseFloat(urlCoordMatch[2]);
        if (this.isValidColombiaCoord(lat, lng)) {
          return { lat, lng };
        }
      }

      const directMatch = input.match(
        /^\s*(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{2}\.\d{3,})\s*$/
      );
      if (directMatch) {
        const a = parseFloat(directMatch[1]);
        const b = parseFloat(directMatch[2]);
        if (this.isValidColombiaCoord(a, b)) {
          return { lat: a, lng: b };
        }
        if (this.isValidColombiaCoord(b, a)) {
          return { lat: b, lng: a };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validates whether the given coordinates lie within Colombia's geographic bounding box.
   */
  private isValidColombiaCoord(lat: number, lng: number): boolean {
    try {
      return lat >= -4.5 && lat <= 13.5 && lng >= -82.0 && lng <= -66.5;
    } catch {
      return false;
    }
  }

  /**
   * Parses and normalizes a Colombian address into road components and intersection queries.
   */
  parseColombianAddress(raw: string): ParsedColombianAddress {
    try {
      const text = raw.trim();
      const lower = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      let municipality = 'Bogotá';
      for (const [key, muni] of Object.entries(CUNDINAMARCA_MUNICIPALITIES)) {
        const regex = new RegExp(`\\b${key}\\b`, 'i');
        if (regex.test(lower)) {
          municipality = muni.name;
          break;
        }
      }

      let cleaned = text
        .replace(
          /\b(apto|apartamento|interior|int|torre|bloque|bodega|bod|local|loc|oficina|of|piso|casa|conjunto|edificio|ed)\b\.?\s*[a-z0-9\-]+/gi,
          ' '
        )
        .replace(/\s+/g, ' ')
        .trim();

      cleaned = cleaned
        .replace(/\b(av\.?\s*cra\.?|av\.?\s*carrera|ak)\b\.?/gi, 'Avenida Carrera')
        .replace(/\b(av\.?\s*cll?\.?|av\.?\s*calle|ac)\b\.?/gi, 'Avenida Calle')
        .replace(/\b(cll|cl|calle)\b\.?/gi, 'Calle')
        .replace(/\b(cra|cr|kr|kra|carrera|k)\b\.?/gi, 'Carrera')
        .replace(/\b(dg|diag|diagonal)\b\.?/gi, 'Diagonal')
        .replace(/\b(tv|tr|transv|trans|transversal)\b\.?/gi, 'Transversal')
        .replace(/\b(av|avda|avenida)\b\.?/gi, 'Avenida')
        .replace(/\b(autop|aut|autopista)\b\.?/gi, 'Autopista');

      cleaned = cleaned
        .replace(/\b(no|nro|num|n°|numero|número)\.?\s*/gi, '# ')
        .replace(/#\s*#+/g, '#')
        .replace(/\s+/g, ' ')
        .trim();

      const colRegex =
        /\b(Avenida\s+Calle|Avenida\s+Carrera|Calle|Carrera|Diagonal|Transversal)\s+(\d{1,3})([a-zA-Z]{0,2})(?:\s+Bis)?(\s+Sur)?\s*(?:#|con|\s)\s*(\d{1,3})([a-zA-Z]{0,2})(?:\s+Bis)?(\s+Este|\s+Sur)?(?:\s*[-–]\s*(\d{1,3}))?/i;
      const match = cleaned.match(colRegex);

      let mainRoadType: ParsedColombianAddress['mainRoadType'] = null;
      let mainRoadNum: number | null = null;
      let mainRoadIsSur = false;
      let crossRoadNum: number | null = null;
      let crossRoadIsEste = false;
      let plaqueMeters: number | null = null;
      let intersectionQuery: string | null = null;

      if (match) {
        const rawType = match[1].toLowerCase();
        if (rawType.includes('calle')) {
          mainRoadType = 'Calle';
        } else if (rawType.includes('carrera')) {
          mainRoadType = 'Carrera';
        } else if (rawType.includes('diagonal')) {
          mainRoadType = 'Diagonal';
        } else if (rawType.includes('transversal')) {
          mainRoadType = 'Transversal';
        }

        mainRoadNum = parseInt(match[2], 10);
        const mainLetter = (match[3] || '').toUpperCase();
        mainRoadIsSur = Boolean(match[4] || /\bsur\b/i.test(cleaned));
        crossRoadNum = parseInt(match[5], 10);
        const crossLetter = (match[6] || '').toUpperCase();
        crossRoadIsEste = Boolean(match[7] && /este/i.test(match[7]));
        plaqueMeters = match[8] ? parseInt(match[8], 10) : null;

        const complementRoad =
          mainRoadType === 'Calle' || mainRoadType === 'Diagonal' ? 'Carrera' : 'Calle';

        const surSuffix = mainRoadIsSur ? ' Sur' : '';
        const plaquePart = plaqueMeters !== null ? `-${plaqueMeters}` : '';

        cleaned = `${mainRoadType} ${mainRoadNum}${mainLetter}${surSuffix} # ${crossRoadNum}${crossLetter}${plaquePart}`;
        intersectionQuery = `${mainRoadType} ${mainRoadNum}${mainLetter}${surSuffix} & ${complementRoad} ${crossRoadNum}${crossLetter}, ${municipality}, Colombia`;
      }

      const hasCity = /bogot|chia|chía|cota|cajic|zipaquir|mosquera|funza|madrid|soacha|calera|sop/i.test(
        cleaned
      );
      const normalizedFull = hasCity
        ? `${cleaned}, Colombia`
        : `${cleaned}, ${municipality}, Colombia`;

      return {
        original: raw,
        cleaned,
        normalizedFull,
        intersectionQuery,
        municipality,
        mainRoadType,
        mainRoadNum,
        mainRoadIsSur,
        crossRoadNum,
        crossRoadIsEste,
        plaqueMeters
      };
    } catch {
      return {
        original: raw,
        cleaned: raw,
        normalizedFull: raw,
        intersectionQuery: null,
        municipality: 'Bogotá',
        mainRoadType: null,
        mainRoadNum: null,
        mainRoadIsSur: false,
        crossRoadNum: null,
        crossRoadIsEste: false,
        plaqueMeters: null
      };
    }
  }

  /**
   * Queries the Esri ArcGIS World Geocoder for Colombian address candidates.
   */
  private async queryArcGisColombia(parsed: ParsedColombianAddress): Promise<GeocodedLocation[]> {
    try {
      const encoded = encodeURIComponent(parsed.normalizedFull);
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encoded}&countryCode=COL&location=-74.0817,4.6097&distance=65000&maxLocations=6&outFields=Match_addr,Addr_type,StAddr,City,Subregion&f=json`;

      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as { candidates?: ArcGisCandidate[] };
      if (!data.candidates || !Array.isArray(data.candidates)) {
        return [];
      }

      const locations: GeocodedLocation[] = [];
      for (const cand of data.candidates) {
        const lat = cand.location?.y;
        const lng = cand.location?.x;
        const score = Number(cand.score) || 0;
        if (typeof lat !== 'number' || typeof lng !== 'number' || score < 70) {
          continue;
        }

        if (lat < 4.2 || lat > 5.3 || lng < -74.6 || lng > -73.6) {
          continue;
        }

        const addrType = cand.attributes?.Addr_type || '';
        const isGenericLocality = addrType === 'Locality' || addrType === 'AdministrativeArea';
        if (isGenericLocality && parsed.mainRoadNum !== null) {
          continue;
        }

        const label = cand.address || cand.attributes?.Match_addr || parsed.cleaned;
        const zone = this.detectBogotaZone(lat, lng);

        locations.push({
          id: `arcgis_${lat.toFixed(5)}_${lng.toFixed(5)}`,
          name: cand.attributes?.StAddr || label.split(',')[0] || parsed.cleaned,
          label,
          lat,
          lng,
          zone,
          locality: cand.attributes?.City || parsed.municipality,
          source: 'arcgis',
          confidence: Math.min(
            0.99,
            (score / 100) * (addrType === 'PointAddress' || addrType === 'StreetAddress' ? 1.0 : 0.9)
          )
        });
      }

      return locations;
    } catch {
      return [];
    }
  }

  /**
   * Queries Photon Komoot OpenStreetMap autocomplete service.
   */
  private async queryPhotonKomoot(parsed: ParsedColombianAddress): Promise<GeocodedLocation[]> {
    try {
      const encoded = encodeURIComponent(parsed.normalizedFull);
      const url = `https://photon.komoot.io/api/?q=${encoded}&lat=4.6850&lon=-74.0950&limit=5`;

      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as { features?: PhotonFeature[] };
      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      const locations: GeocodedLocation[] = [];
      for (const feat of data.features) {
        const coords = feat.geometry?.coordinates;
        if (!coords || coords.length < 2) {
          continue;
        }
        const lng = coords[0];
        const lat = coords[1];
        if (lat < 4.2 || lat > 5.3 || lng < -74.6 || lng > -73.6) {
          continue;
        }

        const props = feat.properties || {};
        const zone = this.detectBogotaZone(lat, lng);
        const streetPart = [props.street, props.housenumber].filter(Boolean).join(' ');
        const displayName = props.name || streetPart || parsed.cleaned;
        const displayCity = props.city || props.county || parsed.municipality;

        locations.push({
          id: props.osm_id
            ? `photon_${props.osm_id}`
            : `photon_${lat.toFixed(5)}_${lng.toFixed(5)}`,
          name: displayName,
          label: `${displayName}, ${displayCity}`,
          lat,
          lng,
          zone,
          locality: displayCity,
          source: 'photon',
          confidence: 0.86
        });
      }

      return locations;
    } catch {
      return [];
    }
  }

  /**
   * Queries OpenStreetMap Nominatim for address and road intersection candidates.
   */
  private async queryNominatimColombia(parsed: ParsedColombianAddress): Promise<GeocodedLocation[]> {
    try {
      const queriesToTry: string[] = [parsed.normalizedFull];

      if (parsed.mainRoadType && parsed.mainRoadNum !== null) {
        const sur = parsed.mainRoadIsSur ? ' Sur' : '';
        queriesToTry.push(
          `${parsed.mainRoadType} ${parsed.mainRoadNum}${sur}, ${parsed.municipality}, Colombia`
        );
      }

      const locations: GeocodedLocation[] = [];

      for (const q of queriesToTry) {
        try {
          const encoded = encodeURIComponent(q);
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=co&viewbox=-74.45,5.05,-73.90,4.45&bounded=0&limit=4`;
          const res = await fetch(url, {
            headers: { 'Accept-Language': 'es' },
            signal: AbortSignal.timeout(3500)
          });
          if (!res.ok) {
            continue;
          }

          const data = (await res.json()) as NominatimItem[];
          if (!Array.isArray(data)) {
            continue;
          }

          for (const item of data) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lng) || lat < 4.2 || lat > 5.3 || lng < -74.6 || lng > -73.6) {
              continue;
            }

            const zone = this.detectBogotaZone(lat, lng);
            locations.push({
              id: item.place_id
                ? `nom_${item.place_id}`
                : `nom_${lat.toFixed(5)}_${lng.toFixed(5)}`,
              name: item.name || item.display_name.split(',')[0],
              label: item.display_name,
              lat,
              lng,
              zone,
              locality: parsed.municipality,
              source: 'nominatim',
              confidence: 0.8
            });
          }

          if (locations.length > 0) {
            break;
          }
        } catch {
          continue;
        }
      }

      return locations;
    } catch {
      return [];
    }
  }

  /**
   * Estimates geographic coordinates using Bogotá and Sabana orthogonal street grid interpolation.
   */
  private estimateBogotaGridCoordinates(parsed: ParsedColombianAddress): GeocodedLocation | null {
    try {
      const muniEntry = Object.values(CUNDINAMARCA_MUNICIPALITIES).find(
        m => m.name.toLowerCase() === parsed.municipality.toLowerCase()
      );

      if (!parsed.mainRoadType || parsed.mainRoadNum === null || parsed.crossRoadNum === null) {
        if (muniEntry) {
          return {
            id: `muni_${muniEntry.name}`,
            name: `${parsed.cleaned} (${muniEntry.name})`,
            label: `${parsed.cleaned}, ${muniEntry.name}, Cundinamarca`,
            lat: muniEntry.lat,
            lng: muniEntry.lng,
            zone: `${muniEntry.name} (Cundinamarca)`,
            locality: muniEntry.name,
            source: 'bogota-grid',
            confidence: 0.78
          };
        }
        return null;
      }

      if (muniEntry) {
        const offsetLat = ((parsed.mainRoadNum % 30) - 15) * 0.00065;
        const offsetLng = ((parsed.crossRoadNum % 30) - 15) * -0.00065;
        const lat = muniEntry.lat + offsetLat;
        const lng = muniEntry.lng + offsetLng;
        return {
          id: `grid_${lat.toFixed(5)}_${lng.toFixed(5)}`,
          name: parsed.cleaned,
          label: `${parsed.cleaned}, ${muniEntry.name}, Cundinamarca`,
          lat,
          lng,
          zone: `${muniEntry.name} (Cundinamarca)`,
          locality: muniEntry.name,
          source: 'bogota-grid',
          confidence: 0.84
        };
      }

      const isCalleMain = parsed.mainRoadType === 'Calle' || parsed.mainRoadType === 'Diagonal';
      const calleNum = isCalleMain ? parsed.mainRoadNum : parsed.crossRoadNum;
      const carreraNum = isCalleMain ? parsed.crossRoadNum : parsed.mainRoadNum;
      const isSur = parsed.mainRoadIsSur;

      let lat: number;
      if (isSur) {
        lat = 4.591 - calleNum * 0.00088;
      } else if (calleNum <= 26) {
        lat = 4.591 + calleNum * 0.00142;
      } else if (calleNum <= 100) {
        lat = 4.628 + (calleNum - 26) * 0.00079;
      } else {
        lat = 4.6865 + (calleNum - 100) * 0.00096;
      }

      const northShift = Math.max(0, Math.min(1, (lat - 4.6) / 0.15)) * 0.026;
      const baseEastLng = -74.064 + northShift;
      let lng = baseEastLng - carreraNum * 0.00086;

      if (parsed.plaqueMeters !== null && parsed.plaqueMeters > 0 && parsed.plaqueMeters <= 120) {
        const metersOffsetDeg = (parsed.plaqueMeters / 100) * 0.00085;
        if (isCalleMain) {
          lng -= metersOffsetDeg;
        } else {
          lat += metersOffsetDeg;
        }
      }

      lat = Math.max(4.48, Math.min(4.835, lat));
      lng = Math.max(-74.225, Math.min(-74.015, lng));

      const zone = this.detectBogotaZone(lat, lng);

      return {
        id: `bogota_grid_${lat.toFixed(5)}_${lng.toFixed(5)}`,
        name: parsed.cleaned,
        label: `${parsed.cleaned}, ${zone}, Bogotá D.C.`,
        lat,
        lng,
        zone,
        locality: 'Bogotá D.C.',
        source: 'bogota-grid',
        confidence: 0.88
      };
    } catch {
      return null;
    }
  }

  /**
   * Performs reverse geocoding to obtain a human-readable street label for coordinates.
   */
  async reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng.toFixed(6)},${lat.toFixed(6)}&langCode=es&f=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = (await res.json()) as {
          address?: {
            Match_addr?: string;
            Address?: string;
            Neighborhood?: string;
            City?: string;
          };
        };
        if (data.address?.Match_addr || data.address?.Address) {
          return data.address.Address
            ? `${data.address.Address}, ${data.address.Neighborhood || data.address.City || 'Bogotá'}`
            : data.address.Match_addr || null;
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Resolves the urban zone name in Bogotá or Cundinamarca from latitude and longitude.
   */
  detectBogotaZone(lat: number, lng: number): string {
    try {
      if (lat > 4.82) return 'Chía (Cundinamarca Norte)';
      if (lat > 4.78 && lng < -74.08) return 'Cota (Cundinamarca)';
      if (lat > 4.7 && lng > -74.05) return 'Usaquén / Santa Bárbara';
      if (lat > 4.71 && lng < -74.07) return 'Suba Oriental';
      if (lat > 4.66 && lng > -74.06) return 'Chicó / Parque 93';
      if (lat > 4.63 && lng > -74.07) return 'Chapinero / Teusaquillo';
      if (lat > 4.63 && lng < -74.09) return 'Salitre / Corferias';
      if (lat < 4.62 && lng < -74.13) return 'Kennedy / Bosa';
      if (lat < 4.61 && lng > -74.09) return 'Centro Histórico / Candelaria';
      if (lng < -74.13) return 'Fontibón / Mosquera (Cundinamarca)';
      return 'Bogotá D.C.';
    } catch {
      return 'Bogotá D.C.';
    }
  }

  /**
   * Merges incoming geocoded locations into `target` while deduplicating nearby coordinates.
   */
  private mergeUniqueResults(target: GeocodedLocation[], incoming: GeocodedLocation[]): void {
    try {
      for (const item of incoming) {
        const isDuplicate = target.some(
          existing =>
            Math.abs(existing.lat - item.lat) < 0.0008 &&
            Math.abs(existing.lng - item.lng) < 0.0008
        );
        if (!isDuplicate) {
          target.push(item);
        }
      }
    } catch {
      return;
    }
  }
}
