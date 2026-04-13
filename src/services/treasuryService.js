import { Treasury } from "../../DB/models/treasuryModel.js";
import { Order } from "../../DB/models/orderModel.js";
import { Expense } from "../../DB/models/expenseModel.js";
import { Purchase } from "../../DB/models/purchaseModel.js";

class TreasuryService {
  /**
   * Get or create treasury record for a specific date
   */
  static async getOrCreateTreasury(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    let treasury = await Treasury.findOne({ date: startOfDay });
    
    if (!treasury) {
      // Get previous day's treasury for cumulative totals
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      const previousTreasury = await Treasury.findOne({ date: yesterday });
      
      treasury = await Treasury.create({
        date: startOfDay,
        totalRevenue: previousTreasury?.totalRevenue || 0,
        totalCost: previousTreasury?.totalCost || 0,
        totalExpenses: previousTreasury?.totalExpenses || 0,
        totalPurchases: previousTreasury?.totalPurchases || 0,
        totalRealizedProfit: previousTreasury?.totalRealizedProfit || 0,
        totalTreasury: previousTreasury?.totalTreasury || 0,
      });
    }
    
    return treasury;
  }

  /**
   * Update treasury with order data
   */
  static async updateTreasuryWithOrder(order, previousStatus = null) {
    const treasury = await this.getOrCreateTreasury(order.orderDate || new Date());
    
    // If order was just created
    if (!previousStatus) {
      treasury.ordersCreated += 1;
      treasury.transactionCount += 1;
      
      if (order.depositConfirmed) {
        treasury.dailyDeposits += order.depositAmount || 0;
      }
    }
    
    // Handle status changes
    if (order.status === "delivered" && previousStatus !== "delivered") {
      treasury.ordersDelivered += 1;
      treasury.dailyRevenue += order.priceWithoutShipping || 0;
      treasury.dailyShipping += order.shippingCost || 0;
      treasury.dailyCost += order.totalCost || 0;
      treasury.dailyRealizedProfit += order.realizedProfit || 0;
      treasury.transactionCount += 1;
    }
    
    if (order.status === "cancelled" && previousStatus !== "cancelled") {
      treasury.ordersCancelled += 1;
      treasury.transactionCount += 1;
    }
    
    if (order.status === "returned" && previousStatus !== "returned") {
      treasury.ordersReturned += 1;
      treasury.dailyReturns += order.returnAmount || 0;
      treasury.transactionCount += 1;
    }
    
    // Recalculate totals
    await this.recalculateTreasuryTotals(treasury);
    await treasury.save();
    
    return treasury;
  }

  /**
   * Update treasury with expense data
   */
  static async updateTreasuryWithExpense(expense) {
    const treasury = await this.getOrCreateTreasury(expense.date || new Date());
    
    treasury.dailyExpenses += expense.amount;
    treasury.transactionCount += 1;
    
    // Recalculate totals
    await this.recalculateTreasuryTotals(treasury);
    await treasury.save();
    
    return treasury;
  }

  /**
   * Update treasury with purchase data
   */
  static async updateTreasuryWithPurchase(purchase) {
    const treasury = await this.getOrCreateTreasury(purchase.date || new Date());
    
    treasury.dailyPurchases += purchase.totalCost;
    treasury.transactionCount += 1;
    
    // Recalculate totals
    await this.recalculateTreasuryTotals(treasury);
    await treasury.save();
    
    return treasury;
  }

  /**
   * Recalculate all treasury totals using proper financial logic
   */
  static async recalculateTreasuryTotals(treasury) {
    // Proper Financial Logic: Net Profit = Revenue - COGS - Operating Expenses
    // Daily Treasury tracks actual cash position and cash flow
    
    // Gross Profit = Revenue - Cost of Goods Sold (COGS)
    treasury.dailyGrossProfit = treasury.dailyRevenue - treasury.dailyCost;
    
    // Operating Profit = Gross Profit - Operating Expenses
    treasury.dailyOperatingProfit = treasury.dailyGrossProfit - treasury.dailyExpenses;
    
    // Net Profit = Operating Profit (purchases are already included in COGS)
    treasury.dailyNetProfit = treasury.dailyOperatingProfit;
    
    // Daily Treasury = Net Profit (actual cash position for the day)
    treasury.dailyTreasury = treasury.dailyNetProfit;
    
    // Update cumulative totals
    const yesterday = new Date(treasury.date);
    yesterday.setDate(yesterday.getDate() - 1);
    const previousTreasury = await Treasury.findOne({ date: yesterday });
    
    if (previousTreasury) {
      treasury.totalRevenue = previousTreasury.totalRevenue + treasury.dailyRevenue;
      treasury.totalCost = previousTreasury.totalCost + treasury.dailyCost;
      treasury.totalExpenses = previousTreasury.totalExpenses + treasury.dailyExpenses;
      treasury.totalPurchases = previousTreasury.totalPurchases + treasury.dailyPurchases;
      treasury.totalRealizedProfit = previousTreasury.totalRealizedProfit + treasury.dailyRealizedProfit;
      treasury.totalTreasury = previousTreasury.totalTreasury + treasury.dailyTreasury;
    } else {
      // First day - use daily values as totals
      treasury.totalRevenue = treasury.dailyRevenue;
      treasury.totalCost = treasury.dailyCost;
      treasury.totalExpenses = treasury.dailyExpenses;
      treasury.totalPurchases = treasury.dailyPurchases;
      treasury.totalRealizedProfit = treasury.dailyRealizedProfit;
      treasury.totalTreasury = treasury.dailyTreasury;
    }
    
    treasury.lastUpdated = new Date();
  }

