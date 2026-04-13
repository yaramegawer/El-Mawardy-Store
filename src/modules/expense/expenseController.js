import { Expense } from "../../../DB/models/expenseModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createExpense = asyncHandler(async (req, res, next) => {
  const { description, amount, category, paymentMethod, notes } = req.body;

  // Validation
  if (!description || description.trim().length === 0) {
    return next(new Error("Description is required", { cause: 400 }));
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return next(new Error("Valid amount is required", { cause: 400 }));
  }

  const validCategories = ["rent", "utilities", "marketing", "salaries", "supplies", "maintenance", "shipping", "ads", "vodafone_cash", "other_operating"];
  if (!category || !validCategories.includes(category)) {
    return next(new Error(`Invalid category. Valid categories: ${validCategories.join(", ")}`, { cause: 400 }));
  }

  const validPaymentMethods = ["vodafone_cash", "cash", "bank"];
  if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
    return next(new Error(`Invalid payment method. Valid methods: ${validPaymentMethods.join(", ")}`, { cause: 400 }));
  }

  try {
    const expense = await Expense.create({
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      paymentMethod: paymentMethod || "cash",
      notes: notes ? notes.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return next(new Error(`Validation failed: ${validationErrors.join(", ")}`, { cause: 400 }));
    }
    return next(new Error("Failed to create expense. Please try again.", { cause: 500 }));
  }
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