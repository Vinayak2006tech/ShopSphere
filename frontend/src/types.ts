export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  featured?: boolean;
  editorialTag?: string;
  attributes?: Record<string, string>;
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

export interface OrderItem {
  id?: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  user_id: string;
  customer_email: string;
  customer_name: string;
  total_amount: string | number;
  status: 'PENDING' | 'PAID' | 'PAYMENT_FAILED' | 'CANCELLED' | 'SHIPPED' | 'COMPLETED';
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface MicroserviceHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  details?: any;
  error?: string;
  statusCode?: number;
}

export interface SystemHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  gateway: string;
  timestamp: string;
  uptime: number;
  services: {
    authService: MicroserviceHealth;
    productService: MicroserviceHealth;
    orderService: MicroserviceHealth;
    paymentService: MicroserviceHealth;
    notificationService: MicroserviceHealth;
  };
}

export interface NotificationLog {
  id: string;
  recipientEmail: string;
  subject: string;
  eventType: string;
  orderId?: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  previewUrl?: string;
  htmlContent: string;
  createdAt: string;
}
