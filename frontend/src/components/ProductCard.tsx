import React from 'react';
import { Plus, Eye, Check } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { SpotlightCard } from './reactbits';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isFeaturedLarge?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, isFeaturedLarge }) => {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);

  const existingInCart = items.find((i) => i.product.id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <SpotlightCard
      onClick={() => onSelect(product)}
      spotlightColor="rgba(193, 68, 14, 0.12)"
      className={`group card-soft border border-[#E8E1D6] overflow-hidden cursor-pointer flex flex-col justify-between transition-all ${
        isFeaturedLarge ? 'md:col-span-2 md:row-span-2' : ''
      }`}
    >
      <div>
        {/* Product Image: 4:5 Aspect Ratio */}
        <div
          className={`relative overflow-hidden bg-[#FAF7F2] ${
            isFeaturedLarge ? 'aspect-4/5 md:aspect-square lg:aspect-4/5' : 'aspect-4/5'
          }`}
        >
          <img
            src={product.images[0] || 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1000&q=80'}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Editorial Badge or Category */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {product.editorialTag && (
              <span className="bg-[#1F1B16] text-[#FAF7F2] text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shadow-sm">
                {product.editorialTag}
              </span>
            )}
            <span className="bg-white/90 backdrop-blur-sm text-[#6B6459] text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded shadow-soft">
              {product.category}
            </span>
          </div>

          {/* Quick view hover icon */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md shadow-soft inline-flex text-[#1F1B16] hover:text-[#C1440E]">
              <Eye className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Low Stock Badge */}
          {product.stock <= 5 && product.stock > 0 && (
            <div className="absolute bottom-3 left-3">
              <span className="bg-[#FFF4E5] text-[#C1440E] border border-[#F3D5B5] text-[10px] font-medium px-2 py-0.5 rounded">
                Only {product.stock} remaining
              </span>
            </div>
          )}
        </div>

        {/* Content details */}
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-base sm:text-lg font-medium text-[#1F1B16] group-hover:text-[#C1440E] transition-colors line-clamp-1">
              {product.name}
            </h3>
            <span className="font-serif text-base sm:text-lg text-[#1F1B16] whitespace-nowrap">
              ${Number(product.price).toFixed(2)}
            </span>
          </div>

          <p className="mt-1.5 text-xs sm:text-sm text-[#6B6459] line-clamp-2 font-normal leading-relaxed">
            {product.description}
          </p>

          {isFeaturedLarge && product.attributes && (
            <div className="mt-3 pt-3 border-t border-[#E8E1D6] grid grid-cols-2 gap-2 text-xs text-[#6B6459]">
              {Object.entries(product.attributes).slice(0, 2).map(([key, val]) => (
                <div key={key}>
                  <span className="font-medium text-[#1F1B16]">{key}: </span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 pt-0">
        <button
          onClick={handleAdd}
          disabled={product.stock === 0}
          className={`w-full py-2.5 px-4 text-xs font-medium rounded-[6px] transition-all flex items-center justify-center gap-1.5 ${
            justAdded
              ? 'bg-[#3D6B4C] text-white'
              : product.stock === 0
              ? 'bg-[#E8E1D6] text-[#6B6459] cursor-not-allowed'
              : 'btn-terracotta'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added to bag</span>
            </>
          ) : product.stock === 0 ? (
            <span>Sold out</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add to bag</span>
            </>
          )}
        </button>
      </div>
    </SpotlightCard>
  );
};
