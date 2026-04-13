import { model, Schema } from "mongoose";

const treasurySchema = new Schema(
  {
    date: { type: Date, default: Date.now, unique: true },
    
    // Daily financial metrics
    dailyRevenue: { type: Number, default: 0 }, // Revenue from orders (excluding shipping)
    dailyCost: { type: Number, default: 0 }, // Cost of goods sold (COGS)
    dailyExpenses: { type: Number, default: 0 }, // Operating expenses
    dailyPurchases: { type: Number, default: 0 }, // Purchase costs (already in COGS)
    dailyDeposits: { type: Number, default: 0 }, // Deposits received
    dailyReturns: { type: Number, default: 0 }, // Returns/refunds processed
    
    // Profit calculations (proper financial logic)
    dailyGrossProfit: { type: Number, default: 0 }, // Revenue - COGS
    dailyOperatingProfit: { type: Number, default: 0 }, // Gross Profit - Operating Expenses
    dailyNetProfit: { type: Number, default: 0 }, // Operating Profit (final net profit)
    dailyTreasury: { type: Number, default: 0 }, // Net Profit (actual cash position)
    
    // Cumulative metrics
    totalRevenue: { type: Number, default: 0 }, // Total revenue to date
    totalCost: { type: Number, default: 0 }, // Total cost of goods sold to date
    totalExpenses: { type: Number, default: 0 }, // Total operating expenses to date
    totalPurchases: { type: Number, default: 0 }, // Total purchases to date
    totalRealizedProfit: { type: Number, default: 0 }, // Total realized profit to date
    totalTreasury: { type: Number, default: 0 }, // Net cash position (assets - liabilities)
    
    // Order counts
    ordersCreated: { type: Number, default: 0 }, // Orders created today
    ordersDelivered: { type: Number, default: 0 }, // Orders delivered today
    ordersCancelled: { type: Number, default: 0 }, // Orders cancelled today
    ordersReturned: { type: Number, default: 0 }, // Orders returned today
    
    // Transaction details for audit
    transactionCount: { type: Number, default: 0 }, // Total transactions today
    lastUpdated: { type: Date, default: Date.now }, // Last update timestamp
  },
  { timestamps: true }
);

// Index for efficient queries
treasurySchema.index({ date: 1 });
treasurySchema.index({ lastUpdated: -1 });

export const Treasury = model("Treasury", treasurySchema);