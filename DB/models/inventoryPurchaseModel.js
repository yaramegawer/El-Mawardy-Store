import { model, Schema } from "mongoose";

const inventoryPurchaseSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    supplier: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "vodafone_cash", "bank"],
      default: "cash",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

inventoryPurchaseSchema.index({ date: -1 });

export const InventoryPurchase = model("InventoryPurchase", inventoryPurchaseSchema);
