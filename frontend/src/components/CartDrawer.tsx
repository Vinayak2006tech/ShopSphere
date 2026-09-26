import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const CartDrawer: React.FC = () => {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, subtotal, openCheckout } = useCart();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#E8E1D6] shadow-elevated flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#FAF7F2]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#C1440E]" />
              <h2 className="font-serif text-xl font-medium text-[#1F1B16]">Your Bag</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded-md hover:bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Item List / Empty state */}
          <div className="p-5 overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#E8E1D6] flex items-center justify-center mx-auto text-[#6B6459]">
                  <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-lg text-[#1F1B16]">Cart's feeling light...</h3>
                <p className="text-xs text-[#6B6459] max-w-xs mx-auto">
                  Explore our small-batch ceramics, studio goods, and heirloom leather accessories.
                </p>
                <button
                  onClick={closeDrawer}
                  className="btn-secondary px-4 py-2 text-xs font-medium mt-2"
                >
                  Continue browsing
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex gap-4 p-3 bg-[#FAF7F2] rounded-md border border-[#E8E1D6]"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-16 h-20 object-cover rounded border border-[#E8E1D6] bg-white flex-shrink-0"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif text-sm font-medium text-[#1F1B16] line-clamp-1">
                            {product.name}
                          </h4>
                          <button
                            onClick={() => removeItem(product.id)}
                            className="text-[#6B6459] hover:text-[#A33A2E] p-1 -mr-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[11px] text-[#6B6459] block mt-0.5">{product.category}</span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity control */}
                        <div className="flex items-center border border-[#E8E1D6] rounded bg-white">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="px-2 py-0.5 text-xs text-[#6B6459] hover:text-[#1F1B16]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-medium">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="px-2 py-0.5 text-xs text-[#6B6459] hover:text-[#1F1B16]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-serif text-sm text-[#1F1B16]">
                          ${(Number(product.price) * quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 border-t border-[#E8E1D6] bg-[#FAF7F2] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6B6459]">
                  <span>Subtotal</span>
                  <span className="text-[#1F1B16] font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6B6459]">
                  <span>Insured shipping</span>
                  <span className="text-[#3D6B4C] font-medium">Free</span>
                </div>
                <div className="flex justify-between text-sm font-serif font-medium text-[#1F1B16] pt-2 border-t border-[#E8E1D6]">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={openCheckout}
                className="w-full btn-terracotta py-3 px-4 text-xs font-medium gap-2 shadow-soft"
              >
                <span>Proceed to checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
