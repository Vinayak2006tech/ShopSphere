import React from 'react';
import { ArrowDownRight } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { SplitText, GradientText, SpotlightCard } from './reactbits';

interface HeroProps {
  featuredProduct?: Product;
  onExplore: () => void;
}

export const Hero: React.FC<HeroProps> = ({ featuredProduct, onExplore }) => {
  const { addItem } = useCart();

  return (
    <section className="relative overflow-hidden pt-8 pb-14 sm:pb-20 border-b border-[#E8E1D6]/80 bg-transparent">
      {/* Light subtle warm pattern */}
      <div className="absolute inset-0 opacity-[0.2] bg-[radial-gradient(#D6CCC2_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Magazine Text Offset Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* React Bits GradientText badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/90 backdrop-blur-md border border-[#E8E1D6] rounded-full text-xs font-medium text-[#6B6459] shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C1440E] animate-pulse"></span>
              <GradientText
                colors={['#C1440E', '#D97706', '#9A3412', '#C1440E']}
                animationSpeed={4}
                showBorder={false}
                className="font-medium text-xs tracking-wide"
              >
                Autumn Issue • Studio Edition No. 04
              </GradientText>
            </div>

            {/* React Bits SplitText animated typography */}
            <div className="space-y-1">
              <SplitText
                text="Objects shaped with intent,"
                tag="h1"
                className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1F1B16] font-normal leading-[1.12] tracking-tight block"
                delay={40}
                duration={0.8}
                ease="power3.out"
                splitType="words, chars"
                textAlign="left"
                from={{ opacity: 0, y: 35 }}
                to={{ opacity: 1, y: 0 }}
              />
              <span className="block font-serif text-4xl sm:text-5xl lg:text-6xl text-[#C1440E] font-light italic leading-[1.12] tracking-tight">
                built for a lifetime of use.
              </span>
            </div>

            <p className="text-[#6B6459] text-base sm:text-lg max-w-xl leading-relaxed font-sans font-normal">
              A curated catalog of utilitarian ceramics, hand-cut Tuscan leathers, and milled brass essentials. Connected via independent event-driven microservices.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={onExplore}
                className="btn-terracotta px-6 py-3 text-sm gap-2"
              >
                <span>Explore the collection</span>
                <ArrowDownRight className="w-4 h-4" />
              </button>

              {featuredProduct && (
                <button
                  onClick={() => addItem(featuredProduct)}
                  className="btn-secondary px-5 py-3 text-sm gap-2 bg-white/80 backdrop-blur-sm"
                >
                  <span>Quick add: {featuredProduct.name.split(' ')[0]} Pourer</span>
                  <span className="text-[#6B6459] font-medium">${featuredProduct.price}</span>
                </button>
              )}
            </div>

          </div>

          {/* Large Magazine-bleed visual with React Bits SpotlightCard (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Asymmetric Offset Decorative Card */}
              <div className="absolute -top-4 -right-4 w-full h-full bg-[#E8E1D6]/40 rounded-lg transform rotate-1 hidden sm:block"></div>
              
              <SpotlightCard
                spotlightColor="rgba(193, 68, 14, 0.16)"
                className="relative card-soft overflow-hidden border border-[#E8E1D6] group"
              >
                <div className="aspect-4/5 overflow-hidden bg-[#FAF7F2]">
                  <img
                    src={
                      featuredProduct?.images?.[0] ||
                      'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1000&q=80'
                    }
                    alt={featuredProduct?.name || 'Artisanal Pourer'}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>

                {/* Editorial Caption Tag */}
                <div className="p-4 bg-white/95 backdrop-blur-sm border-t border-[#E8E1D6]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#C1440E] font-medium">
                        {featuredProduct?.editorialTag || 'Curator’s Choice'}
                      </span>
                      <h4 className="font-serif text-base font-medium text-[#1F1B16]">
                        {featuredProduct?.name || 'Terracotta Hand-Thrown Pourer'}
                      </h4>
                    </div>
                    <span className="font-serif text-lg text-[#1F1B16]">
                      ${featuredProduct?.price || 68}
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

