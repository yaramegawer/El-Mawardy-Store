import { Expense } from "../../../DB/models/expenseModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createExpense = asyncHandler(async (req, res, next) => {
  const { description, amount, category, paymentMethod, notes } = req.body;

  const expense = await Expense.create({
    description,
    amount,
    category,
    paymentMethod,
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Expense created successfully",
    data: expense,
  });
});

export const getAllExpenses = asyncHandler(async (req, res, next) => {
  const filter = {};

  if (req.query.category) filter.category = req.query.category;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: "Expenses retrieved successfully",
    data: expenses,
    pagination: { page, limit, total },
  });
});

export const getExpenseById = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return next(new Error("Expense not found!", { cause: 404 }));

  res.json({ success: true, message: "Expense retrieved successfully", data: expense });
});

export const updateExpense = asyncHandler(async (req, res, next) => {
  const { description, amount, category, paymentMethod, notes } = req.body;

  const expense = await Expense.findByIdAndUpdate(
    req.params.id,
    { description, amount, category, paymentMethod, notes },
    { new: true }
  );

  if (!expense) return next(new Error("Expense not found!", { cause: 404 }));

  res.json({ success: true, message: "Expense updated successfully", data: expense });
});

export const deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) return next(new Error("Expense not found!", { cause: 404 }));

  res.json({ success: true, message: "Expense deleted successfully" });
});