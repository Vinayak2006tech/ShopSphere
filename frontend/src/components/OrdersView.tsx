import React, { useEffect, useState } from 'react';
import { Package, RefreshCw, AlertCircle, ArrowLeft, Clock, CheckCircle2, XCircle, Truck, RotateCcw } from 'lucide-react';
import { fetchUserOrders } from '../api';
import { Order } from '../types';

interface OrdersViewProps {
  onBackToShopping: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onBackToShopping }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setError(null);
      const data = await fetchUserOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // Auto-poll every 5 seconds to catch live async RabbitMQ updates!
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-[#EBF3ED] text-[#3D6B4C]">
            <CheckCircle2 className="w-3 h-3" /> Confirmed & Paid
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-[#FFF4E5] text-[#C1440E]">
            <Clock className="w-3 h-3 animate-spin" /> Awaiting Payment Event
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-[#FDF0ED] text-[#A33A2E]">
            <XCircle className="w-3 h-3" /> Payment Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E1D6]">
        <div>
          <button
            onClick={onBackToShopping}
            className="inline-flex items-center gap-1.5 text-xs text-[#6B6459] hover:text-[#1F1B16] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to collection</span>
          </button>
          <h1 className="font-serif text-3xl font-medium text-[#1F1B16]">Your orders</h1>
          <p className="text-xs text-[#6B6459] mt-0.5">
            Relational order ledger managed by Order Service with live RabbitMQ status sync
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary px-3 py-1.5 text-xs font-medium gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh ledger</span>
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-[#FDF0ED] border border-[#F3C7BE] rounded-md text-xs text-[#A33A2E] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-[#6B6459]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#C1440E] border-t-transparent mb-3"></div>
          <p className="text-sm font-serif">Querying order service...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-24 text-center max-w-sm mx-auto space-y-3">
          <Package className="w-12 h-12 text-[#6B6459] mx-auto stroke-[1.2]" />
          <h3 className="font-serif text-xl text-[#1F1B16]">No orders placed yet</h3>
          <p className="text-xs text-[#6B6459]">
            When you purchase handcrafted items, your orders and asynchronous event state will appear here.
          </p>
          <button
            onClick={onBackToShopping}
            className="btn-terracotta px-5 py-2.5 text-xs font-medium mt-2"
          >
            Explore collection
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card-soft border border-[#E8E1D6] overflow-hidden"
            >
              {/* Order Meta Bar */}
              <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#E8E1D6] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Order ID</span>
                    <span className="font-mono font-medium text-[#1F1B16]">#{order.id.substring(0, 13)}...</span>
                  </div>
                  <div>
                    <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Placed On</span>
                    <span className="text-[#1F1B16] font-medium">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Total</span>
                    <span className="font-serif text-[#1F1B16] font-medium text-sm">
                      ${Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Visual Order Lifecycle & Saga Tracking Timeline */}
              <div className="px-4 py-3 bg-white border-b border-[#E8E1D6]">
                <div className="flex items-center justify-between max-w-2xl mx-auto py-1 text-xs">
                  {/* Step 1: Placed */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-6 h-6 rounded-full bg-[#3D6B4C] text-white flex items-center justify-center text-[11px] font-bold">
                      ✓
                    </div>
                    <span className="text-[10px] font-medium text-[#1F1B16]">Order Placed</span>
                  </div>

                  <div className={`flex-1 h-0.5 mx-2 ${order.status !== 'CANCELLED' ? 'bg-[#3D6B4C]' : 'bg-[#E8E1D6]'}`} />

                  {/* Step 2: Inventory Reserved (Saga) */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      order.status === 'PAYMENT_FAILED'
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#3D6B4C] text-white'
                    }`}>
                      {order.status === 'PAYMENT_FAILED' ? '!' : '✓'}
                    </div>
                    <span className="text-[10px] font-medium text-[#1F1B16]">
                      {order.status === 'PAYMENT_FAILED' ? 'Stock Released (Saga)' : 'Stock Reserved'}
                    </span>
                  </div>

                  <div className={`flex-1 h-0.5 mx-2 ${
                    order.status === 'PAID' ? 'bg-[#3D6B4C]' : order.status === 'PAYMENT_FAILED' ? 'bg-[#A33A2E]' : 'bg-[#E8E1D6]'
                  }`} />

                  {/* Step 3: Payment Processed */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      order.status === 'PAID'
                        ? 'bg-[#3D6B4C] text-white'
                        : order.status === 'PAYMENT_FAILED'
                        ? 'bg-[#A33A2E] text-white'
                        : 'bg-[#FAF0EB] text-[#C1440E] border border-[#C1440E]'
                    }`}>
                      {order.status === 'PAID' ? '✓' : order.status === 'PAYMENT_FAILED' ? '✕' : '...'}
                    </div>
                    <span className="text-[10px] font-medium text-[#1F1B16]">
                      {order.status === 'PAID' ? 'Payment Verified' : order.status === 'PAYMENT_FAILED' ? 'Declined' : 'Processing'}
                    </span>
                  </div>

                  <div className={`flex-1 h-0.5 mx-2 ${order.status === 'PAID' ? 'bg-[#3D6B4C]' : 'bg-[#E8E1D6]'}`} />

                  {/* Step 4: Dispatched */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                      order.status === 'PAID'
                        ? 'bg-[#3D6B4C] text-white'
                        : 'bg-[#FAF7F2] text-[#6B6459] border border-[#E8E1D6]'
                    }`}>
                      <Truck className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-medium text-[#6B6459]">
                      {order.status === 'PAID' ? 'In Delivery' : 'Dispatched'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 sm:p-5 divide-y divide-[#E8E1D6]">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-12 h-14 object-cover rounded border border-[#E8E1D6] bg-white flex-shrink-0"
                        />
                      )}
                      <div>
                        <h4 className="font-serif text-sm font-medium text-[#1F1B16]">{item.productName}</h4>
                        <span className="text-xs text-[#6B6459]">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="font-serif text-sm text-[#1F1B16]">
                      ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Destination Address */}
              <div className="p-4 sm:p-5 bg-white border-t border-[#E8E1D6] text-xs text-[#6B6459] flex flex-wrap justify-between items-center gap-2">
                <div>
                  <strong>Shipped to: </strong>
                  {typeof order.shipping_address === 'string'
                    ? order.shipping_address
                    : `${order.shipping_address.street}, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postalCode}`}
                </div>
                <div className="font-mono text-[10px] text-[#6B6459]">
                  Dispatched via RabbitMQ topic: ecommerce_events
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
