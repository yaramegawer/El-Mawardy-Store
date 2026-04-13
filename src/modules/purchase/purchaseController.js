import { Purchase } from "../../../DB/models/purchaseModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createPurchase = asyncHandler(async (req, res, next) => {
  const { supplier, products, paymentMethod, notes } = req.body;

  let totalCost = 0;
  const purchaseProducts = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
    }

    const quantity = item.quantity || 1;
    const costPrice = item.costPrice;

    totalCost += quantity * costPrice;

    purchaseProducts.push({
      productId: item.productId,
      quantity,
      costPrice,
      totalCost: quantity * costPrice,
    });

    // Update product stock and buyPrice
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: quantity },
      buyPrice: costPrice, // Update buyPrice to latest
    });
  }

  const purchase = await Purchase.create({
    supplier,
    products: purchaseProducts,
    totalCost,
    paymentMethod,
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Purchase created successfully",
    data: purchase,
  });
});

export const getAllPurchases = asyncHandler(async (req, res, next) => {
  const filter = {};

  if (req.query.supplier) filter.supplier = { $regex: req.query.supplier, $options: "i" };
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [purchases, total] = await Promise.all([
    Purchase.find(filter).populate("products.productId", "name").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Purchase.countDocuments(filter),
  ]);

  res.json({
    success: true,
    message: "Purchases retrieved successfully",
    data: purchases,
    pagination: { page, limit, total },
  });
});

export const getPurchaseById = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id).populate("products.productId", "name");
  if (!purchase) return next(new Error("Purchase not found!", { cause: 404 }));

  res.json({ success: true, message: "Purchase retrieved successfully", data: purchase });
});

export const updatePurchase = asyncHandler(async (req, res, next) => {
  // Note: Updating purchases might be complex due to stock changes, perhaps restrict or handle carefully
  const { supplier, paymentMethod, notes } = req.body;

  const purchase = await Purchase.findByIdAndUpdate(
    req.params.id,
    { supplier, paymentMethod, notes },
    { new: true }
  );

  if (!purchase) return next(new Error("Purchase not found!", { cause: 404 }));

  res.json({ success: true, message: "Purchase updated successfully", data: purchase });
});

export const deletePurchase = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return next(new Error("Purchase not found!", { cause: 404 }));

  // Restore stock
  for (const item of purchase.products) {
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
  }

  await purchase.deleteOne();
  res.json({ success: true, message: "Purchase deleted successfully" });
});