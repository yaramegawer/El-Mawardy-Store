import { model, Schema } from "mongoose";

const expenseSchema = new Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { 
    type: String, 
    required: true,
    enum: [
      "rent",           // Store/office rent
      "utilities",      // Electricity, water, internet
      "marketing",      // Advertising and promotions
      "salaries",       // Employee wages
      "supplies",       // Office supplies, materials
      "maintenance",    // Equipment maintenance
      "shipping",       // Shipping costs
      "ads",            // Advertising fees
      "vodafone_cash",  // Vodafone Cash transaction fees
      "other_operating" // Other operational expenses
    ]
  },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ["vodafone_cash", "cash", "bank"], default: "cash" },
  notes: { type: String },
},
{ timestamps: true }
);

export const Expense = model("Expense", expenseSchema);