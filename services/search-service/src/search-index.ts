import { logger } from './logger';

export interface IndexedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  featured?: boolean;
  editorialTag?: string;
  rating?: number;
  reviewsCount?: number;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price-asc' | 'price-desc' | 'rating';
  limit?: number;
  offset?: number;
}

export interface SearchFacets {
  categories: Record<string, number>;
  inStockCount: number;
  outOfStockCount: number;
  priceRanges: {
    under50: number;
    from50to100: number;
    over100: number;
  };
}

export interface SearchResult {
  hits: IndexedProduct[];
  total: number;
  facets: SearchFacets;
  processingTimeMs: number;
  suggestedQuery?: string;
}

// Levenshtein distance helper
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export class SearchIndex {
  private products: Map<string, IndexedProduct> = new Map();
  private terms: Set<string> = new Set();

  public indexProduct(product: IndexedProduct) {
    this.products.set(product.id, product);
    // Index keywords for suggestions
    const tokens = `${product.name} ${product.category}`.toLowerCase().split(/[^a-z0-9]+/);
    tokens.forEach((t) => {
      if (t.length > 2) this.terms.add(t);
    });
  }

  public removeProduct(id: string) {
    this.products.delete(id);
  }

  public updateStock(productId: string, newStock: number) {
    const p = this.products.get(productId);
    if (p) {
      p.stock = newStock;
    }
  }

  public getCount(): number {
    return this.products.size;
  }

  public getSuggestions(prefix: string, max: number = 6): string[] {
    const clean = prefix.trim().toLowerCase();
    if (!clean) return [];

    const matches: { term: string; score: number }[] = [];
    for (const term of this.terms) {
      if (term.startsWith(clean)) {
        matches.push({ term, score: 10 - term.length });
      } else {
        const dist = levenshteinDistance(clean, term.slice(0, clean.length));
        if (dist <= 1 && clean.length > 3) {
          matches.push({ term, score: 5 - dist });
        }
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((m) => m.term);
  }

  public search(filters: SearchFilters): SearchResult {
    const startTime = performance.now();
    const {
      query = '',
      category,
      minPrice,
      maxPrice,
      inStock,
      sort = 'relevance',
      limit = 20,
      offset = 0,
    } = filters;

    const queryTokens = query
      .toLowerCase()
      .trim()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0);

    const scoredHits: { product: IndexedProduct; score: number }[] = [];

    // Facet counters
    const facets: SearchFacets = {
      categories: {},
      inStockCount: 0,
      outOfStockCount: 0,
      priceRanges: { under50: 0, from50to100: 0, over100: 0 },
    };

    for (const product of this.products.values()) {
      // Collect facet metrics
      facets.categories[product.category] = (facets.categories[product.category] || 0) + 1;
      if (product.stock > 0) facets.inStockCount++;
      else facets.outOfStockCount++;

      if (product.price < 50) facets.priceRanges.under50++;
      else if (product.price <= 100) facets.priceRanges.from50to100++;
      else facets.priceRanges.over100++;

      // Filter: Category
      if (category && category !== 'All' && product.category.toLowerCase() !== category.toLowerCase()) {
        continue;
      }

      // Filter: Price Range
      if (minPrice !== undefined && product.price < minPrice) continue;
      if (maxPrice !== undefined && product.price > maxPrice) continue;

      // Filter: In Stock
      if (inStock === true && product.stock <= 0) continue;

      // Score query matches with Typo Tolerance
      let score = 0;
      if (queryTokens.length === 0) {
        score = 1; // Return all if no search query provided
      } else {
        const nameTokens = product.name.toLowerCase().split(/[^a-z0-9]+/);
        const descTokens = product.description.toLowerCase().split(/[^a-z0-9]+/);
        const catTokens = product.category.toLowerCase().split(/[^a-z0-9]+/);

        for (const qToken of queryTokens) {
          // 1. Exact match in name (weight 10)
          if (product.name.toLowerCase().includes(qToken)) score += 10;
          // 2. Exact match in category (weight 6)
          if (product.category.toLowerCase().includes(qToken)) score += 6;
          // 3. Exact match in description (weight 2)
          if (product.description.toLowerCase().includes(qToken)) score += 2;

          // 4. Fuzzy Levenshtein match in name tokens (distance <= 1 or 2)
          for (const nToken of nameTokens) {
            if (nToken.length >= 4 && qToken.length >= 4) {
              const dist = levenshteinDistance(qToken, nToken);
              if (dist === 1) score += 6; // Minor typo match
              else if (dist === 2 && qToken.length >= 6) score += 3;
            }
          }
        }
      }

      if (score > 0) {
        scoredHits.push({ product, score });
      }
    }

    // Sort hits
    if (sort === 'price-asc') {
      scoredHits.sort((a, b) => a.product.price - b.product.price);
    } else if (sort === 'price-desc') {
      scoredHits.sort((a, b) => b.product.price - a.product.price);
    } else if (sort === 'rating') {
      scoredHits.sort((a, b) => (b.product.rating || 0) - (a.product.rating || 0));
    } else {
      // Relevance sort
      scoredHits.sort((a, b) => b.score - a.score);
    }

    const total = scoredHits.length;
    const paginated = scoredHits.slice(offset, offset + limit).map((h) => h.product);

    const processingTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      hits: paginated,
      total,
      facets,
      processingTimeMs,
    };
  }
}

export const globalSearchIndex = new SearchIndex();
