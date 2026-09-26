import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { loginUser, registerUser, verifyToken } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('shopsphere_access_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem('shopsphere_access_token');
      if (savedToken) {
        try {
          const res = await verifyToken(savedToken);
          setUser(res.user);
          setToken(savedToken);
        } catch (err) {
          console.warn('Session expired or token invalid');
          localStorage.removeItem('shopsphere_access_token');
          localStorage.removeItem('shopsphere_refresh_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await loginUser({ email, password });
    localStorage.setItem('shopsphere_access_token', data.accessToken);
    localStorage.setItem('shopsphere_refresh_token', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await registerUser({ email, password, name });
    localStorage.setItem('shopsphere_access_token', data.accessToken);
    localStorage.setItem('shopsphere_refresh_token', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('shopsphere_access_token');
    localStorage.removeItem('shopsphere_refresh_token');
    setUser(null);
    setToken(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
