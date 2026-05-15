import { FinanceSettings } from "../../DB/models/financeSettingsModel.js";
import { InventoryPurchase } from "../../DB/models/inventoryPurchaseModel.js";
import { Order } from "../../DB/models/orderModel.js";
import { Expense } from "../../DB/models/expenseModel.js";
import { Product } from "../../DB/models/productModel.js";

const GLOBAL_KEY = "global";

function buildDateRangeFilter(field, startDate, endDate) {
  if (!startDate && !endDate) return {};
  const filter = {};
  filter[field] = {};
  if (startDate) filter[field].$gte = new Date(startDate);
  if (endDate) filter[field].$lte = new Date(endDate);
  return filter;
}

class FinanceService {
  static async getOrCreateSettings() {
    let settings = await FinanceSettings.findOne({ key: GLOBAL_KEY });
    if (!settings) {
      settings = await FinanceSettings.create({ key: GLOBAL_KEY });
    }
    return settings;
  }

  static async updateSettings({ cashBaseline, capitalMoney }) {
    const settings = await this.getOrCreateSettings();
    const update = {};

    if (cashBaseline !== undefined) {
      update.cashBaseline = cashBaseline;
      update.cashBaselineAt = new Date();
    }

    if (capitalMoney !== undefined) {
      update.capitalMoney = capitalMoney;
    }

    Object.assign(settings, update);
    await settings.save();
    return settings;
  }

  static async computeDeliveredSalesAfterBaseline(startDate, endDate, cashBaselineAt) {
    if (!cashBaselineAt) {
      return { total: 0, count: 0 };
    }

    const filter = {
      status: "delivered",
      updatedAt: { $gte: new Date(cashBaselineAt) },
      ...buildDateRangeFilter("orderDate", startDate, endDate),
    };

    const orders = await Order.find(filter).select("priceWithoutShipping");

    const total = orders.reduce(
      (sum, order) => sum + (order.priceWithoutShipping || 0),
      0
    );

    return { total, count: orders.length };
  }

  static async sumInventoryPurchases(startDate, endDate) {
    const filter = buildDateRangeFilter("date", startDate, endDate);
    const purchases = await InventoryPurchase.find(filter).select("amount");
    const total = purchases.reduce((sum, row) => sum + (row.amount || 0), 0);
    return { total, count: purchases.length };
  }

  static async sumExpenses(startDate, endDate) {
    const filter = buildDateRangeFilter("date", startDate, endDate);
    const expenses = await Expense.find(filter).select("amount");
    const total = expenses.reduce((sum, row) => sum + (row.amount || 0), 0);
    return { total, count: expenses.length };
  }

  static async calculateTotalInventoryValue() {
    const products = await Product.find({ visible: { $ne: false } });
    let totalInventoryValue = 0;

    products.forEach((product) => {
      const stock = product.stock || 0;
      const buyPrice = product.buyPrice || 0;
      totalInventoryValue += stock * buyPrice;
    });

    return totalInventoryValue;
  }

  static async computeAnalytics(startDate, endDate) {
    const orderFilter = buildDateRangeFilter("createdAt", startDate, endDate);
    const expenseFilter = buildDateRangeFilter("date", startDate, endDate);

    const [orders, expenses] = await Promise.all([
      Order.find(orderFilter).select(
        "status isReturned itemsPrice itemsCount priceWithoutShipping totalCost"
      ),
      Expense.find(expenseFilter).select("amount"),
    ]);

    let netSales = 0;
    let deliveredOrdersProfit = 0;
    let deliveredOrdersCount = 0;
    let totalSoldItems = 0;

    orders.forEach((order) => {
      if (
        order.status !== "cancelled" &&
        order.status !== "returned" &&
        !order.isReturned
      ) {
        netSales += order.itemsPrice || 0;
        totalSoldItems += order.itemsCount || 0;
      }

      if (order.status === "delivered") {
        const sellingPrice = order.priceWithoutShipping || 0;
        const buyingPrice = order.totalCost || 0;
        deliveredOrdersProfit += sellingPrice - buyingPrice;
        deliveredOrdersCount += 1;
      }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const finalProfit = deliveredOrdersProfit - totalExpenses;

    return {
      netSales,
      totalSoldItems,
      deliveredOrdersProfit,
      totalExpenses,
      finalProfit,
      deliveredOrdersCount,
    };
  }

  static async getOverview(startDate, endDate) {
    const settings = await this.getOrCreateSettings();

    const [deliveredSales, inventory, expenseTotals, analytics, totalInventoryValue] =
      await Promise.all([
        this.computeDeliveredSalesAfterBaseline(
          startDate,
          endDate,
          settings.cashBaselineAt
        ),
        this.sumInventoryPurchases(startDate, endDate),
        this.sumExpenses(startDate, endDate),
        this.computeAnalytics(startDate, endDate),
        this.calculateTotalInventoryValue(),
      ]);

    const availableCash =
      (settings.cashBaseline || 0) +
      deliveredSales.total -
      inventory.total -
      expenseTotals.total;

    // Calculate capital as inventory + available cash
    const calculatedCapital = totalInventoryValue + availableCash;

    return {
      settings: {
        cashBaseline: settings.cashBaseline,
        cashBaselineAt: settings.cashBaselineAt,
        capitalMoney: calculatedCapital,
      },
      availableCash: {
        total: availableCash,
        cashBaseline: settings.cashBaseline || 0,
        deliveredSalesAfterBaseline: deliveredSales.total,
        deliveredOrdersCount: deliveredSales.count,
        inventoryPurchases: inventory.total,
        inventoryPurchaseCount: inventory.count,
        expenses: expenseTotals.total,
        expenseCount: expenseTotals.count,
      },
      capitalMoney: calculatedCapital,
      totalInventoryValue,
      analytics,
      filter: { startDate: startDate || null, endDate: endDate || null },
    };
  }
}

export default FinanceService;
