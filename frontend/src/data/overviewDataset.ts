export interface CatalogRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
  origin: string;
  material: string;
  leadTime: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  editorialTag?: string;
}

export interface EventTopicRecord {
  topic: string;
  producer: string;
  consumers: string[];
  exchange: string;
  exchangeType: string;
  routingKey: string;
  samplePayload: Record<string, any>;
  sla: string;
  purpose: string;
}

export interface DatastoreRecord {
  service: string;
  engine: string;
  storageTarget: string;
  port: string;
  paradigm: string;
  primaryTablesOrCollections: string[];
  consistency: string;
}

export const CATALOG_RECORDS: CatalogRecord[] = [
  {
    id: 'prod_1',
    sku: 'SPH-CRM-001',
    name: 'Terracotta Hand-Thrown Pourer',
    category: 'Ceramics & Tableware',
    price: 68.0,
    stock: 24,
    rating: 4.9,
    origin: 'Alentejo, Portugal',
    material: 'Local clay, lead-free glaze',
    leadTime: '1-2 business days',
    status: 'In Stock',
    editorialTag: 'Curator’s Choice',
  },
  {
    id: 'prod_2',
    sku: 'SPH-LTH-002',
    name: 'Natural Vachetta Leather Tote',
    category: 'Leather Goods',
    price: 245.0,
    stock: 12,
    rating: 5.0,
    origin: 'Florence, Italy',
    material: 'Full-grain Italian Vachetta',
    leadTime: '2-3 business days',
    status: 'In Stock',
    editorialTag: 'Timeless Heirloom',
  },
  {
    id: 'prod_3',
    sku: 'SPH-CRM-003',
    name: 'Matte Stoneware Bowl (Set of 2)',
    category: 'Ceramics & Tableware',
    price: 54.0,
    stock: 45,
    rating: 4.8,
    origin: 'Kyoto, Japan',
    material: 'High-fired stoneware',
    leadTime: '1-2 business days',
    status: 'In Stock',
  },
  {
    id: 'prod_4',
    sku: 'SPH-HOM-004',
    name: 'Solid Walnut Catch-All Desk Tray',
    category: 'Home & Living',
    price: 76.0,
    stock: 18,
    rating: 4.9,
    origin: 'Oregon, USA',
    material: 'FSC-Certified Black Walnut',
    leadTime: '1-3 business days',
    status: 'In Stock',
  },
  {
    id: 'prod_5',
    sku: 'SPH-STN-005',
    name: 'Japanese Brass Mechanical Pencil 0.5mm',
    category: 'Stationery & Study',
    price: 42.0,
    stock: 35,
    rating: 4.7,
    origin: 'Tokyo, Japan',
    material: 'Solid brass rod',
    leadTime: 'Same day',
    status: 'In Stock',
  },
  {
    id: 'prod_6',
    sku: 'SPH-HOM-006',
    name: 'Wild Honey & Cedar Beeswax Candle',
    category: 'Home & Living',
    price: 34.0,
    stock: 50,
    rating: 4.9,
    origin: 'Cotswolds, UK',
    material: '100% Pure cappings beeswax',
    leadTime: '1 business day',
    status: 'In Stock',
  },
  {
    id: 'prod_7',
    sku: 'SPH-HOM-007',
    name: 'Handwoven Belgian Linen Bed Throw',
    category: 'Home & Living',
    price: 180.0,
    stock: 14,
    rating: 4.9,
    origin: 'Ghent, Belgium',
    material: '100% Belgian Masters of Linen flax',
    leadTime: '2-4 business days',
    status: 'In Stock',
    editorialTag: 'Natural Fiber',
  },
  {
    id: 'prod_8',
    sku: 'SPH-COF-008',
    name: 'Pure Brass Pour-Over Coffee Stand',
    category: 'Coffee & Tea',
    price: 125.0,
    stock: 16,
    rating: 4.8,
    origin: 'Melbourne, Australia',
    material: 'Cast brass & silicone grommet',
    leadTime: '1-2 business days',
    status: 'In Stock',
  },
  {
    id: 'prod_9',
    sku: 'SPH-KIT-009',
    name: 'Smoked Oak & Cast Iron Mortar & Pestle',
    category: 'Kitchen & Culinary',
    price: 88.0,
    stock: 20,
    rating: 4.9,
    origin: 'Lyon, France',
    material: 'Rough-cast virgin iron & oak',
    leadTime: '2 business days',
    status: 'In Stock',
    editorialTag: 'Heritage Craft',
  },
  {
    id: 'prod_10',
    sku: 'SPH-CRM-010',
    name: 'Wabi-Sabi Stoneware Espresso Cup (Set of 4)',
    category: 'Ceramics & Tableware',
    price: 48.0,
    stock: 30,
    rating: 4.8,
    origin: 'Gifu Prefecture, Japan',
    material: 'Local iron-rich stoneware',
    leadTime: '1-2 business days',
    status: 'In Stock',
  },
  {
    id: 'prod_11',
    sku: 'SPH-LTH-011',
    name: 'Cordovan Leather Minimalist Bifold Wallet',
    category: 'Leather Goods',
    price: 135.0,
    stock: 15,
    rating: 5.0,
    origin: 'Chicago, USA',
    material: 'Genuine Horween Shell Cordovan',
    leadTime: '2-3 business days',
    status: 'In Stock',
    editorialTag: 'Artisan Benchmark',
  },
  {
    id: 'prod_12',
    sku: 'SPH-HOM-012',
    name: 'Sandalwood & Bergamot Botanical Diffuser',
    category: 'Home & Living',
    price: 52.0,
    stock: 40,
    rating: 4.9,
    origin: 'Grasse, France',
    material: 'Apothecary glass & natural reeds',
    leadTime: '1 business day',
    status: 'In Stock',
  },
  {
    id: 'prod_13',
    sku: 'SPH-STN-013',
    name: 'Handmade Japanese Washi Paper Notebook (A5)',
    category: 'Stationery & Study',
    price: 28.0,
    stock: 55,
    rating: 4.8,
    origin: 'Echizen, Japan',
    material: '90gsm Japanese Kozo washi',
    leadTime: 'Same day',
    status: 'In Stock',
  },
  {
    id: 'prod_14',
    sku: 'SPH-COF-014',
    name: 'Forged Copper Tea Kettle with Wood Handle',
    category: 'Coffee & Tea',
    price: 195.0,
    stock: 10,
    rating: 5.0,
    origin: 'Niigata, Japan',
    material: 'Hand-hammered 1.2mm pure copper',
    leadTime: '3-5 business days',
    status: 'Low Stock',
    editorialTag: 'Master Metalwork',
  },
  {
    id: 'prod_15',
    sku: 'SPH-APP-015',
    name: 'Raw Silk & Organic Cotton Fringe Scarf',
    category: 'Apparel & Textiles',
    price: 95.0,
    stock: 22,
    rating: 4.9,
    origin: 'Bengaluru, India',
    material: '55% Matka silk, 45% combed cotton',
    leadTime: '2 business days',
    status: 'In Stock',
    editorialTag: 'Plant Dyed',
  },
  {
    id: 'prod_16',
    sku: 'SPH-KIT-016',
    name: 'Nordic Beechwood Salt & Pepper Grinder Pair',
    category: 'Kitchen & Culinary',
    price: 72.0,
    stock: 28,
    rating: 4.7,
    origin: 'Aarhus, Denmark',
    material: 'FSC-Certified Danish Beechwood',
    leadTime: '1-2 business days',
    status: 'In Stock',
  },
];

