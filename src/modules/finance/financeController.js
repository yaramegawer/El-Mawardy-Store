import { asyncHandler } from "../../utils/asyncHandler.js";
import FinanceService from "../../services/financeService.js";
import { InventoryPurchase } from "../../../DB/models/inventoryPurchaseModel.js";

export const getFinanceOverview = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await FinanceService.getOverview(startDate, endDate);

  res.json({
    success: true,
    message: "Finance overview retrieved successfully",
    data,
  });
});

export const getFinanceSettings = asyncHandler(async (req, res) => {
  const settings = await FinanceService.getOrCreateSettings();

  res.json({
    success: true,
    message: "Finance settings retrieved successfully",
    data: {
      cashBaseline: settings.cashBaseline,
      cashBaselineAt: settings.cashBaselineAt,
      capitalMoney: settings.capitalMoney,
    },
  });
});

export const updateFinanceSettings = asyncHandler(async (req, res, next) => {
  const { cashBaseline, capitalMoney } = req.body;

  if (cashBaseline === undefined && capitalMoney === undefined) {
    return next(
      new Error("Provide cashBaseline and/or capitalMoney", { cause: 400 })
    );
  }

  const settings = await FinanceService.updateSettings({
    cashBaseline,
    capitalMoney,
  });

  res.json({
    success: true,
    message: "Finance settings updated successfully",
    data: {
      cashBaseline: settings.cashBaseline,
      cashBaselineAt: settings.cashBaselineAt,
      capitalMoney: settings.capitalMoney,
    },
  });
});

export const createInventoryPurchase = asyncHandler(async (req, res) => {
  const { description, amount, date, supplier, paymentMethod, notes } =
    req.body;

  const purchase = await InventoryPurchase.create({
    description: description.trim(),
    amount: parseFloat(amount),
    date: date ? new Date(date) : new Date(),
    supplier: supplier?.trim() || undefined,
    paymentMethod: paymentMethod || "cash",
    notes: notes?.trim() || undefined,
  });

  res.status(201).json({
    success: true,
    message: "Inventory purchase recorded successfully",
    data: purchase,
  });
});

export const getInventoryPurchases = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const [purchases, total, amountAgg] = await Promise.all([
    InventoryPurchase.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    InventoryPurchase.countDocuments(filter),
    InventoryPurchase.aggregate([
      { $match: filter },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]),
  ]);

  const totalAmount = amountAgg[0]?.totalAmount || 0;

  res.json({
    success: true,
    message: "Inventory purchases retrieved successfully",
    data: purchases,
    summary: { totalAmount, count: total },
    pagination: { page, limit, total },
  });
});

export const updateInventoryPurchase = asyncHandler(async (req, res, next) => {
  const { description, amount, date, supplier, paymentMethod, notes } =
    req.body;

  const updateData = {};
  if (description !== undefined) updateData.description = description.trim();
  if (amount !== undefined) updateData.amount = parseFloat(amount);
  if (date !== undefined) updateData.date = new Date(date);
  if (supplier !== undefined) updateData.supplier = supplier.trim() || undefined;
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
  if (notes !== undefined) updateData.notes = notes.trim() || undefined;

  const purchase = await InventoryPurchase.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!purchase) {
    return next(new Error("Inventory purchase not found!", { cause: 404 }));
  }

  res.json({
    success: true,
    message: "Inventory purchase updated successfully",
    data: purchase,
  });
});

export const deleteInventoryPurchase = asyncHandler(async (req, res, next) => {
  const purchase = await InventoryPurchase.findByIdAndDelete(req.params.id);

  if (!purchase) {
    return next(new Error("Inventory purchase not found!", { cause: 404 }));
  }

  res.json({
    success: true,
    message: "Inventory purchase deleted successfully",
  });
});
