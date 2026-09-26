import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  productId: string;
  userId: string;
  userName: string;
  orderId?: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    orderId: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    verifiedPurchase: { type: Boolean, default: true },
    helpfulVotes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