  /**
   * Get treasury summary for a date range
   */
  static async getTreasurySummary(startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const treasuryRecords = await Treasury.find(filter).sort({ date: -1 });
    
    if (treasuryRecords.length === 0) {
      return {
        daily: null,
        totals: {
          totalRevenue: 0,
          totalCost: 0,
          totalExpenses: 0,
          totalPurchases: 0,
          totalRealizedProfit: 0,
          totalTreasury: 0,
        },
        summary: {
          ordersCreated: 0,
          ordersDelivered: 0,
          ordersCancelled: 0,
          ordersReturned: 0,
          transactionCount: 0,
        }
      };
    }

    const latest = treasuryRecords[0]; // Most recent record
    const oldest = treasuryRecords[treasuryRecords.length - 1]; // Oldest record
    
    // Calculate totals for the period
    const periodTotals = treasuryRecords.reduce((acc, record) => {
      return {
        totalRevenue: acc.totalRevenue + record.dailyRevenue,
        totalCost: acc.totalCost + record.dailyCost,
        totalExpenses: acc.totalExpenses + record.dailyExpenses,
        totalPurchases: acc.totalPurchases + record.dailyPurchases,
        totalRealizedProfit: acc.totalRealizedProfit + record.dailyRealizedProfit,
        totalTreasury: acc.totalTreasury + record.dailyTreasury,
        ordersCreated: acc.ordersCreated + record.ordersCreated,
        ordersDelivered: acc.ordersDelivered + record.ordersDelivered,
        ordersCancelled: acc.ordersCancelled + record.ordersCancelled,
        ordersReturned: acc.ordersReturned + record.ordersReturned,
        transactionCount: acc.transactionCount + record.transactionCount,
      };
    }, {
      totalRevenue: 0,
      totalCost: 0,
      totalExpenses: 0,
      totalPurchases: 0,
      totalRealizedProfit: 0,
      totalTreasury: 0,
      ordersCreated: 0,
      ordersDelivered: 0,
      ordersCancelled: 0,
      ordersReturned: 0,
      transactionCount: 0,
    });

    return {
      daily: latest,
      totals: latest, // Current cumulative totals
      summary: periodTotals,
      records: treasuryRecords,
    };
  }

