import React, { useEffect } from 'react';
import { ShoppingBag, User, Bell, LogOut, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onOpenOrders: () => void;
  onOpenHealth: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  currentView: 'landing' | 'catalog' | 'orders';
  onNavigateHome: () => void;
  onOpenCatalog: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenOrders,
  onOpenHealth,
  onOpenNotifications,
  onOpenAdmin,
  currentView,
  onNavigateHome,
  onOpenCatalog,
}) => {
  const { user, logout, openAuthModal } = useAuth();
  const { itemCount, openDrawer } = useCart();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('shopsphere-theme', 'light');
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8E1D6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Brand Logo & Editorial Subtitle */}
          <div className="flex items-center gap-6">
            <button
              onClick={onNavigateHome}
              className="text-left group transition-transform focus:outline-none"
            >
              <span className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#1F1B16] group-hover:text-[#C1440E] transition-colors">
                ShopSphere
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-[#6B6459] font-sans font-medium -mt-0.5">
                Artisanal Goods &middot; Distributed Architecture
              </span>
            </button>

            {/* View navigation */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[#E8E1D6]">
              <button
                onClick={onNavigateHome}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'landing'
                    ? 'text-[#C1440E] bg-[#FAF0EB]'
                    : 'text-[#6B6459] hover:text-[#1F1B16] hover:bg-[#F2ECE3]'
                }`}
              >
                Overview & System
              </button>
              <button
                onClick={onOpenCatalog}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'catalog'
                    ? 'text-[#C1440E] bg-[#FAF0EB]'
                    : 'text-[#6B6459] hover:text-[#1F1B16] hover:bg-[#F2ECE3]'
                }`}
              >
                Collection
              </button>
              <button
                onClick={onOpenOrders}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  currentView === 'orders'
                    ? 'text-[#C1440E] bg-[#FAF0EB]'
                    : 'text-[#6B6459] hover:text-[#1F1B16] hover:bg-[#F2ECE3]'
                }`}
              >
                Your orders
              </button>
            </nav>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Microservices Architecture Status */}
            <button
              onClick={onOpenHealth}
              title="View live microservices cluster topology & health"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#1F1B16] bg-white border border-[#E8E1D6] rounded-md shadow-soft hover:bg-[#FDFBF7] transition-all"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3D6B4C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3D6B4C]"></span>
              </span>
              <span className="hidden sm:inline">Cluster Health</span>
            </button>

            {/* Email Notifications Feed */}
            <button
              onClick={onOpenNotifications}
              title="View generated notification emails and test previews"
              className="p-2 text-[#6B6459] hover:text-[#1F1B16] bg-white border border-[#E8E1D6] rounded-md shadow-soft hover:bg-[#FDFBF7] transition-all"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Seller / Admin Portal */}
            <button
              onClick={onOpenAdmin}
              title="Open Seller & Catalog Admin Portal"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#1F1B16] bg-white border border-[#E8E1D6] rounded-md shadow-soft hover:bg-[#FDFBF7] transition-all"
            >
              <Store className="w-3.5 h-3.5 text-[#C1440E]" />
              <span className="hidden sm:inline">Seller Portal</span>
            </button>

            {/* User Account / Auth */}
            {user ? (
              <div className="flex items-center gap-2 pl-1">
                <span className="hidden lg:inline text-xs text-[#6B6459]">
                  Hi, <strong className="text-[#1F1B16] font-medium">{user.name.split(' ')[0]}</strong>
                </span>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-[#6B6459] hover:text-[#A33A2E] bg-white border border-[#E8E1D6] rounded-md shadow-soft hover:bg-[#FDF0ED] transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1F1B16] bg-white border border-[#E8E1D6] rounded-md shadow-soft hover:bg-[#FDFBF7] transition-all"
              >
                <User className="w-3.5 h-3.5 text-[#C1440E]" />
                <span>Sign in</span>
              </button>
            )}

            {/* Bag Button */}
            <button
              onClick={openDrawer}
              className="btn-terracotta px-3.5 py-1.5 text-xs font-medium gap-2 shadow-soft"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag ({itemCount})</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
