import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Server, Database, MessageSquare } from 'lucide-react';
import { fetchSystemHealth } from '../api';
import { SystemHealthResponse } from '../types';

interface HealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthModal: React.FC<HealthModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSystemHealth();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to API Gateway');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHealth();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const serviceCards = [
    {
      name: 'API Gateway',
      port: 5000,
      tech: 'Express + Proxy + JWT Rate Limiter',
      role: 'Single public entrypoint & reverse proxy',
      status: 'UP',
      db: null,
      mq: null,
    },
    {
      name: 'Auth Service',
      port: 5001,
      tech: 'Express + TypeScript + JWT',
      role: 'User identity, bcrypt hashing, refresh token rotation',
      status: data?.services?.authService?.status || 'UNKNOWN',
      db: 'PostgreSQL (shopsphere_auth)',
      mq: null,
    },
    {
      name: 'Product Service',
      port: 5002,
      tech: 'Express + Mongoose',
      role: 'Polymorphic artisan catalog, stock inventory level publisher',
      status: data?.services?.productService?.status || 'UNKNOWN',
      db: 'MongoDB (shopsphere_product)',
      mq: 'RabbitMQ (publishes stock.updated)',
    },
    {
      name: 'Order Service',
      port: 5003,
      tech: 'Express + TypeScript + pg',
      role: 'Relational ACID order management, event publisher & consumer',
      status: data?.services?.orderService?.status || 'UNKNOWN',
      db: 'PostgreSQL (shopsphere_order)',
      mq: 'RabbitMQ (pub: order.created, sub: payment.*)',
    },
    {
      name: 'Payment Service',
      port: 5004,
      tech: 'Express + TypeScript + pg',
      role: 'Stripe sandbox processing simulation & transaction ledger',
      status: data?.services?.paymentService?.status || 'UNKNOWN',
      db: 'PostgreSQL (shopsphere_payment)',
      mq: 'RabbitMQ (sub: order.created, pub: payment.*)',
    },
    {
      name: 'Notification Service',
      port: 5005,
      tech: 'Express + Mongoose + Nodemailer',
      role: 'Event-driven customer transactional email dispatch',
      status: data?.services?.notificationService?.status || 'UNKNOWN',
      db: 'MongoDB (shopsphere_notification)',
      mq: 'RabbitMQ (sub: order.*, payment.*)',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-elevated border border-[#E8E1D6] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md border border-[#E8E1D6] text-[#C1440E]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1F1B16]">
                Distributed System Health & Topology
              </h2>
              <p className="text-[11px] text-[#6B6459]">
                Live aggregation across all 5 microservices & RabbitMQ message broker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHealth}
              disabled={loading}
              className="btn-secondary px-3 py-1.5 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Ping Services</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded-md hover:bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-[#FDF0ED] border border-[#F3C7BE] rounded-md text-xs text-[#A33A2E]">
              Gateway connection warning: {error}
            </div>
          )}

          {/* Grid of Microservices */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceCards.map((svc) => (
              <div
                key={svc.name}
                className="p-4 bg-[#FAF7F2] rounded-md border border-[#E8E1D6] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-medium text-sm text-[#1F1B16]">{svc.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        svc.status === 'UP'
                          ? 'bg-[#EBF3ED] text-[#3D6B4C]'
                          : 'bg-[#FFF4E5] text-[#C1440E]'
                      }`}
                    >
                      {svc.status === 'UP' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {svc.status}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#6B6459] block mt-0.5">
                    Port :{svc.port} &bull; {svc.tech}
                  </span>
                  <p className="text-[11px] text-[#6B6459] mt-2 leading-relaxed">
                    {svc.role}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E8E1D6] space-y-1 text-[10px]">
                  {svc.db && (
                    <div className="flex items-center gap-1.5 text-[#6B6459]">
                      <Database className="w-3 h-3 text-[#1F1B16]" />
                      <span>{svc.db}</span>
                    </div>
                  )}
                  {svc.mq && (
                    <div className="flex items-center gap-1.5 text-[#6B6459]">
                      <MessageSquare className="w-3 h-3 text-[#C1440E]" />
                      <span>{svc.mq}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Communication Flow Box */}
          <div className="p-4 bg-white rounded-md border border-[#E8E1D6] space-y-3">
            <h4 className="font-serif text-sm font-medium text-[#1F1B16]">
              Asynchronous Event Pipeline (RabbitMQ Topic Exchange: `ecommerce_events`)
            </h4>
            <div className="bg-[#FAF7F2] p-3 rounded font-mono text-[11px] text-[#1F1B16] overflow-x-auto leading-relaxed border border-[#E8E1D6]">
              Client &rarr; API Gateway (:5000) &rarr; Order Service (:5003)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br />
              Order Service creates PENDING order in PostgreSQL<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr; (publishes `order.created`)<br />
              RabbitMQ Exchange: ecommerce_events<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&boxur;&rarr; Payment Service (:5004) simulates Stripe test charge<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&boxur;&rarr; Notification Service (:5005) emails confirmation to user<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr; (publishes `payment.completed`)<br />
              Order Service consumes event &rarr; updates order status to PAID in PostgreSQL<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br />
              Notification Service consumes event &rarr; sends customer receipt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
