import React, { useState } from 'react';
import { X, CreditCard, Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../api';
import { Order } from '../types';

interface CheckoutModalProps {
  onSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onSuccess }) => {
  const { items, subtotal, isCheckoutOpen, closeCheckout, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();

  const [customerName, setCustomerName] = useState(user?.name || 'Eleanor Vance');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'eleanor@shopsphere.artisan');
  const [street, setStreet] = useState('742 Evergreen Terrace');
  const [city, setCity] = useState('Portland');
  const [state, setState] = useState('OR');
  const [postalCode, setPostalCode] = useState('97201');
  const [country, setCountry] = useState('United States');

  // Simulated Payment Card
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [simulateDecline, setSimulateDecline] = useState(false);

  // Promo / Discount Engine
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Flow State
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const discountAmount = appliedPromo ? subtotal * appliedPromo.percent : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();
    if (code === 'ARTISAN15') {
      setAppliedPromo({ code: 'ARTISAN15', percent: 0.15 });
    } else if (code === 'WELCOME20') {
      setAppliedPromo({ code: 'WELCOME20', percent: 0.20 });
    } else {
      setPromoError('Invalid coupon. Try ARTISAN15 (15% off) or WELCOME20 (20% off)');
    }
  };

  if (!isCheckoutOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      setStep('1/4 Creating order in relational database...');
      await new Promise((res) => setTimeout(res, 500));

      const emailToUse = simulateDecline ? `fail_${customerEmail}` : customerEmail;

      const orderPayload = {
        customerName,
        customerEmail: emailToUse,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          imageUrl: i.product.images[0],
        })),
        shippingAddress: {
          street,
          city,
          state,
          postalCode,
          country,
        },
      };

      setStep('2/4 Publishing order.created event to RabbitMQ...');
      const order = await createOrder(orderPayload);

      setStep('3/4 Payment Service processing simulated Stripe card...');
      await new Promise((res) => setTimeout(res, 1000));

      setStep('4/4 Notification Service dispatching receipt email...');
      await new Promise((res) => setTimeout(res, 600));

      clearCart();
      setCompletedOrder(order);
      onSuccess(order);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-lg shadow-elevated border border-[#E8E1D6] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#FAF7F2]">
          <div>
            <h2 className="font-serif text-xl font-medium text-[#1F1B16]">Checkout</h2>
            <p className="text-[11px] text-[#6B6459] mt-0.5">
              Secure order placement via ShopSphere API Gateway
            </p>
          </div>
          <button
            onClick={closeCheckout}
            className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded-md hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {completedOrder ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#EBF3ED] text-[#3D6B4C] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 stroke-[2]" />
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#3D6B4C] font-semibold">
                  Order Successfully Placed
                </span>
                <h3 className="font-serif text-2xl text-[#1F1B16] mt-1">
                  Thank you, {completedOrder.customer_name}!
                </h3>
                <p className="text-xs text-[#6B6459] mt-2 max-w-sm mx-auto">
                  Order reference <strong className="text-[#1F1B16]">#{completedOrder.id}</strong> has been created. RabbitMQ events were published to Payment and Notification services.
                </p>
              </div>

              <div className="bg-[#FAF7F2] p-4 rounded-md border border-[#E8E1D6] text-xs text-left max-w-md mx-auto space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Total Charged:</span>
                  <span className="font-medium text-[#1F1B16]">${Number(completedOrder.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Status:</span>
                  <span className="font-medium text-[#3D6B4C]">PENDING &rarr; PAID</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6459]">Receipt Sent To:</span>
                  <span className="text-[#1F1B16]">{completedOrder.customer_email}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={closeCheckout}
                  className="btn-terracotta px-6 py-2.5 text-xs font-medium"
                >
                  View Your Orders
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 bg-[#FDF0ED] border border-[#F3C7BE] rounded-md text-xs text-[#A33A2E] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] mb-2.5">
                  1. Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] mb-2.5">
                  2. Shipping Destination
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">ZIP / Postal</label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Details (Stripe Test Simulation) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459]">
                    3. Payment (Stripe Test Mode)
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#3D6B4C]">
                    <Lock className="w-3 h-3" /> Encrypted Sandbox
                  </span>
                </div>

                <div className="p-3.5 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Card Number</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] font-mono focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Expires</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] font-mono focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] font-mono focus:outline-none focus:border-[#C1440E]"
                      />
                    </div>
                  </div>

                  {/* Architecture Chaos Test Toggle */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateDecline}
                      onChange={(e) => setSimulateDecline(e.target.checked)}
                      className="rounded border-[#E8E1D6] text-[#C1440E] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-[#6B6459]">
                      Simulate test card decline (demonstrates <code className="text-[#C1440E]">payment.failed</code> RabbitMQ routing)
                    </span>
                  </label>
                </div>
              </div>

              {/* Coupon / Promo Engine */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C1440E]" />
                  <span>Promo Code / Coupon</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. ARTISAN15, WELCOME20"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#E8E1D6] rounded-md uppercase font-mono tracking-wider focus:outline-none focus:border-[#C1440E]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 text-xs font-medium bg-[#FAF7F2] border border-[#E8E1D6] rounded-md hover:bg-[#F2ECE3] transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-[#A33A2E] mt-1">{promoError}</p>
                )}
                {appliedPromo && (
                  <div className="mt-2 flex items-center justify-between p-2 bg-[#EBF3ED] border border-[#CDE1D3] rounded-md text-xs text-[#3D6B4C]">
                    <span className="font-mono font-medium">Coupon '{appliedPromo.code}' applied</span>
                    <span>-{(appliedPromo.percent * 100)}% off</span>
                  </div>
                )}
              </div>

              {/* Price Summary Breakdown */}
              <div className="p-3 bg-[#FAF7F2] rounded-md border border-[#E8E1D6] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6B6459]">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-[#3D6B4C] font-medium">
                    <span>Discount ({appliedPromo.code})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#1F1B16] font-medium pt-1.5 border-t border-[#E8E1D6]">
                  <span>Total Amount</span>
                  <span className="font-serif text-sm">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Live Async Progress Indicator */}
              {submitting && (
                <div className="p-3 bg-[#FFF4E5] border border-[#F3D5B5] rounded-md text-xs text-[#C1440E] flex items-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="font-mono">{step}</span>
                </div>
              )}

              {/* Total & Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-terracotta py-3.5 px-4 text-xs font-medium gap-2 shadow-soft"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing transaction...</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order &bull; ${finalTotal.toFixed(2)}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
