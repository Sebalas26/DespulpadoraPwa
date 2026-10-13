export type VoiceOrderStatus = 'Pending' | 'Processing' | 'Processed' | 'Cancelled';

export interface VoiceOrderItemDto {
  fruitName: string;
  grammage: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

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
}

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
