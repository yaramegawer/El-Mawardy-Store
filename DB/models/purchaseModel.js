import { model, Schema, Types } from "mongoose";

const purchaseSchema = new Schema(
  {
    supplier: { type: String, required: true },
    products: [
      {
        productId: { type: Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        costPrice: { type: Number, required: true },
        totalCost: { type: Number, required: true }, // quantity * costPrice
      },
    ],
    totalCost: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ["cash", "vodafone_cash", "bank"], default: "cash" },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Purchase = model("Purchase", purchaseSchema);