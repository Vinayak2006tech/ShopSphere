import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientEmail: string;
  subject: string;
  eventType: string;
  orderId?: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  previewUrl?: string;
  htmlContent: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientEmail: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    orderId: { type: String, index: true },
    status: { type: String, enum: ['SENT', 'SIMULATED', 'FAILED'], default: 'SENT' },
    previewUrl: { type: String },
    htmlContent: { type: String, required: true },
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

export const NotificationLog = mongoose.model<INotification>('NotificationLog', NotificationSchema);
