import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  name: string;
  sku: string;
  price?: number;
  stock: number;
  options: Map<string, string>;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  featured: boolean;
  editorialTag?: string;
  attributes: Map<string, string>;
  variants: IProductVariant[];
  rating: number;
  reviewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number },
  stock: { type: Number, required: true, default: 0 },
  options: { type: Map, of: String, default: {} },
});

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    editorialTag: { type: String },
    attributes: { type: Map, of: String, default: {} },
    variants: [ProductVariantSchema],
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 24 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Search text index
ProductSchema.index({ name: 'text', description: 'text', category: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