export const EVENT_TOPIC_RECORDS: EventTopicRecord[] = [
  {
    topic: 'order.created',
    producer: 'Order Service (:5003)',
    consumers: ['Product Service (:5002)', 'Search Service (:5006)', 'Recommendation Service (:5007)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'order.created',
    sla: '< 15 ms',
    purpose: 'Notifies downstream consumers when an order is created with status PENDING',
    samplePayload: {
      orderId: 'ord_91823',
      userId: 'usr_7421',
      totalAmount: 245.0,
      items: [
        { productId: 'prod_2', quantity: 1, price: 245.0 }
      ],
      createdAt: '2026-10-05T18:00:00Z',
    },
  },
  {
    topic: 'inventory.reserved',
    producer: 'Product Service (:5002)',
    consumers: ['Payment Service (:5004)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'inventory.reserved',
    sla: '< 20 ms',
    purpose: 'Signals that MongoDB stock has been atomically decremented and payment can proceed',
    samplePayload: {
      orderId: 'ord_91823',
      status: 'RESERVED',
      reservedItems: [
        { productId: 'prod_2', count: 1, remainingStock: 11 }
      ],
    },
  },
  {
    topic: 'inventory.failed',
    producer: 'Product Service (:5002)',
    consumers: ['Order Service (:5003)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'inventory.failed',
    sla: '< 10 ms',
    purpose: 'Triggered when items exceed available stock; initiates order cancellation',
    samplePayload: {
      orderId: 'ord_91823',
      reason: 'INSUFFICIENT_STOCK',
      outOfStockItem: 'prod_14',
    },
  },
  {
    topic: 'payment.completed',
    producer: 'Payment Service (:5004)',
    consumers: ['Order Service (:5003)', 'Notification Service (:5005)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'payment.completed',
    sla: '< 25 ms',
    purpose: 'Confirms charge settlement; triggers Order PAID update & transactional customer email',
    samplePayload: {
      orderId: 'ord_91823',
      transactionId: 'txn_mock_stripe_8239',
      status: 'SUCCESS',
      amount: 245.0,
    },
  },
  {
    topic: 'payment.failed',
    producer: 'Payment Service (:5004)',
    consumers: ['Order Service (:5003)', 'Product Service (:5002)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'payment.failed',
    sla: '< 15 ms',
    purpose: 'Triggers Saga compensation: Product Service restores reserved stock back to MongoDB',
    samplePayload: {
      orderId: 'ord_91823',
      declineCode: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
      itemsToRestore: [
        { productId: 'prod_2', quantity: 1 }
      ],
    },
  },
  {
    topic: 'notification.dispatched',
    producer: 'Notification Service (:5005)',
    consumers: ['Audit & Observability'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'notification.dispatched',
    sla: '< 50 ms',
    purpose: 'Emitted once transactional HTML receipt is dispatched via SMTP mailer',
    samplePayload: {
      notificationId: 'notif_49182',
      orderId: 'ord_91823',
      recipient: 'customer@shopsphere.io',
      previewUrl: 'https://ethereal.email/message/XxZ9...',
    },
  },
  {
    topic: 'review.created',
    producer: 'Review Service (:5008)',
    consumers: ['Product Service (:5002)'],
    exchange: 'ecommerce_events',
    exchangeType: 'topic',
    routingKey: 'review.created',
    sla: '< 30 ms',
    purpose: 'Recalculates product aggregate star rating and purges Redis cache keys',
    samplePayload: {
      reviewId: 'rev_1048',
      productId: 'prod_2',
      rating: 5,
      newAverageRating: 5.0,
    },
  },
];

export const DATASTORE_RECORDS: DatastoreRecord[] = [
  {
    service: 'Auth Service (:5001)',
    engine: 'PostgreSQL 16',
    storageTarget: 'shopsphere_auth',
    port: '5432',
    paradigm: 'Relational ACID',
    primaryTablesOrCollections: ['users', 'refresh_tokens', 'audit_logs'],
    consistency: 'Strong Consistency (Serialized Transactions)',
  },
  {
    service: 'Order Service (:5003)',
    engine: 'PostgreSQL 16',
    storageTarget: 'shopsphere_order',
    port: '5432',
    paradigm: 'Relational ACID Ledger',
    primaryTablesOrCollections: ['orders', 'order_items', 'shipping_addresses'],
    consistency: 'Strict ACID Financial Ledger',
  },
  {
    service: 'Payment Service (:5004)',
    engine: 'PostgreSQL 16',
    storageTarget: 'shopsphere_payment',
    port: '5432',
    paradigm: 'Relational Ledger',
    primaryTablesOrCollections: ['transactions', 'payment_methods', 'idempotency_keys'],
    consistency: 'Strict ACID with Idempotency Guarantees',
  },
  {
    service: 'Product Service (:5002)',
    engine: 'MongoDB Atlas + Redis 7',
    storageTarget: 'shopsphere_product',
    port: '27017 / 6379',
    paradigm: 'Document Store + Cache-Aside',
    primaryTablesOrCollections: ['products', 'categories', 'inventory_logs', 'redis:products:*'],
    consistency: 'Tunable Majority Write Concern + Cache Invalidation',
  },
  {
    service: 'Review Service (:5008)',
    engine: 'MongoDB Atlas',
    storageTarget: 'shopsphere_review',
    port: '27017',
    paradigm: 'Document Store',
    primaryTablesOrCollections: ['reviews', 'helpful_votes', 'product_aggregates'],
    consistency: 'Document-Level Atomicity',
  },
  {
    service: 'Notification Service (:5005)',
    engine: 'MongoDB Atlas',
    storageTarget: 'shopsphere_notification',
    port: '27017',
    paradigm: 'Append-Only Event Store',
    primaryTablesOrCollections: ['notification_logs', 'email_templates'],
    consistency: 'Eventual Consistency',
  },
  {
    service: 'Search Service (:5006)',
    engine: 'In-Memory Trie / Inverted Index',
    storageTarget: 'RAM Index',
    port: '5006',
    paradigm: 'Faceted Token Index',
    primaryTablesOrCollections: ['token_postings', 'levenshtein_automata', 'category_facets'],
    consistency: 'Event-driven synchronicity from RabbitMQ',
  },
  {
    service: 'Recommendation Engine (:5007)',
    engine: 'Python Co-Occurrence Matrix (NumPy)',
    storageTarget: 'FastAPI Memory Graph',
    port: '5007',
    paradigm: 'Graph Co-Purchase Matrix',
    primaryTablesOrCollections: ['item_correlation_matrix', 'user_session_embeddings'],
    consistency: 'Continuous Batch Retraining',
  },
];

export const DATASET_STATS = {
  totalCatalogProducts: CATALOG_RECORDS.length,
  totalCategories: Array.from(new Set(CATALOG_RECORDS.map((c) => c.category))).length,
  totalStockUnits: CATALOG_RECORDS.reduce((sum, c) => sum + c.stock, 0),
  averagePrice: (CATALOG_RECORDS.reduce((sum, c) => sum + c.price, 0) / CATALOG_RECORDS.length).toFixed(2),
  averageRating: (CATALOG_RECORDS.reduce((sum, c) => sum + c.rating, 0) / CATALOG_RECORDS.length).toFixed(2),
  eventTopicCount: EVENT_TOPIC_RECORDS.length,
  datastoreCount: DATASTORE_RECORDS.length,
};
