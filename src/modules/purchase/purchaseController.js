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

    const quantity = item.stock || 1;
    let costPrice = item.buyPrice;



    // Fallback: if buyPrice not provided, use product's current buyPrice
    if (costPrice == null || costPrice === undefined || costPrice === '') {
      if (product.buyPrice && product.buyPrice > 0) {
        costPrice = product.buyPrice;
        console.log(`Using product's current buyPrice as fallback: ${costPrice}`);
      } else {
        return next(new Error(`Buy price is required for product ${product.name}. Product's current buyPrice is also not set or is 0.`, { cause: 400 }));
      }
    }

    // Convert to number if it's a string
    if (typeof costPrice === 'string') {
      costPrice = parseFloat(costPrice);
      if (isNaN(costPrice)) {
        return next(new Error(`Invalid buy price format for product ${product.name}. Must be a valid number.`, { cause: 400 }));
      }
    }

    if (quantity <= 0) {
      return next(new Error(`Invalid stock quantity for product ${product.name}. Must be greater than 0`, { cause: 400 }));
    }

    if (costPrice <= 0) {
      return next(new Error(`Invalid buy price for product ${product.name}. Must be greater than 0. Received: ${costPrice}`, { cause: 400 }));
    }

    const itemTotalCost = quantity * costPrice;
    totalCost += itemTotalCost;

    purchaseProducts.push({
      productId: item.productId,
      quantity,
      costPrice,
      totalCost: itemTotalCost,
    });
  }

  // Create purchase record only (no stock updates since products are managed manually)
  const purchase = await Purchase.create({
    supplier,
    products: purchaseProducts,
    totalCost,
    paymentMethod: paymentMethod || "cash",
    notes,
    date: new Date(),
  });

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

  // Delete purchase record only (stock is managed manually through product management)
  await purchase.deleteOne();
  res.json({ success: true, message: "Purchase deleted successfully" });
});