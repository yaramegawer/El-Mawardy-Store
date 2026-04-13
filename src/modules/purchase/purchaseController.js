import { Purchase } from "../../../DB/models/purchaseModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createPurchase = asyncHandler(async (req, res, next) => {
  const { supplier, paymentMethod, notes } = req.body;

  // Validation - only require supplier now
  if (!supplier || !supplier.trim()) {
    return next(new Error("Supplier is required", { cause: 400 }));
  }

  // Auto-calculate purchases from all products with stock > 0
  const productsWithStock = await Product.find({ 
    stock: { $gt: 0 },
    buyPrice: { $gt: 0 } // Only include products with valid buyPrice
  });

  if (!productsWithStock || productsWithStock.length === 0) {
    return next(new Error("No products found with stock greater than 0 and valid buy price", { cause: 400 }));
  }

  let totalCost = 0;
  const purchaseProducts = [];

  for (const product of productsWithStock) {
    const quantity = product.stock || 1;
    const costPrice = product.buyPrice;

    if (quantity <= 0) {
      console.log(`Skipping product ${product.name} - invalid stock quantity: ${quantity}`);
      continue;
    }

    if (costPrice <= 0) {
      console.log(`Skipping product ${product.name} - invalid buy price: ${costPrice}`);
      continue;
    }

    const itemTotalCost = quantity * costPrice;
    totalCost += itemTotalCost;

    purchaseProducts.push({
      productId: product._id,
      quantity,
      costPrice,
      totalCost: itemTotalCost,
    });
  }

  if (purchaseProducts.length === 0) {
    return next(new Error("No valid products found for purchase calculation", { cause: 400 }));
  }

  // Create purchase record
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
