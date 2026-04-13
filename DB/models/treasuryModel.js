import { model, Schema } from "mongoose";

const treasurySchema = new Schema(
  {
    date: { type: Date, default: Date.now, unique: true },
    dailyTreasury: { type: Number, default: 0 }, // Today's profits, resets daily
    totalTreasury: { type: Number, default: 0 }, // All accumulated profits
    expensesDeducted: { type: Number, default: 0 }, // Expenses deducted today
  },
  { timestamps: true }
);

export const Treasury = model("Treasury", treasurySchema);