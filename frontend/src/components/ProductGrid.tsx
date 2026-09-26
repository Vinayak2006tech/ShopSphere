import React, { useState } from 'react';
import { Search, SlidersHorizontal, PackageOpen } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  categories: { name: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: string;
  onSortChange: (sort: string) => void;
  onSelectProduct: (product: Product) => void;
  loading: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  onSelectProduct,
  loading,
}) => {
  return (
    <section id="collection-grid" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Category Pills & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#E8E1D6]">
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => onSelectCategory('All')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-[#1F1B16] text-[#FAF7F2]'
                : 'bg-white text-[#6B6459] border border-[#E8E1D6] hover:border-[#1F1B16]'
            }`}
          >
            All Goods
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                selectedCategory === cat.name
                  ? 'bg-[#1F1B16] text-[#FAF7F2]'
                  : 'bg-white text-[#6B6459] border border-[#E8E1D6] hover:border-[#1F1B16]'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6459]" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] placeholder-[#6B6459] focus:outline-none focus:border-[#C1440E]"
            />
          </div>

          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-white border border-[#E8E1D6] rounded-md text-[#1F1B16] focus:outline-none focus:border-[#C1440E] cursor-pointer"
            >
              <option value="newest">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
            <SlidersHorizontal className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6459] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Layout: Imperfect Curated Grid */}
      {loading ? (
        <div className="py-20 text-center text-[#6B6459]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#C1440E] border-t-transparent mb-3"></div>
          <p className="text-sm font-serif">Curating collection...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center max-w-sm mx-auto">
          <PackageOpen className="w-10 h-10 text-[#6B6459] mx-auto mb-3 stroke-[1.5]" />
          <h3 className="font-serif text-lg text-[#1F1B16]">No matching goods found</h3>
          <p className="text-xs text-[#6B6459] mt-1">Try clearing your search query or choosing another workshop category.</p>
          <button
            onClick={() => {
              onSelectCategory('All');
              onSearchChange('');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-[#C1440E] border border-[#C1440E] rounded-md hover:bg-[#FAF0EB]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
          {products.map((product, index) => {
            // Feature the first product in the list or the explicitly marked featured item as 2x2
            const isFeaturedLarge = index === 0 && !searchQuery && selectedCategory === 'All';
            return (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
                isFeaturedLarge={isFeaturedLarge}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
