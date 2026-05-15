import { model, Schema } from "mongoose";

const financeSettingsSchema = new Schema(
  {
    key: { type: String, default: "global", unique: true },
    cashBaseline: { type: Number, default: 0 },
    cashBaselineAt: { type: Date, default: null },
    capitalMoney: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const FinanceSettings = model("FinanceSettings", financeSettingsSchema);
