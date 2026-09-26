import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, openAuthModal, login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode when modal opens
  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      closeAuthModal();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoName: string) => {
    setEmail(demoEmail);
    setPassword('artisan123');
    setName(demoName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-elevated border border-[#E8E1D6] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl font-medium text-[#1F1B16]">
              {mode === 'login' ? 'Sign in to ShopSphere' : 'Create an Account'}
            </h2>
            <p className="text-[11px] text-[#6B6459] mt-0.5">
              PostgreSQL-backed Auth Service with JWT & bcrypt
            </p>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded-md hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-[#FDF0ED] border border-[#F3C7BE] rounded-md text-xs text-[#A33A2E] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@workshop.artisan"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-terracotta py-2.5 px-4 text-xs font-medium gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill */}
          <div className="mt-5 pt-4 border-t border-[#E8E1D6] text-center">
            <span className="text-[11px] text-[#6B6459] block mb-2">Or fill demo credentials:</span>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemo('eleanor@shopsphere.artisan', 'Eleanor Vance')}
                className="px-2.5 py-1 text-[11px] text-[#1F1B16] bg-[#FAF7F2] border border-[#E8E1D6] rounded hover:border-[#1F1B16]"
              >
                Eleanor (Customer)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('marcus@shopsphere.artisan', 'Marcus Aurel')}
                className="px-2.5 py-1 text-[11px] text-[#1F1B16] bg-[#FAF7F2] border border-[#E8E1D6] rounded hover:border-[#1F1B16]"
              >
                Marcus (Curator)
              </button>
            </div>
          </div>

          {/* Toggle mode */}
          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-[#6B6459]">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#C1440E] font-medium hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#6B6459]">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#C1440E] font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