  /**
   * Rebuild treasury from scratch (for data recovery)
   */
  static async rebuildTreasury(startDate, endDate) {
    console.log('Starting treasury rebuild...');
    
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Clear existing treasury records in the range
    await Treasury.deleteMany({
      date: { $gte: start, $lte: end }
    });
    
    // Get all orders, expenses, and purchases in the range
    const [orders, expenses, purchases] = await Promise.all([
      Order.find({
        orderDate: { $gte: start, $lte: end }
      }),
      Expense.find({
        date: { $gte: start, $lte: end }
      }),
      Purchase.find({
        date: { $gte: start, $lte: end }
      })
    ]);
    
    // Group by date
    const groupedByDate = {};
    
    // Process orders with proper financial calculations
    orders.forEach(order => {
      const date = new Date(order.orderDate);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString();
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          ordersCreated: 0,
          ordersDelivered: 0,
          ordersCancelled: 0,
          ordersReturned: 0,
          dailyRevenue: 0,
          dailyCost: 0, // COGS
          dailyExpenses: 0, // Operating expenses
          dailyDeposits: 0,
          dailyReturns: 0,
          dailyRealizedProfit: 0,
          dailyGrossProfit: 0,
          dailyOperatingProfit: 0,
          dailyNetProfit: 0,
          dailyTreasury: 0,
          transactionCount: 0,
        };
      }
      
      const day = groupedByDate[dateKey];
      day.ordersCreated += 1;
      day.transactionCount += 1;
      
      if (order.status === "delivered") {
        day.ordersDelivered += 1;
        day.dailyRevenue += order.priceWithoutShipping || 0;
        day.dailyCost += order.totalCost || 0; // COGS
        day.dailyRealizedProfit += order.realizedProfit || 0;
        
        // Calculate profit metrics
        day.dailyGrossProfit = day.dailyRevenue - day.dailyCost;
        day.dailyOperatingProfit = day.dailyGrossProfit - day.dailyExpenses;
        day.dailyNetProfit = day.dailyOperatingProfit; // Final net profit
        day.dailyTreasury = day.dailyNetProfit; // Cash position
      }
      
      if (order.status === "cancelled") {
        day.ordersCancelled += 1;
      }
      
      if (order.status === "returned") {
        day.ordersReturned += 1;
        day.dailyReturns += order.returnAmount || 0;
      }
      
      if (order.depositConfirmed) {
        day.dailyDeposits += order.depositAmount || 0;
      }
    });
    
    // Process expenses (operating expenses)
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString();
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          ordersCreated: 0,
          ordersDelivered: 0,
          ordersCancelled: 0,
          ordersReturned: 0,
          dailyRevenue: 0,
          dailyCost: 0, // COGS
          dailyExpenses: 0, // Operating expenses
          dailyDeposits: 0,
          dailyReturns: 0,
          dailyRealizedProfit: 0,
          dailyGrossProfit: 0,
          dailyOperatingProfit: 0,
          dailyNetProfit: 0,
          dailyTreasury: 0,
          transactionCount: 0,
        };
      }
      
      groupedByDate[dateKey].dailyExpenses += expense.amount;
      groupedByDate[dateKey].transactionCount += 1;
    });
    
    // Process purchases
    purchases.forEach(purchase => {
      const date = new Date(purchase.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString();
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          ordersCreated: 0,
          ordersDelivered: 0,
          ordersCancelled: 0,
          ordersReturned: 0,
          dailyRevenue: 0,
          dailyShipping: 0,
          dailyCost: 0,
          dailyDeposits: 0,
          dailyReturns: 0,
          dailyRealizedProfit: 0,
          dailyExpenses: 0,
          dailyPurchases: 0,
          transactionCount: 0,
        };
      }
      
      groupedByDate[dateKey].dailyPurchases += purchase.totalCost;
      groupedByDate[dateKey].transactionCount += 1;
    });
    
    // Create treasury records
    const sortedDates = Object.keys(groupedByDate).sort();
    let previousTreasury = null;
    
    for (const dateKey of sortedDates) {
      const dayData = groupedByDate[dateKey];
      const date = new Date(dateKey);
      
      dayData.dailyEstimatedProfit = dayData.dailyRevenue - dayData.dailyCost;
      dayData.dailyNetProfit = dayData.dailyRealizedProfit - dayData.dailyExpenses;
      dayData.dailyTreasury = dayData.dailyRealizedProfit - dayData.dailyExpenses - dayData.dailyPurchases;
      
      // Calculate cumulative totals with proper financial logic
      if (previousTreasury) {
        dayData.totalRevenue = previousTreasury.totalRevenue + dayData.dailyRevenue;
        dayData.totalCost = previousTreasury.totalCost + dayData.dailyCost;
        dayData.totalExpenses = previousTreasury.totalExpenses + dayData.dailyExpenses;
        dayData.totalPurchases = previousTreasury.totalPurchases + dayData.dailyPurchases;
        dayData.totalRealizedProfit = previousTreasury.totalRealizedProfit + dayData.dailyRealizedProfit;
        dayData.totalTreasury = previousTreasury.totalTreasury + dayData.dailyNetProfit; // Use net profit for treasury
      } else {
        dayData.totalRevenue = dayData.dailyRevenue;
        dayData.totalCost = dayData.dailyCost;
        dayData.totalExpenses = dayData.dailyExpenses;
        dayData.totalPurchases = dayData.dailyPurchases;
        dayData.totalRealizedProfit = dayData.dailyRealizedProfit;
        dayData.totalTreasury = dayData.dailyNetProfit; // Use net profit for treasury
      }
      
      const treasury = await Treasury.create({
        date,
        ...dayData,
        lastUpdated: new Date(),
      });
      
      previousTreasury = treasury;
    }
    
    console.log(`Treasury rebuild completed. Created ${sortedDates.length} records.`);
    return { recordsCreated: sortedDates.length };
  }
}

export default TreasuryService;
