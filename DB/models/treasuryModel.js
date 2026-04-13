import { model, Schema } from "mongoose";

const treasurySchema = new Schema(
  {
    date: { type: Date, default: Date.now, unique: true },
    
    // Daily financial metrics
    dailyRevenue: { type: Number, default: 0 }, // Revenue from orders (excluding shipping)
    dailyShipping: { type: Number, default: 0 }, // Shipping fees collected
    dailyCost: { type: Number, default: 0 }, // Cost of goods sold
    dailyExpenses: { type: Number, default: 0 }, // Operating expenses
    dailyPurchases: { type: Number, default: 0 }, // Purchase costs
    dailyDeposits: { type: Number, default: 0 }, // Deposits received
    dailyReturns: { type: Number, default: 0 }, // Returns/refunds processed
    
    // Profit calculations
    dailyEstimatedProfit: { type: Number, default: 0 }, // Estimated profit from orders
    dailyRealizedProfit: { type: Number, default: 0 }, // Profit from delivered orders
    dailyNetProfit: { type: Number, default: 0 }, // Net profit after expenses
    dailyTreasury: { type: Number, default: 0 }, // Daily treasury balance
    
    // Cumulative metrics
    totalRevenue: { type: Number, default: 0 }, // Total revenue to date
    totalCost: { type: Number, default: 0 }, // Total cost to date
    totalExpenses: { type: Number, default: 0 }, // Total expenses to date
    totalPurchases: { type: Number, default: 0 }, // Total purchases to date
    totalRealizedProfit: { type: Number, default: 0 }, // Total realized profit
    totalTreasury: { type: Number, default: 0 }, // Total treasury balance
    
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