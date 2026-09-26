import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Plus,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sliders,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';
import { Product } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onProductChanged?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  onProductChanged,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [price, setPrice] = useState('45.00');
  const [category, setCategory] = useState('Home & Living');
  const [stock, setStock] = useState('20');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80'
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=50');
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products);
      }
    } catch (e) {
      console.error('Error fetching admin products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
    }
  }, [isOpen]);

  const handleAdjustStock = async (productId: string, quantityChange: number) => {
    try {
      setUpdatingId(productId);
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: quantityChange,
          reason: 'ADMIN_MANUAL_RESTOCK',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, stock: json.data.currentStock } : p
          )
        );
        onProductChanged?.();
      }
    } catch (e) {
      console.error('Failed to adjust stock', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          category,
          stock: parseInt(stock, 10),
          description,
          images: [imageUrl],
          featured: false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Created "${json.data.name}". Emitted product.created event & invalidated Redis cache.`);
        setShowAddModal(false);
        fetchCatalog();
        onProductChanged?.();
      } else {
        setFeedback(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;
  const inventoryValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-elevated border border-[#E8E1D6] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E1D6] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#1F1B16] text-[#FAF7F2] flex items-center justify-center font-serif text-lg font-medium">
              S
            </div>
            <div>
              <h2 className="font-serif text-xl font-medium text-[#1F1B16] flex items-center gap-2">
                <span>Seller & Catalog Operations</span>
                <span className="text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded bg-[#FFF4E5] text-[#C1440E] font-medium border border-[#F3D5B5]">
                  Role: Admin
                </span>
              </h2>
              <p className="text-xs text-[#6B6459]">
                Live product catalog, Redis cache invalidation, and RabbitMQ stock events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-terracotta px-3.5 py-1.5 text-xs font-medium gap-1.5 shadow-soft"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B6459] hover:text-[#1F1B16] rounded-md hover:bg-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational KPI Metric Banners */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-[#FAF7F2]/60 border-b border-[#E8E1D6] text-xs">
          <div className="p-3 bg-white border border-[#E8E1D6] rounded-md shadow-soft">
            <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Catalog Items</span>
            <span className="font-serif text-xl text-[#1F1B16] font-medium">{products.length}</span>
            <span className="text-[10px] text-[#3D6B4C] block mt-0.5">&bull; MongoDB + Redis Cached</span>
          </div>

          <div className="p-3 bg-white border border-[#E8E1D6] rounded-md shadow-soft">
            <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Total Units in Stock</span>
            <span className="font-serif text-xl text-[#1F1B16] font-medium">{totalStock}</span>
            <span className="text-[10px] text-[#6B6459] block mt-0.5">&bull; Saga reservation enabled</span>
          </div>

          <div className="p-3 bg-white border border-[#E8E1D6] rounded-md shadow-soft">
            <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Low Stock Alerts</span>
            <span className={`font-serif text-xl font-medium ${lowStockCount > 0 ? 'text-[#C1440E]' : 'text-[#3D6B4C]'}`}>
              {lowStockCount} items
            </span>
            <span className="text-[10px] text-[#6B6459] block mt-0.5">&bull; Threshold &le; 5 units</span>
          </div>

          <div className="p-3 bg-white border border-[#E8E1D6] rounded-md shadow-soft">
            <span className="text-[#6B6459] block text-[10px] uppercase tracking-wider">Inventory Value</span>
            <span className="font-serif text-xl text-[#1F1B16] font-medium">${inventoryValue.toLocaleString()}</span>
            <span className="text-[10px] text-[#3D6B4C] block mt-0.5">&bull; Active wholesale value</span>
          </div>
        </div>

        {feedback && (
          <div className="mx-5 mt-4 p-3 bg-[#EBF3ED] border border-[#C5DEC9] text-[#3D6B4C] text-xs rounded-md flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-[#3D6B4C] hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Products Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-base font-medium text-[#1F1B16]">Catalog Inventory & Stock Controls</h3>
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className="text-xs text-[#6B6459] hover:text-[#1F1B16] inline-flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="border border-[#E8E1D6] rounded-md overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#E8E1D6] text-[10px] uppercase tracking-wider text-[#6B6459]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Product</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Price</th>
                  <th className="py-2.5 px-3 font-medium">Rating</th>
                  <th className="py-2.5 px-3 font-medium">Stock</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D6]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-9 h-11 object-cover rounded border border-[#E8E1D6] bg-[#FAF7F2]"
                        />
                        <div>
                          <div className="font-serif font-medium text-[#1F1B16] line-clamp-1">{p.name}</div>
                          <span className="text-[10px] text-[#6B6459] font-mono">ID: {p.id.substring(0, 10)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#6B6459]">{p.category}</td>
                    <td className="py-3 px-3 font-serif font-medium text-[#1F1B16]">${p.price.toFixed(2)}</td>
                    <td className="py-3 px-3 text-[#6B6459]">
                      <span className="text-[#C1440E] font-medium">&starf; {p.rating || 5.0}</span> ({p.reviewsCount || 0})
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          p.stock <= 5
                            ? 'bg-[#FFF4E5] text-[#C1440E] border border-[#F3D5B5]'
                            : 'bg-[#EBF3ED] text-[#3D6B4C]'
                        }`}
                      >
                        {p.stock} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjustStock(p.id, 5)}
                          disabled={updatingId === p.id}
                          className="px-2 py-1 bg-[#FAF7F2] border border-[#E8E1D6] hover:bg-white text-[#1F1B16] text-[11px] rounded font-medium transition-colors"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleAdjustStock(p.id, 10)}
                          disabled={updatingId === p.id}
                          className="px-2 py-1 bg-[#FAF7F2] border border-[#E8E1D6] hover:bg-white text-[#1F1B16] text-[11px] rounded font-medium transition-colors"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleAdjustStock(p.id, -1)}
                          disabled={updatingId === p.id || p.stock === 0}
                          className="px-2 py-1 bg-[#FAF7F2] border border-[#E8E1D6] hover:bg-white text-[#A33A2E] text-[11px] rounded font-medium transition-colors disabled:opacity-50"
                        >
                          -1
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Product Modal Sub-view */}
        {showAddModal && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="bg-white rounded-lg border border-[#E8E1D6] max-w-lg w-full p-6 shadow-elevated animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D6] mb-4">
                <h3 className="font-serif text-lg font-medium text-[#1F1B16]">Add Artisanal Product</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-[#6B6459] hover:text-[#1F1B16]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hand-Turned Walnut Mortar & Pestle"
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                    >
                      <option value="Home & Living">Home & Living</option>
                      <option value="Ceramics & Tableware">Ceramics & Tableware</option>
                      <option value="Leather Goods">Leather Goods</option>
                      <option value="Coffee & Tea">Coffee & Tea</option>
                      <option value="Stationery & Study">Stationery & Study</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Initial Stock</label>
                    <input
                      type="number"
                      required
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Description</label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Artisanal narrative, material sourcing, craftsmanship details..."
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#1F1B16] mb-1">Image URL</label>
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E8E1D6] rounded-md focus:outline-none focus:border-[#C1440E]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-terracotta px-4 py-2 text-xs"
                  >
                    {submitting ? 'Publishing...' : 'Publish to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
