/**
 * Lifecycle status of a WhatsApp voice order message.
 */
export type VoiceOrderStatus = 'Pending' | 'Processing' | 'Processed' | 'Cancelled';

/**
 * Line item extracted from a voice order message.
 */
export interface VoiceOrderItemDto {
  fruitName: string;
  grammage: 140 | 250 | 500 | 1000;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Incoming WhatsApp voice order message metadata and transcription preview.
 */
export interface VoiceOrderMessageDto {
  id: string;
  whatsAppMessageId: string;
  senderPhone: string;
  customerName: string;
  mediaId: string;
  audioUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  status: VoiceOrderStatus;
  receivedAt: string;
  processedAt?: string;
  createdOrderId?: number;
  processedByOperator?: string;
  notes?: string;
  transcriptPreview?: string;
  extractedItems?: VoiceOrderItemDto[];
}

/**
 * Payload for confirming a voice order and sending the WhatsApp confirmation message.
 */
export interface ConfirmVoiceOrderPayload {
  messageId: string;
  orderId?: number;
  customerPhone: string;
  customerName: string;
  items: VoiceOrderItemDto[];
  totalAmount: number;
  deliveryAddress: string;
  estimatedDeliveryTime?: string;
  customNote?: string;
}
