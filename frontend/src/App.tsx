import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { fetchProducts, fetchCategories } from './api';
import { Product, Order } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrdersView } from './components/OrdersView';
import { HealthModal } from './components/HealthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { MagicRings } from './components/reactbits';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

const ShopSphereApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'catalog' | 'orders'>('landing');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('newest');

  // React Query fetching products & categories
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', selectedCategory, searchQuery, sortOption],
    queryFn: () => fetchProducts({ category: selectedCategory, search: searchQuery, sort: sortOption }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const featuredProduct = products.find((p) => p.featured) || products[0];

  const handleOrderSuccess = (order: Order) => {
    // Switch to orders view after order placement
    setCurrentView('orders');
  };

  const handleExplore = () => {
    const el = document.getElementById('collection-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] flex flex-col text-[#1F1B16] selection:bg-[#C1440E] selection:text-white">
      {/* Global Fixed Background: MagicRings across the entire website */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <MagicRings
          color="#C1440E"
          colorTwo="#D97706"
          ringCount={8}
          speed={0.65}
          attenuation={9}
          lineThickness={2}
          baseRadius={0.32}
          radiusStep={0.09}
          scaleRate={0.08}
          opacity={0.38}
          blur={0}
          noiseAmount={0.03}
          rotation={15}
          ringGap={1.4}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={true}
          mouseInfluence={0.2}
          hoverScale={1.15}
          parallax={0.05}
          clickBurst={true}
          alphaMode="coverage"
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Sticky Off-white / Dark Nav */}
        <Navbar
          currentView={currentView}
          onNavigateHome={() => setCurrentView('landing')}
          onOpenCatalog={() => setCurrentView('catalog')}
          onOpenOrders={() => setCurrentView('orders')}
          onOpenHealth={() => setIsHealthOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1">
          {currentView === 'landing' ? (
            <LandingPage
              onEnterStore={() => setCurrentView('catalog')}
              onOpenHealth={() => setIsHealthOpen(true)}
              onOpenSellerPortal={() => setIsAdminOpen(true)}
            />
          ) : currentView === 'catalog' ? (
            <>
              {/* Asymmetric Magazine Spread Hero */}
              <Hero
                featuredProduct={featuredProduct}
                onExplore={handleExplore}
              />

              {/* Curated Product Grid */}
              <ProductGrid
                products={products}
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
                onSelectProduct={setSelectedProduct}
                loading={productsLoading}
              />
            </>
          ) : (
            <OrdersView onBackToShopping={() => setCurrentView('catalog')} />
          )}
        </main>

        {/* Editorial Footer */}
        <footer className="bg-white/85 backdrop-blur-md border-t border-[#E8E1D6] py-12 mt-16 text-xs text-[#6B6459]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2 md:col-span-2">
            <span className="font-serif text-2xl font-medium text-[#1F1B16]">ShopSphere</span>
            <p className="max-w-sm text-xs leading-relaxed">
              An e-commerce demonstration designed for modern distributed systems architecture.
              8 independently deployable microservices orchestrated via RabbitMQ event topics, Redis cache-aside, and an API Gateway with Circuit Breakers.
            </p>
            <div className="pt-2 text-[11px] font-mono text-[#C1440E]">
              Auth &bull; Products &bull; Orders &bull; Payments &bull; Notifications &bull; Search &bull; Recommendations (Python) &bull; Reviews &bull; Gateway
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-serif text-sm font-medium text-[#1F1B16]">Architectural Specs</h4>
            <ul className="space-y-1 text-[11px]">
              <li>API Gateway + Circuit Breakers (Port :8080)</li>
              <li>Auth Service (PostgreSQL :5001)</li>
              <li>Product Service + Redis Cache (MongoDB :5002)</li>
              <li>Order Service (PostgreSQL :5003)</li>
              <li>Payment Service (PostgreSQL :5004)</li>
              <li>Notification Service (MongoDB :5005)</li>
              <li>Search Service (Levenshtein Inverted Index :5006)</li>
              <li>Recommendation Engine (Python FastAPI :5007)</li>
              <li>Review & Rating Service (MongoDB :5008)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-serif text-sm font-medium text-[#1F1B16]">Event Message Broker & Cache</h4>
            <p className="text-[11px] leading-relaxed">
              RabbitMQ topic exchange <code className="bg-[#FAF7F2] px-1 py-0.5 rounded border border-[#E8E1D6]">ecommerce_events</code> routing <code className="text-[#C1440E]">order.created</code>, <code className="text-[#3D6B4C]">payment.completed</code>, <code className="text-[#A33A2E]">payment.failed</code> (compensating Saga transactions), <code className="text-amber-600">review.created</code>, and Redis cache invalidation.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-[#E8E1D6] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>&copy; {new Date().getFullYear()} ShopSphere. Distributed systems portfolio project.</span>
          <div className="flex gap-4">
            <button onClick={() => setIsHealthOpen(true)} className="hover:text-[#1F1B16] underline">
              View Microservices Health
            </button>
            <button onClick={() => setIsAdminOpen(true)} className="hover:text-[#1F1B16] underline">
              Seller & Catalog Portal
            </button>
            <button onClick={() => setIsNotificationsOpen(true)} className="hover:text-[#1F1B16] underline">
              Live Notification Logs
            </button>
          </div>
        </div>
      </footer>
      </div>

      {/* Modals & Slide-out Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <CartDrawer />

      <CheckoutModal onSuccess={handleOrderSuccess} />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onProductChanged={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
      />

      <HealthModal
        isOpen={isHealthOpen}
        onClose={() => setIsHealthOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <AuthModal />
    </div>
  );
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ShopSphereApp />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
