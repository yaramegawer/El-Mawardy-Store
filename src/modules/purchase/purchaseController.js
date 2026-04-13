import { Purchase } from "../../../DB/models/purchaseModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createPurchase = asyncHandler(async (req, res, next) => {
  const { supplier, products, paymentMethod, notes } = req.body;

  // Validation
  if (!supplier || !products || !Array.isArray(products) || products.length === 0) {
    return next(new Error("Supplier and products array are required", { cause: 400 }));
  }

  let totalCost = 0;
  const purchaseProducts = [];
  const stockUpdates = [];

  for (const item of products) {
    if (!item.productId) {
      return next(new Error("Product ID is required for each purchase item", { cause: 400 }));
    }

    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
    }

    const quantity = item.quantity || 1;
    // Accept both costPrice and buyPrice from frontend for flexibility
    let costPrice = item.costPrice || item.buyPrice;

    // Debug logging to identify the issue
    console.log('Purchase Item Debug:', {
      productId: item.productId,
      productName: product.name,
      quantity: quantity,
      costPrice: costPrice,
      buyPrice: item.buyPrice,
      costPriceType: typeof costPrice,
      itemData: item,
      productBuyPrice: product.buyPrice
    });

    // Fallback: if costPrice not provided, use product's current buyPrice
    if (costPrice == null || costPrice === undefined || costPrice === '') {
      if (product.buyPrice && product.buyPrice > 0) {
        costPrice = product.buyPrice;
        console.log(`Using product's current buyPrice as fallback: ${costPrice}`);
      } else {
        return next(new Error(`Cost price is required for product ${product.name}. Product's current buyPrice is also not set or is 0.`, { cause: 400 }));
      }
    }

    if (quantity <= 0) {
      return next(new Error(`Invalid quantity for product ${product.name}. Must be greater than 0`, { cause: 400 }));
    }

    if (costPrice <= 0) {
      return next(new Error(`Invalid cost price for product ${product.name}. Must be greater than 0`, { cause: 400 }));
    }

    const itemTotalCost = quantity * costPrice;
    totalCost += itemTotalCost;

    purchaseProducts.push({
      productId: item.productId,
      quantity,
      costPrice,
      totalCost: itemTotalCost,
    });

    // Prepare stock updates for batch processing
    stockUpdates.push({
      productId: item.productId,
      quantity,
      costPrice,
    });
  }

  // Create purchase first
  const purchase = await Purchase.create({
    supplier,
    products: purchaseProducts,
    totalCost,
    paymentMethod: paymentMethod || "cash",
    notes,
    date: new Date(),
  });

  // Update product stock and buyPrice in batch
  try {
    for (const update of stockUpdates) {
      await Product.findByIdAndUpdate(update.productId, {
        $inc: { stock: update.quantity },
        buyPrice: update.costPrice,
      });
    }
  } catch (error) {
    // If stock update fails, delete the purchase to maintain data integrity
    await Purchase.findByIdAndDelete(purchase._id);
    return next(new Error("Failed to update product stock. Purchase rolled back.", { cause: 500 }));
  }

  // Fetch the purchase with populated product details for the response
  const populatedPurchase = await Purchase.findById(purchase._id)
    .populate("products.productId", "name price buyPrice stock discount");

  res.status(201).json({
    success: true,
    message: "Purchase created successfully",
    data: populatedPurchase,
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
    Purchase.find(filter).populate("products.productId", "name price buyPrice stock discount").sort({ createdAt: -1 }).skip(skip).limit(limit),
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
  const purchase = await Purchase.findById(req.params.id).populate("products.productId", "name price buyPrice stock discount");
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
  ).populate("products.productId", "name price buyPrice stock discount");

  if (!purchase) return next(new Error("Purchase not found!", { cause: 404 }));

  res.json({ success: true, message: "Purchase updated successfully", data: purchase });
});

export const deletePurchase = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return next(new Error("Purchase not found!", { cause: 404 }));

  // Check if we can safely restore stock (prevent negative stock)
  const stockChecks = [];
  for (const item of purchase.products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found during deletion`, { cause: 404 }));
    }
    
    if (product.stock < item.quantity) {
      return next(new Error(`Cannot delete purchase: Insufficient stock to restore for product ${product.name}. Required: ${item.quantity}, Available: ${product.stock}`, { cause: 400 }));
    }
    stockChecks.push({ productId: item.productId, quantity: item.quantity });
  }

  // Restore stock
  try {
    for (const check of stockChecks) {
      await Product.findByIdAndUpdate(check.productId, { $inc: { stock: -check.quantity } });
    }
  } catch (error) {
    return next(new Error("Failed to restore product stock during purchase deletion", { cause: 500 }));
  }

  await purchase.deleteOne();
  res.json({ success: true, message: "Purchase deleted successfully and stock restored" });
});