import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, ShieldCheck, Truck, Star, Sparkles, MessageSquare } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BASE_URL } from '../api';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

interface Review {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Python Recommendations State
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (!product) return;
    setSelectedImage(0);
    setQuantity(1);

    // Fetch reviews
    fetch(`${BASE_URL}/api/reviews/product/${product.id}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Review[]) => setReviews(data))
      .catch(() => setReviews([]));

    // Fetch Python recommendation engine results
    fetch(`${BASE_URL}/api/recommendations/product/${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data?.recommendations) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(() => setRecommendations([]));
  }, [product]);

  if (!product) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          userId: user?.id || 'guest',
          userName: user?.name || 'Artisan Collector',
          rating: newRating,
          comment: newComment,
        }),
      });
      if (res.ok) {
        const review = await res.json();
        setReviews((prev) => [review, ...prev]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post review', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-elevated border border-[#E8E1D6] overflow-hidden max-h-[90vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-[#6B6459] hover:text-[#1F1B16] border border-[#E8E1D6]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Product Media (Left column) */}
        <div className="md:w-1/2 bg-[#FAF7F2] p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E8E1D6]">
          <div className="aspect-4/5 rounded-md overflow-hidden border border-[#E8E1D6] bg-white">
            <img
              src={product.images[selectedImage] || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-14 h-16 rounded border overflow-hidden flex-shrink-0 transition-all ${
                    selectedImage === idx ? 'border-[#C1440E] ring-1 ring-[#C1440E]' : 'border-[#E8E1D6] opacity-70'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information (Right column) */}
        <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C1440E]">
                  {product.category}
                </span>
                {/* Aggregate Star Rating */}
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-[#1F1B16]">{product.rating ? product.rating.toFixed(1) : '4.8'}</span>
                  <span className="text-[#6B6459]">({reviews.length} reviews)</span>
                </div>
              </div>
              <h2 className="font-serif text-2xl text-[#1F1B16] font-medium mt-1">
                {product.name}
              </h2>
              <div className="font-serif text-2xl text-[#1F1B16] mt-2">
                ${Number(product.price).toFixed(2)}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#6B6459] leading-relaxed font-sans">
              {product.description}
            </p>

            {/* Inventory status */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-[#3D6B4C]' : 'bg-[#A33A2E]'}`}></span>
              <span className="text-[#1F1B16] font-medium">
                {product.stock > 0 ? `${product.stock} units currently in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Specifications Table (Polymorphic attributes from MongoDB) */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="pt-3 border-t border-[#E8E1D6]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] mb-2">
                  Workshop Specifications
                </h4>
                <div className="bg-[#FAF7F2] rounded-md p-3 text-xs space-y-1.5 border border-[#E8E1D6]">
                  {Object.entries(product.attributes).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-[#6B6459]">{k}</span>
                      <span className="text-[#1F1B16] font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Python Recommendation Engine ("Frequently Bought Together") */}
            {recommendations.length > 0 && (
              <div className="pt-3 border-t border-[#E8E1D6]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Frequently Bought Together (Co-Purchase ML)</span>
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recommendations.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E8E1D6] rounded text-[11px] font-mono text-[#1F1B16] flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3D6B4C]"></span>
                      <span>Item #{rec.productId.substring(0, 8)}...</span>
                      <span className="text-[#6B6459]">({rec.score} co-orders)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Reviews & Feedback Section */}
            <div className="pt-3 border-t border-[#E8E1D6] space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B6459] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#C1440E]" />
                  Verified Reviews ({reviews.length})
                </span>
                <span className="text-[10px] lowercase text-[#6B6459]">Review Microservice (:5008)</span>
              </h4>

              {/* Submit review */}
              <form onSubmit={handleReviewSubmit} className="space-y-2 bg-[#FAF7F2] p-2.5 rounded-md border border-[#E8E1D6]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#1F1B16]">Rate this craft:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-3.5 h-3.5 ${star <= newRating ? 'fill-amber-400' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Share your experience with this item..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#E8E1D6] rounded text-[#1F1B16] focus:outline-none focus:border-[#C1440E]"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-2.5 py-1 text-[11px] font-medium bg-[#C1440E] text-white rounded hover:bg-[#A33A2E] disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {reviews.length === 0 ? (
                  <p className="text-[11px] text-[#6B6459] italic py-1">No reviews yet. Be the first to share your thoughts!</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev._id} className="p-2 bg-white rounded border border-[#E8E1D6] text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#1F1B16] text-[11px]">{rev.userName}</span>
                        <div className="flex">
                          {[...Array(rev.rating)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[#6B6459] text-[11px]">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-[#E8E1D6] space-y-3 mt-6">
            <div className="flex items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center border border-[#E8E1D6] rounded-[6px] bg-[#FAF7F2]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2 text-[#6B6459] hover:text-[#1F1B16]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-xs font-medium text-[#1F1B16]">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="p-2 text-[#6B6459] hover:text-[#1F1B16]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAdd}
                disabled={product.stock === 0}
                className={`flex-1 py-3 px-4 text-xs font-medium rounded-[6px] gap-2 ${
                  added ? 'bg-[#3D6B4C] text-white' : 'btn-terracotta'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to bag</span>
                  </>
                ) : (
                  <span>Add to bag &bull; ${(Number(product.price) * quantity).toFixed(2)}</span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#6B6459] pt-1">
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#3D6B4C]" />
                Insured carbon-neutral shipping
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3D6B4C]" />
                Lifetime craftsmanship guarantee
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
