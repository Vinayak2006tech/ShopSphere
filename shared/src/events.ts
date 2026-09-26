// Event names & exchange constants
export const EVENTS_EXCHANGE = 'ecommerce_events';

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_FAILED: 'inventory.failed',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  STOCK_UPDATED: 'stock.updated',
  REVIEW_CREATED: 'review.created',
} as const;

export type RoutingKey = typeof ROUTING_KEYS[keyof typeof ROUTING_KEYS];

// Shared Order Interfaces
export interface OrderItemPayload {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'PAYMENT_FAILED' | 'CANCELLED' | 'SHIPPED' | 'COMPLETED';

export interface OrderCreatedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.ORDER_CREATED;
  payload: {
    orderId: string;
    userId: string;
    customerEmail: string;
    customerName: string;
    items: OrderItemPayload[];
    totalAmount: number;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

// Payment Event Interfaces
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface PaymentCompletedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.PAYMENT_COMPLETED;
  payload: {
    paymentId: string;
    orderId: string;
    userId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    transactionId: string;
  };
}

export interface PaymentFailedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.PAYMENT_FAILED;
  payload: {
    paymentId?: string;
    orderId: string;
    userId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    reason: string;
    errorCode?: string;
    items?: OrderItemPayload[];
  };
}

// Inventory Reservation Saga Event Interfaces
export interface InventoryReservedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.INVENTORY_RESERVED;
  payload: {
    orderId: string;
    userId: string;
    customerEmail: string;
    customerName: string;
    items: OrderItemPayload[];
    totalAmount: number;
  };
}

export interface InventoryFailedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.INVENTORY_FAILED;
  payload: {
    orderId: string;
    userId: string;
    customerEmail: string;
    reason: string;
    failedItems: { productId: string; requestedQuantity: number; availableStock: number }[];
  };
}

// Stock Event Interfaces
export interface StockUpdatedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.STOCK_UPDATED;
  payload: {
    productId: string;
    previousStock: number;
    currentStock: number;
    changeReason: 'ORDER_PLACED' | 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'ORDER_CANCELLED';
    orderId?: string;
  };
}

export interface ReviewCreatedEvent {
  eventId: string;
  timestamp: string;
  eventType: typeof ROUTING_KEYS.REVIEW_CREATED;
  payload: {
    reviewId: string;
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
  };
}

export type DomainEvent =
  | OrderCreatedEvent
  | InventoryReservedEvent
  | InventoryFailedEvent
  | PaymentCompletedEvent
  | PaymentFailedEvent
  | StockUpdatedEvent
  | ReviewCreatedEvent;

// Common Auth & JWT Types
export interface JWTPayload {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  name?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
