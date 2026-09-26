import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Zap,
  CheckCircle2,
  ShoppingBag,
  Activity,
  Server,
  Sparkles,
  Bell,
  Search,
  MessageSquare,
  Lock,
  RotateCcw
} from 'lucide-react';

interface LandingPageProps {
  onEnterStore: () => void;
  onOpenHealth: () => void;
  onOpenSellerPortal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStore,
  onOpenHealth,
  onOpenSellerPortal,
}) => {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Checkout & Gateway Ingestion',
      service: 'API Gateway (:8080)',
      badge: 'Edge Ingress',
      desc: 'The client browser initiates checkout. The API Gateway applies rate limiting (5,000 req/window), injects an x-correlation-id for distributed tracing, verifies JWT auth, and protects downstreams via Opossum circuit breakers.',
      icon: Lock,
      color: 'text-[#C1440E]',
      bg: 'bg-[#FAF0EB]',
      details: ['Correlation ID: x-correlation-id injected', 'Circuit Breakers: 8 independent routes', 'Window Rate Limiter & Token Auth'],
    },
    {
      step: '02',
      title: 'Relational Order Persistence',
      service: 'Order Service (:5003)',
      badge: 'PostgreSQL ACID',
      desc: 'The Order Service saves the order and its items in PostgreSQL with status "PENDING" inside a strict ACID transaction, then publishes an "order.created" event to the RabbitMQ topic exchange.',
      icon: Database,
      color: 'text-[#3D6B4C]',
      bg: 'bg-[#EBF3ED]',
      details: ['ACID Ledger: orders & order_items tables', 'Status: Initialized to PENDING', 'Emits: order.created to ecommerce_events'],
    },
    {
      step: '03',
      title: 'Saga Inventory Reservation',
      service: 'Product Service (:5002)',
      badge: 'MongoDB Atlas + Redis',
      desc: 'Consuming "order.created", the Product Service atomically decrements MongoDB Atlas stock. If available, it reserves the items and emits "inventory.reserved". If stock is insufficient, it emits "inventory.failed".',
      icon: Cpu,
      color: 'text-amber-600',
      bg: 'bg-[#FFF8E6]',
      details: ['Atomic Stock Reservation in Atlas', 'Cache-Aside: Invalidates Redis cache', 'Emits: inventory.reserved'],
    },
    {
      step: '04',
      title: 'Simulated Stripe Payment Processing',
      service: 'Payment Service (:5004)',
      badge: 'PostgreSQL Ledger',
      desc: 'Listening to "inventory.reserved", Payment Service processes the simulated charge. If approved, it emits "payment.completed". If declined, it records the failure and emits "payment.failed" with item details.',
      icon: Zap,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      details: ['Simulates Stripe idempotency', 'Card verification & audit log', 'Emits: payment.completed OR payment.failed'],
    },
    {
      step: '05',
      title: 'Saga Compensating Rollback or Settlement',
      service: 'Choreography Coordinator',
      badge: 'Distributed Saga',
      desc: 'On success: Order Service sets status to "PAID" and Python recommendation engine updates its co-occurrence matrix. On decline: Product Service executes a compensating rollback restoring reserved stock back to Atlas!',
      icon: RotateCcw,
      color: 'text-[#A33A2E]',
      bg: 'bg-[#FDF0ED]',
      details: ['Happy Path: Order marked PAID', 'Failure Path: Compensating stock restoration', 'Zero two-phase commit (2PC) lock overhead'],
    },
    {
      step: '06',
      title: 'Async Notification & Dispatch',
      service: 'Notification Service (:5005)',
      badge: 'Ethereal SMTP Mailer',
      desc: 'Consuming "payment.completed", the Notification Service generates rich transactional HTML receipts and dispatches them via SMTP mailers with live test preview URLs.',
      icon: Bell,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      details: ['Non-blocking async email rendering', 'Logs notifications in MongoDB Atlas', 'Ethereal SMTP preview URL generated'],
    },
  ];

  const microservices = [
    {
      name: 'API Gateway',
      port: ':8080',
      tech: 'Node.js / Express / TypeScript',
      storage: 'In-Memory Routing Table',
      description: 'Central entrypoint with Opossum Circuit Breakers, distributed tracing (x-correlation-id), rate limiting, and reverse proxying.',
      icon: Server,
      accent: 'border-l-4 border-l-[#C1440E]',
    },
    {
      name: 'Auth Service',
      port: ':5001',
      tech: 'Express / TypeScript',
      storage: 'PostgreSQL (shopsphere_auth)',
      description: 'Handles customer registration, credential verification, bcrypt password hashing, and signed JWT token issuance.',
      icon: Lock,
      accent: 'border-l-4 border-l-[#3D6B4C]',
    },
    {
      name: 'Product Service',
      port: ':5002',
      tech: 'Express / Mongoose / TypeScript',
      storage: 'MongoDB Atlas + Redis Cache',
      description: 'Catalog management, polymorphic attributes, sub-5ms Redis cache-aside, Saga inventory reservations, and compensating rollbacks.',
      icon: Database,
      accent: 'border-l-4 border-l-amber-500',
    },
    {
      name: 'Order Service',
      port: ':5003',
      tech: 'Express / TypeScript',
      storage: 'PostgreSQL (shopsphere_order)',
      description: 'Manages relational order ledgers, line item records, customer addresses, and listens for asynchronous payment outcomes.',
      icon: Layers,
      accent: 'border-l-4 border-l-blue-500',
    },
    {
      name: 'Payment Service',
      port: ':5004',
      tech: 'Express / TypeScript',
      storage: 'PostgreSQL (shopsphere_payment)',
      description: 'Processes credit card transactions, maintains immutable ledger audit trails, and publishes payment completion or decline events.',
      icon: Zap,
      accent: 'border-l-4 border-l-emerald-600',
    },
    {
      name: 'Notification Service',
      port: ':5005',
      tech: 'Express / TypeScript / Nodemailer',
      storage: 'MongoDB Atlas (notification logs)',
      description: 'Consumes order and payment events asynchronously, dispatching formatted HTML order receipts via Ethereal SMTP.',
      icon: Bell,
      accent: 'border-l-4 border-l-rose-500',
    },
    {
      name: 'Search Service',
      port: ':5006',
      tech: 'Express / TypeScript / Inverted Index',
      storage: 'In-Memory Inverted Index',
      description: 'Full-text token search with Levenshtein edit-distance typo tolerance (e.g., "ceramik" matches "Ceramic Bowl"), faceted filtering, and RabbitMQ sync.',
      icon: Search,
      accent: 'border-l-4 border-l-indigo-500',
    },
    {
      name: 'Recommendation Engine',
      port: ':5007',
      tech: 'Python 3 / FastAPI / ML',
      storage: 'Item Co-Occurrence Graph',
      description: 'Polyglot Python microservice computing live item-to-item co-purchase correlation matrices from order history to serve "Frequently Bought Together".',
      icon: Sparkles,
      accent: 'border-l-4 border-l-yellow-600',
    },
    {
      name: 'Review & Rating Service',
      port: ':5008',
      tech: 'Express / TypeScript / Mongoose',
      storage: 'MongoDB Atlas (shopsphere_review)',
      description: 'Customer reviews and 1-5 star ratings. Publishes review.created events that trigger Product Service aggregate rating updates and cache purges.',
      icon: MessageSquare,
      accent: 'border-l-4 border-l-teal-600',
    },
  ];

  return (
    <div className="space-y-24 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-[#1F1B16] bg-transparent">
      {/* 1. Hero Introduction */}
      <section className="relative pt-6 pb-12 sm:pt-12 sm:pb-20 text-center max-w-4xl mx-auto space-y-6">
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF0EB]/90 backdrop-blur-sm border border-[#F3D5B5] text-xs font-medium text-[#C1440E] animate-fade-in shadow-soft">
            <span className="w-2 h-2 rounded-full bg-[#C1440E] animate-pulse"></span>
            <span>8 Independent Microservices &bull; Event-Driven Architecture &bull; MongoDB Atlas</span>
          </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-[#1F1B16] leading-[1.1]">
          Where Artisanal Craftsmanship Meets{' '}
          <span className="italic text-[#C1440E]">Distributed Systems</span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#6B6459] leading-relaxed font-sans">
          ShopSphere is not just an artisanal lifestyle store &mdash; it is a fully functioning distributed system designed to demonstrate production architectural depth. Every order, search, rating, and recommendation executes across decoupled services communicating via RabbitMQ topic exchanges, Redis cache-aside, and MongoDB Atlas.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={onEnterStore}
            className="btn-terracotta px-6 py-3.5 text-sm font-medium gap-2 shadow-soft hover:shadow-elevated transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Enter Artisanal Storefront</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenHealth}
            className="btn-secondary px-5 py-3.5 text-sm font-medium gap-2 shadow-soft"
          >
            <Activity className="w-4 h-4 text-[#3D6B4C]" />
            <span>Inspect Live Topology (:8080)</span>
          </button>

          <button
            onClick={onOpenSellerPortal}
            className="px-5 py-3.5 text-sm font-medium text-[#1F1B16] bg-white border border-[#E8E1D6] rounded-md hover:bg-[#FAF7F2] transition-all shadow-soft"
          >
            <span>Seller & Inventory Portal</span>
          </button>
        </div>

        {/* Live Metrics Counter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 text-left">
          <div className="p-4 bg-white rounded-lg border border-[#E8E1D6] shadow-soft">
            <span className="block text-2xl font-serif font-bold text-[#1F1B16]">8</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C1440E]">Decoupled Services</span>
            <p className="text-[11px] text-[#6B6459] mt-1">Independently runnable Node.js & Python microservices</p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-[#E8E1D6] shadow-soft">
            <span className="block text-2xl font-serif font-bold text-[#1F1B16]">&lt; 37 ms</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#3D6B4C]">Average Gateway Latency</span>
            <p className="text-[11px] text-[#6B6459] mt-1">Accelerated by Redis cache-aside with sub-5ms responses</p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-[#E8E1D6] shadow-soft">
            <span className="block text-2xl font-serif font-bold text-[#1F1B16]">100%</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-600">Saga Event Consistency</span>
            <p className="text-[11px] text-[#6B6459] mt-1">Automated inventory compensation on payment failures</p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-[#E8E1D6] shadow-soft">
            <span className="block text-2xl font-serif font-bold text-[#1F1B16]">Polyglot</span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-600">Persistence Stack</span>
            <p className="text-[11px] text-[#6B6459] mt-1">MongoDB Atlas cloud + PostgreSQL + Redis + RabbitMQ</p>
          </div>
        </div>
      </div>
      </section>

      {/* 2. Interactive Workflow Sequence: "How ShopSphere Works" */}
      <section className="bg-white rounded-xl border border-[#E8E1D6] p-6 sm:p-10 shadow-soft space-y-8">
        <div>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C1440E]">
            End-To-End Execution Architecture
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#1F1B16] mt-1">
            How an Order Travels Through the Distributed Cluster
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6459] mt-1 max-w-2xl">
            Click through each stage of the distributed transaction to see how RabbitMQ choreography, inventory reservation, and compensating rollbacks operate in production.
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 border-b border-[#E8E1D6] pb-4">
          {workflowSteps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveWorkflowStep(idx)}
              className={`p-3 text-left rounded-lg transition-all border ${
                activeWorkflowStep === idx
                  ? 'bg-[#FAF0EB] border-[#C1440E]'
                  : 'bg-[#FAF7F2] border-transparent hover:border-[#E8E1D6]'
              }`}
            >
              <span className="block text-[10px] font-mono text-[#6B6459] font-semibold">{s.step}</span>
              <span className={`block text-xs font-medium truncate ${
                activeWorkflowStep === idx ? 'text-[#C1440E]' : 'text-[#1F1B16]'
              }`}>
                {s.title.split(' ')[0]} {s.title.split(' ')[1] || ''}
              </span>
            </button>
          ))}
        </div>

        {/* Active Step Showcase Card */}
        {(() => {
          const current = workflowSteps[activeWorkflowStep];
          const StepIcon = current.icon;
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center p-6 bg-[#FAF7F2] rounded-xl border border-[#E8E1D6]">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`p-2 rounded-lg ${current.bg} ${current.color}`}>
                    <StepIcon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-bold text-[#6B6459]">
                    STAGE {current.step} OF 06
                  </span>
                  <span className="px-2.5 py-0.5 text-[11px] rounded-full font-medium bg-white border border-[#E8E1D6] text-[#1F1B16]">
                    {current.badge}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-medium text-[#1F1B16]">
                  {current.title} &bull; <span className="text-sm font-sans text-[#6B6459]">{current.service}</span>
                </h3>

                <p className="text-xs sm:text-sm text-[#6B6459] leading-relaxed">
                  {current.desc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  {current.details.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border border-[#E8E1D6] text-[11px] text-[#1F1B16]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3D6B4C] flex-shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Preview */}
              <div className="p-5 bg-white rounded-lg border border-[#E8E1D6] space-y-3 shadow-soft">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459]">
                  Live Test This In Storefront
                </h4>
                <p className="text-xs text-[#6B6459] leading-relaxed">
                  Want to verify this exact step live? Place an order in the checkout modal. Enable the <strong>"Simulate test card decline"</strong> toggle to observe the compensating inventory rollback in action!
                </p>
                <button
                  onClick={onEnterStore}
                  className="w-full btn-terracotta py-2 px-3 text-xs font-medium gap-1.5 shadow-soft"
                >
                  <span>Launch Checkout Test</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}
      </section>

      {/* 3. The 8 Microservices Ecosystem */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C1440E]">
              Microservices Ecosystem
            </span>
            <h2 className="font-serif text-3xl font-medium text-[#1F1B16] mt-1">
              8 Decoupled Services & Their Responsibilities
            </h2>
            <p className="text-xs text-[#6B6459] mt-1">
              Every service is containerized, independently deployable, and communicates via defined APIs or RabbitMQ topic exchanges.
            </p>
          </div>

          <button
            onClick={onOpenHealth}
            className="btn-secondary px-3.5 py-2 text-xs font-medium gap-1.5 self-start sm:self-auto shadow-soft"
          >
            <Activity className="w-3.5 h-3.5 text-[#3D6B4C]" />
            <span>Live Health Telemetry</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {microservices.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div
                key={i}
                className={`p-5 bg-white rounded-lg border border-[#E8E1D6] shadow-soft ${svc.accent} flex flex-col justify-between hover:-translate-y-0.5 transition-transform`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#C1440E]" />
                      <h3 className="font-serif text-base font-medium text-[#1F1B16]">
                        {svc.name}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded bg-[#FAF7F2] text-[#1F1B16] border border-[#E8E1D6]">
                      {svc.port}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6459] leading-relaxed">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E8E1D6] space-y-1 text-[11px]">
                  <div className="flex justify-between text-[#6B6459]">
                    <span>Stack:</span>
                    <span className="font-medium text-[#1F1B16]">{svc.tech}</span>
                  </div>
                  <div className="flex justify-between text-[#6B6459]">
                    <span>Persistence:</span>
                    <span className="font-medium text-[#C1440E]">{svc.storage}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Live Architectural Highlights You Can Test Right Now */}
      <section className="bg-white rounded-xl border border-[#E8E1D6] p-6 sm:p-10 space-y-8 shadow-soft">
        <div className="max-w-2xl">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C1440E]">
            Interactive Features
          </span>
          <h2 className="font-serif text-3xl font-medium text-[#1F1B16] mt-1">
            Production Patterns Ready To Test
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6459] mt-1">
            Experience the real-world distributed systems techniques implemented under the hood:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="p-5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-md bg-[#FAF0EB] text-[#C1440E] flex items-center justify-center mb-3">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#1F1B16]">
              Typo-Tolerant Search
            </h3>
            <p className="text-xs text-[#6B6459] leading-relaxed">
              Uses an in-memory inverted index with Levenshtein edit distance. Searching for <code>"ceramik"</code> or <code>"kettle"</code> finds products in under 4ms with category & price faceting.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-md bg-[#EBF3ED] text-[#3D6B4C] flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#1F1B16]">
              Python ML Recommendations
            </h3>
            <p className="text-xs text-[#6B6459] leading-relaxed">
              A polyglot Python 3 FastAPI microservice on port 5007 listens to <code>order.created</code> events and constructs an item co-occurrence matrix for "Frequently Bought Together" items.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-5 bg-[#FAF7F2] rounded-lg border border-[#E8E1D6] shadow-soft space-y-2">
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#1F1B16]">
              Saga Compensating Rollback
            </h3>
            <p className="text-xs text-[#6B6459] leading-relaxed">
              When checkout starts, stock is temporarily reserved. If payment fails or is declined, a compensating transaction automatically restores stock counts back to MongoDB Atlas.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Bottom Invitation Banner (Editorial Warm Light Mode) */}
      <section className="relative overflow-hidden p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#FAF0EB] via-[#FFFDF9] to-[#F5ECE1] border border-[#E8E1D6] text-[#1F1B16] text-center space-y-6 shadow-soft">
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#C1440E]">
            Live Artisanal Marketplace
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-[#1F1B16]">
            Ready to explore the collection?
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6459] leading-relaxed">
            Browse handcrafted ceramics, Tuscan leather goods, Belgian linens, and Japanese stationery &mdash; all backed by a resilient 8-microservice cluster.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onEnterStore}
            className="btn-terracotta px-7 py-3.5 text-sm font-medium gap-2 shadow-soft"
          >
            <span>Enter ShopSphere Collection</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenHealth}
            className="px-6 py-3.5 text-sm font-medium bg-white hover:bg-[#FAF7F2] text-[#1F1B16] border border-[#E8E1D6] rounded-md transition-all shadow-soft"
          >
            <span>View Microservices Topology</span>
          </button>
        </div>
      </section>
    </div>
  );
};
