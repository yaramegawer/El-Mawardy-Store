import { model, Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true }, // e.g., "vodafone_cash", "shipping", "utilities", etc.
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ["vodafone_cash", "cash", "bank"], default: "cash" },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Expense = model("Expense", expenseSchema);