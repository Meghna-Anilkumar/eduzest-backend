import { model, Schema, Types, Document } from 'mongoose';

export interface IOffer extends Document {
  discountPercentage: number;
  expirationDate: Date;
  categoryId: Types.ObjectId;
}

const offerSchema = new Schema<IOffer>({
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
});

export const Offer = model<IOffer>('Offer', offerSchema);