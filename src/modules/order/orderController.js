// POST /api/orders
// GET /api/orders
// GET /api/orders/:id
// PATCH /api/orders/:id
// PATCH /api/orders/:id/confirm-deposit
// DELETE /api/orders/:id

import { Order } from "../../../DB/models/orderModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { Expense } from "../../../DB/models/expenseModel.js";
import { Treasury } from "../../../DB/models/treasuryModel.js";
import { Purchase } from "../../../DB/models/purchaseModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Types } from "mongoose";


export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    products, customerName, phone, email, address, government,
    shippingCost, depositPaymentMethod, duePaymentMethod, notes, source
  } = req.body;

  let itemsPrice = 0;
  let totalCost = 0;
  let totalItems = 0;
  const orderProducts = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
    }

    const orderQuantity = item.quantity || 1;

    if (orderQuantity <= 0) {
      return next(new Error(`Invalid quantity for product ${product.name}`, { cause: 400 }));
    }

    // Resolve color: use the one specified in the order item, or fall back to
    // the first color available in the product's colorStock array.
    const snapshotColor = item.color
      || (product.colorStock && product.colorStock.length > 0 ? product.colorStock[0].color : undefined);
    const snapshotSize = item.size || product.size;

    // Validate stock for the specific color variant
    if (snapshotColor) {
      const colorEntry = (product.colorStock || []).find(cs => cs.color === snapshotColor);
      if (!colorEntry) {
        return next(new Error(`Color "${snapshotColor}" not found for product ${product.name}`, { cause: 400 }));
      }
      if (orderQuantity > colorEntry.stock) {
        return next(new Error(`Insufficient stock for product ${product.name} (color: ${snapshotColor}). Required: ${orderQuantity}, Available: ${colorEntry.stock}`, { cause: 400 }));
      }
    } else {
      // No color specified and no colorStock — fall back to total stock check
      if (orderQuantity > product.stock) {
        return next(new Error(`Insufficient stock for product ${product.name}. Required: ${orderQuantity}, Available: ${product.stock}`, { cause: 400 }));
      }
    }

    // Allow per-item price override or use product default pricing
    let snapshotPrice, snapshotCostPrice, discountPercentage, originalPrice, discountAmount;
    
    if (item.customPrice !== undefined && item.customPrice !== null) {
      // Use custom price for this specific order item
      snapshotPrice = item.customPrice;
      snapshotCostPrice = product.buyPrice; // Still use product's cost price
      
      // For custom pricing, we assume no discount unless explicitly provided
      discountPercentage = item.customDiscount || 0;
      originalPrice = snapshotPrice;
      discountAmount = 0;
      
      if (discountPercentage > 0) {
        // If custom discount is provided, calculate original price and discount amount
        originalPrice = snapshotPrice / (1 - discountPercentage / 100);
        discountAmount = originalPrice - snapshotPrice;
      }
    } else {
      // Use product default pricing
      snapshotPrice = product.price;
      snapshotCostPrice = product.buyPrice;
      discountPercentage = product.discount || 0;
      originalPrice = snapshotPrice;
      discountAmount = 0;
      
      if (discountPercentage > 0) {
        // If product has discount, calculate original price and discount amount
        originalPrice = snapshotPrice / (1 - discountPercentage / 100);
        discountAmount = originalPrice - snapshotPrice;
      }
    }

    if (snapshotCostPrice == null) {
      return next(new Error(
        `Product ${product.name} must have a buyPrice to calculate finance metrics`,
        { cause: 400 }
      ));
    }

    itemsPrice += orderQuantity * snapshotPrice;
    totalCost += orderQuantity * snapshotCostPrice;
    totalItems += orderQuantity;

    orderProducts.push({
      productId: item.productId,
      quantity: orderQuantity,
      price: originalPrice, // Store original price before discount
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
      finalPrice: snapshotPrice,  // price IS the final price after discount
      costPrice: snapshotCostPrice,
      color: snapshotColor,
      size: snapshotSize,
    });
  }

  const totalPrice = itemsPrice + shippingCost;

  // Financial clarity:
  // - Revenue (products only) = itemsPrice (price already reflects any discounts)
  // - Shipping is a service fee, NOT product revenue
  // - EstimatedProfit = Revenue - Cost of Goods (calculated at creation for forecasting)
  // - RealizedProfit = final profit recorded only when status becomes "delivered"
  const estimatedProfit = itemsPrice - totalCost;

  const depositPercentage = 0.5; // 50% deposit - can be made configurable later
  const depositAmount = itemsPrice * depositPercentage;
  const dueAmount = totalPrice - depositAmount;

  const order = await Order.create({
    products: orderProducts,
    customerName,
    phone,
    email,
    address,
    government,
    shippingCost,
    itemsPrice,
    totalDiscount: 0,
    totalPrice,
    totalCost,
    priceWithoutShipping: itemsPrice, // Product revenue excluding shipping
    estimatedProfit,
    realizedProfit: null, // will be set when order is delivered
    itemsCount: totalItems,
    depositAmount,
    depositPaymentMethod: depositPaymentMethod || "vodafone_cash",
    dueAmount,
    duePaymentMethod: duePaymentMethod || "cash_on_delivery",
    paymentStatus: "pending",
    depositConfirmed: false,
    status: "pending",
    orderDate: new Date(), // Use proper Date constructor
    source: source || "online",
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: order,
    depositInfo: {
      itemsPrice: itemsPrice.toFixed(2),
      revenue: itemsPrice.toFixed(2),
      shippingCost,
      totalPrice: totalPrice.toFixed(2),
      estimatedProfit: estimatedProfit.toFixed(2),
      depositAmount: depositAmount.toFixed(2),
      dueAmount: dueAmount.toFixed(2),
      paymentMethod: depositPaymentMethod || "vodafone_cash",
      instructions: `Please send 50% deposit (${depositAmount.toFixed(2)} EGP) to 01033727566 via Vodafone Cash for order #${order._id}. After sending, please message us on WhatsApp with your transaction details.`,
      whatsappLink: `https://wa.me/201033727566?text=${encodeURIComponent(
        `Hello, I sent ${depositAmount.toFixed(2)} EGP deposit for order ${order._id}. Transaction details: [Please add your transaction details here]`
      )}`,
    },
  });
});


export const getAllOrders = asyncHandler(async (req, res, next) => {
  let filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.customerName) filter.customerName = { $regex: req.query.customerName, $options: "i" };
  if (req.query.phone) filter.phone = req.query.phone;
  if (req.query.depositConfirmed) filter.depositConfirmed = req.query.depositConfirmed === "true";

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [paginatedOrders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  // Add revenue field to each order (uses priceWithoutShipping field)
  const ordersWithRevenue = paginatedOrders.map(order => ({
    ...order.toObject(),
    revenue: order.priceWithoutShipping || 0,
  }));

  res.json({
    success: true,
    message: "Orders retrieved successfully",
    data: ordersWithRevenue,
    pagination: { page, limit, total },
  });
});


export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  const orderWithRevenue = {
    ...order.toObject(),
    revenue: order.priceWithoutShipping || 0,
  };

  res.json({ success: true, message: "Order retrieved successfully", data: orderWithRevenue });
});


const restoreOrderStock = async (order) => {
  if (!order.depositConfirmed) return;
  for (const item of order.products) {
    if (item.color) {
      // Restore stock for the specific color variant
      await Product.findOneAndUpdate(
        { _id: item.productId, "colorStock.color": item.color },
        { $inc: { "colorStock.$.stock": item.quantity } }
      );
    } else {
      // Fallback: distribute to first colorStock entry
      await Product.findOneAndUpdate(
        { _id: item.productId, "colorStock.0": { $exists: true } },
        { $inc: { "colorStock.0.stock": item.quantity } }
      );
    }
  }
};

export const getFinanceAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const createDateFilter = (field) => {
    const filter = {};
    if (startDate || endDate) {
      filter[field] = {};
      if (startDate) filter[field].$gte = new Date(startDate);
      if (endDate) filter[field].$lte = new Date(endDate);
    }
    return filter;
  };

  // Fetch only orders and expenses
  let [orders, expenses] = await Promise.all([
    Order.find(createDateFilter("createdAt")).populate("products.productId", "name buyPrice stock"),
    Expense.find(createDateFilter("date"))
  ]);

  // If no orders found with date filter, fetch all orders
  if (orders.length === 0) {
    orders = await Order.find({}).populate("products.productId", "name buyPrice stock");
  }
  
  // If no expenses found with date filter, fetch all expenses
  if (expenses.length === 0) {
    expenses = await Expense.find({});
  }

  // Calculate sales and profit with returns/exchanges impact
  let netSales = 0;
  let deliveredOrdersProfit = 0;
  let deliveredOrdersCount = 0;

  orders.forEach((order) => {
    // Calculate net sales: 
    // - Include all orders that were originally sold (pending, confirmed, shipped, delivered)
    // - Include exchanged orders since original sale was made
    // - Exclude returned orders (money was refunded)
    // - Exclude cancelled orders (no sale was made)
    if (order.status !== "cancelled" && 
        order.status !== "returned" && 
        !order.isReturned) {
      // Add sales for orders where money was collected
      netSales += order.itemsPrice || 0;
    }

    // Calculate profit for delivered orders only
    if (order.status === "delivered") {
      const sellingPrice = order.priceWithoutShipping || 0;
      const buyingPrice = order.totalCost || 0;
      const orderProfit = sellingPrice - buyingPrice;
      
      deliveredOrdersProfit += orderProfit;
      deliveredOrdersCount++;
    }
  });

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Final calculation: (selling price - buying price) - expenses
  const finalProfit = deliveredOrdersProfit - totalExpenses;

  // =============================
  // SIMPLIFIED RESPONSE
  // =============================
  res.json({
    success: true,
    message: "Financial analytics retrieved successfully",
    data: {
      // Sales Data
      netSales,                 // Net sales (total orders minus returns minus exchanges)
      
      // Profit Data
      deliveredOrdersProfit,    // (selling price - buying price) of delivered orders
      totalExpenses,             // Total expenses
      finalProfit,               // (selling price - buying price) - expenses
      deliveredOrdersCount,      // Number of delivered orders
    },
  });
});

// PATCH /api/orders/:id
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, paymentStatus, notes } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (status === "confirmed") {
    if (!order.depositConfirmed) {
      return next(
        new Error("Cannot confirm order: deposit not yet confirmed by moderator", { cause: 400 })
      );
    }
    order.paymentStatus = "deposit_sent";
  }

  if (status === "cancelled") {
    if (!order.refundStatus || order.refundStatus === "none") {
      if (order.depositConfirmed) {
        await restoreOrderStock(order);
        order.paymentStatus = "deposit_returned"; // Mark deposit as pending refund
        order.refundStatus = "pending"; // Refund processing status
        order.returnAmount = order.depositAmount || 0;
        order.returnReason = "Order cancelled - deposit refund pending";
        order.refundDate = new Date();
      }
    }
    // FINANCIAL ADJUSTMENT: Reverse profit impact when order is cancelled
    // Keep estimatedProfit intact so we have the historical footprint, but
    // set realizedProfit to negative of estimatedProfit to track the "missed" opportunity.
    // Set priceWithoutShipping to 0 since cancelled orders don't generate revenue
    if (order.status !== "cancelled") {
      const profitToReverse = order.estimatedProfit || 0;
      order.realizedProfit = 0; // Track profit reversal as negative
      order.priceWithoutShipping = 0; // No revenue from cancelled orders
    }
  }

  // Record realizedProfit only when order is delivered (confirmed transaction)
  if (status === "delivered") {
    order.paymentStatus = "completed";
    // RealizedProfit = Revenue (excl. shipping) - Cost of Goods
    const itemsPriceAfterDiscount = order.itemsPrice - order.totalDiscount;
    order.realizedProfit = itemsPriceAfterDiscount - order.totalCost;
  }

  // Allow manual override of paymentStatus if provided
  if (paymentStatus) {
    if (status === "delivered" || status === "cancelled") {
      // Manual override for delivered/cancelled when explicitly provided
      order.paymentStatus = paymentStatus;
    } else if (!status || (status !== "delivered" && status !== "cancelled")) {
      // Allow override for pending, confirmed, shipped
      order.paymentStatus = paymentStatus;
    }
  }

  order.status = status;
  order.notes = notes;
  await order.save();

  res.json({ success: true, message: "Order status updated successfully", data: order });
});


// PATCH /api/orders/:id/confirm-deposit
export const confirmDeposit = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.depositConfirmed) {
    return next(new Error("Deposit has already been confirmed for this order", { cause: 400 }));
  }

  // Atomically decrement stock for each product's specific color variant,
  // but only if sufficient stock exists. Uses arrayFilters to target the exact
  // colorStock entry by color, and a $gte condition to prevent overselling.
  for (const item of order.products) {
    let updated;

    if (item.color) {
      // Atomic decrement on the specific color variant
      updated = await Product.findOneAndUpdate(
        { _id: item.productId, "colorStock": { $elemMatch: { color: item.color, stock: { $gte: item.quantity } } } },
        { $inc: { "colorStock.$.stock": -item.quantity } },
        { new: true }
      );
    } else {
      // Fallback: decrement the first colorStock entry
      updated = await Product.findOneAndUpdate(
        { _id: item.productId, "colorStock.0.stock": { $gte: item.quantity } },
        { $inc: { "colorStock.0.stock": -item.quantity } },
        { new: true }
      );
    }

    if (!updated) {
      // Either the product doesn't exist, or stock dropped below the required quantity
      // between the order being placed and the deposit being confirmed.
      const product = await Product.findById(item.productId);
      if (!product) {
        return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
      }
      const colorEntry = item.color
        ? (product.colorStock || []).find(cs => cs.color === item.color)
        : (product.colorStock || [])[0];
      const availableStock = colorEntry ? colorEntry.stock : 0;
      return next(
        new Error(
          `Insufficient stock for product ${product.name}${item.color ? ` (color: ${item.color})` : ''}. Required: ${item.quantity}, available: ${availableStock}`,
          { cause: 400 }
        )
      );
    }
  }

  order.depositConfirmed = true;
  order.paymentStatus = "deposit_sent";
  order.status = "confirmed";
  await order.save();

  res.json({ success: true, message: "Deposit confirmed successfully", data: order });
});


// DELETE /api/orders/:id
export const deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  // Check if stock restoration should be skipped (e.g., for cancelled orders that already restored stock)
  const noRestore = req.query.noRestore === 'true';

  // FIX: restore stock if the order had already reserved inventory (deposit confirmed)
  // and has not already been returned (which would have restored stock separately).
  // Skip restoration if noRestore=true is passed (e.g., when deleting cancelled orders).
  if (!noRestore && order.depositConfirmed && !order.isReturned) {
    for (const item of order.products) {
      if (item.color) {
        await Product.findOneAndUpdate(
          { _id: item.productId, "colorStock.color": item.color },
          { $inc: { "colorStock.$.stock": item.quantity } }
        );
      } else {
        await Product.findOneAndUpdate(
          { _id: item.productId, "colorStock.0": { $exists: true } },
          { $inc: { "colorStock.0.stock": item.quantity } }
        );
      }
    }
  }

  await order.deleteOne();
  res.json({ success: true, message: "Order deleted successfully" });
});

// PATCH /api/orders/:id/return — full refund with stock restoration
export const returnOrder = asyncHandler(async (req, res, next) => {
  const { returnReason } = req.body;
  
  // Validation
  if (!returnReason || returnReason.trim().length === 0) {
    return next(new Error("Return reason is required", { cause: 400 }));
  }
  
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.isReturned) {
    return next(new Error("Order has already been returned", { cause: 400 }));
  }

  if (order.status === "cancelled") {
    return next(new Error("Cannot return a cancelled order", { cause: 400 }));
  }

  // Only restore stock if the deposit was confirmed (i.e. stock was actually
  // decremented when the deposit was confirmed). Returning an unconfirmed order
  // should never touch stock.
  let stockRestored = 0;
  if (order.depositConfirmed) {
    try {
      for (const item of order.products) {
        if (item.color) {
          await Product.findOneAndUpdate(
            { _id: item.productId, "colorStock.color": item.color },
            { $inc: { "colorStock.$.stock": item.quantity } }
          );
        } else {
          await Product.findOneAndUpdate(
            { _id: item.productId, "colorStock.0": { $exists: true } },
            { $inc: { "colorStock.0.stock": item.quantity } }
          );
        }
      }
      stockRestored = order.itemsCount || 0;
    } catch (error) {
      return next(new Error("Failed to restore stock during return process", { cause: 500 }));
    }
  }

  const returnAmount = order.totalPrice;

  // Update order with return information
order.isReturned = true;
order.status = "returned";
order.paymentStatus = "deposit_returned";

order.returnAmount = order.totalPrice;
order.returnReason = returnReason.trim();
order.returnDate = new Date();
order.refundStatus = "pending";

  await order.save();

  res.json({
    success: true,
    message: `Order returned successfully${stockRestored > 0 ? ` and ${stockRestored} items restored to stock` : ""}`,
    data: {
      orderId: order._id,
      returnAmount: returnAmount.toFixed(2),
      returnReason: order.returnReason,
      refundStatus: order.refundStatus,
      stockRestored,
      returnDate: order.returnDate,
    },
  });
});

// PATCH /api/orders/:id/exchange — swap products within an existing order
export const exchangeOrderProducts = asyncHandler(async (req, res, next) => {
  const { exchangeItems, exchangeReason } = req.body;

  // Validation
  if (!exchangeItems || !Array.isArray(exchangeItems) || exchangeItems.length === 0) {
    return next(new Error("Exchange items array is required", { cause: 400 }));
  }
  
  if (!exchangeReason || exchangeReason.trim().length === 0) {
    return next(new Error("Exchange reason is required", { cause: 400 }));
  }

  // exchangeItems: [{ originalLineItemId, newProductId, quantity, newColor, newSize }]
  //
  // originalLineItemId is the Mongoose subdocument _id of the line item inside
  // order.products (e.g. "6643a1f2e4b09c1234567890"). Using the subdocument _id
  // instead of an array index is safe: indices shift whenever a partial exchange
  // pushes a new line into order.products within the same request, which would cause
  // a subsequent exchange in the same batch to silently target the wrong product.

  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.isExchanged) {
    return next(
      new Error("Cannot exchange order that has already been exchanged before", {
        cause: 403,
      })
    );
  }
  
  if (order.isReturned) {
    return next(
      new Error("Cannot exchange products on a returned order", {
        cause: 400,
      })
    );
  }
  
  if (order.status === "cancelled") {
    return next(
      new Error("Cannot exchange products on a cancelled order", {
        cause: 400,
      })
    );
  }
  
  if (!order.depositConfirmed) {
    return next(
      new Error("Cannot exchange products on an order whose deposit has not been confirmed", {
        cause: 400,
      })
    );
  }

  let totalPriceAdjustment = 0;
  const exchanges = [];

  for (const exchange of exchangeItems) {
    const { originalLineItemId, newProductId, quantity, newColor, newSize } = exchange;

    // Look up by string-comparing both sides of _id.
    // order.products.id() can silently return null when Mongoose hasn't fully
    // hydrated the DocumentArray (e.g. lean queries, certain schema configs, or
    // version mismatches). A manual .find() with toString() on both sides is
    // always reliable regardless of how the array was loaded.


    const originalProduct = order.products.find(
      (p) => p._id && p._id.toString() === originalLineItemId.toString()
    );
    if (!originalProduct) {
      // Surface the actual _ids in the error so the caller can see what's available
      const available = order.products.map((p) => p._id?.toString()).join(", ");
      return next(
        new Error(
          `Order line item with id ${originalLineItemId} not found. Available line item ids: [${available}]`,
          { cause: 404 }
        )
      );
    }

    if (quantity > originalProduct.quantity) {
      return next(
        new Error(
          `Cannot exchange ${quantity} items — only ${originalProduct.quantity} in order`,
          { cause: 400 }
        )
      );
    }

    // Resolve original selling price (pre-discount) and final price (post-discount).
    // Guard against missing fields on records saved before those fields existed.
    const originalSellingPrice = originalProduct.price || 0;
    const originalDiscountPct = originalProduct.discountPercentage || 0;
    const originalDiscountAmt = originalProduct.discountAmount != null
      ? originalProduct.discountAmount
      : (originalSellingPrice * originalDiscountPct) / 100;
    const originalFinalPrice = originalProduct.finalPrice != null
      ? originalProduct.finalPrice
      : originalSellingPrice - originalDiscountAmt;

    const newProduct = await Product.findById(newProductId);
    if (!newProduct) {
      return next(new Error(`Product with ID ${newProductId} not found`, { cause: 404 }));
    }

    // Validate stock for the specific color of the new product
    const resolvedNewColor = newColor
      || (newProduct.colorStock && newProduct.colorStock.length > 0 ? newProduct.colorStock[0].color : undefined);
    if (resolvedNewColor) {
      const newColorEntry = (newProduct.colorStock || []).find(cs => cs.color === resolvedNewColor);
      if (!newColorEntry) {
        return next(new Error(`Color "${resolvedNewColor}" not found for product ${newProduct.name}`, { cause: 400 }));
      }
      if (quantity > newColorEntry.stock) {
        return next(
          new Error(
            `Insufficient stock for ${newProduct.name} (color: ${resolvedNewColor}). Available: ${newColorEntry.stock}`,
            { cause: 400 }
          )
        );
      }
    } else if (quantity > newProduct.stock) {
      return next(
        new Error(
          `Insufficient stock for ${newProduct.name}. Available: ${newProduct.stock}`,
          { cause: 400 }
        )
      );
    }

    const newSellingPrice = newProduct.price || 0;
    const newDiscountPct = newProduct.discount || 0;
    const newDiscountAmt = (newSellingPrice * newDiscountPct) / 100;
    const newFinalPrice = newSellingPrice - newDiscountAmt;

    // Price adjustment is based on finalPrice (what is actually charged),
    // not the pre-discount price — this is what flows into totalPrice / dueAmount.
    const priceAdjustment = (newFinalPrice - originalFinalPrice) * quantity;

    // Stock: return the original units to their color variant, reserve the new ones
    const origColor = originalProduct.color;
    if (origColor) {
      await Product.findOneAndUpdate(
        { _id: originalProduct.productId, "colorStock.color": origColor },
        { $inc: { "colorStock.$.stock": quantity } }
      );
    } else {
      await Product.findOneAndUpdate(
        { _id: originalProduct.productId, "colorStock.0": { $exists: true } },
        { $inc: { "colorStock.0.stock": quantity } }
      );
    }
    if (resolvedNewColor) {
      await Product.findOneAndUpdate(
        { _id: newProductId, "colorStock.color": resolvedNewColor },
        { $inc: { "colorStock.$.stock": -quantity } }
      );
    } else {
      await Product.findOneAndUpdate(
        { _id: newProductId, "colorStock.0": { $exists: true } },
        { $inc: { "colorStock.0.stock": -quantity } }
      );
    }

    // Audit log — store both the pre-discount selling price AND the final
    // (post-discount) price so the dashboard can display either.
    exchanges.push({
      originalProductId: originalProduct.productId,
      newProductId,
      quantity,
      originalSellingPrice, // pre-discount snapshot
      originalDiscountPct,
      originalFinalPrice,   // what the customer was actually charged per unit
      newSellingPrice,      // pre-discount price of the replacement
      newDiscountPct,
      newFinalPrice,        // what the customer will be charged per unit
      priceAdjustment,      // (newFinalPrice - originalFinalPrice) * quantity
    });

    totalPriceAdjustment += priceAdjustment;

    if (quantity === originalProduct.quantity) {
      // Full replacement — update the line item in-place
      originalProduct.productId = newProductId;
      originalProduct.price = newSellingPrice;
      originalProduct.discountPercentage = newDiscountPct;
      originalProduct.discountAmount = newDiscountAmt;
      originalProduct.finalPrice = newFinalPrice;
      originalProduct.costPrice = newProduct.buyPrice || 0;
      originalProduct.color =
        newColor || (newProduct.colorStock && newProduct.colorStock.length > 0 ? newProduct.colorStock[0].color : undefined);
      originalProduct.size =
        newSize || (Array.isArray(newProduct.size) ? newProduct.size[0] : newProduct.size);
    } else {
      // Partial exchange — shrink the original line, add a new one for the replacement
      originalProduct.quantity -= quantity;

      // Explicitly assign _id so Mongoose registers this as a proper subdocument.
      // Without it, order.products.id() cannot find this entry in future exchanges
      // because plain object literals pushed into a DocumentArray don't get an _id
      // tracked by Mongoose unless one is provided at push time.
      order.products.push({
        _id: new Types.ObjectId(),
        productId: newProductId,
        quantity,
        price: newSellingPrice,
        discountPercentage: newDiscountPct,
        discountAmount: newDiscountAmt,
        finalPrice: newFinalPrice,
        costPrice: newProduct.buyPrice || 0,
        color: newColor || (newProduct.colorStock && newProduct.colorStock.length > 0 ? newProduct.colorStock[0].color : undefined),
        size: newSize || (Array.isArray(newProduct.size) ? newProduct.size[0] : newProduct.size),
      });
    }
  }

  // Recalculate order totals from scratch after all line-item mutations
  let recalcItemsPrice = 0;
  let recalcTotalDiscount = 0;
  let recalcTotalCost = 0;
  let recalcItemsCount = 0;

  for (const product of order.products) {
    const sellingPrice = product.price || 0;
    // Use the already-stored discountAmount and finalPrice instead of
    // re-deriving them from discountPercentage. These values were set
    // correctly during order creation or the exchange mutation above.
    // Re-deriving them would risk applying the discount twice or
    // producing rounding mismatches.
    const discountAmount = product.discountAmount != null
      ? product.discountAmount
      : (sellingPrice * (product.discountPercentage || 0)) / 100;
    const finalPrice = product.finalPrice != null
      ? product.finalPrice
      : sellingPrice - discountAmount;

    const qty = product.quantity || 0;
    recalcItemsPrice += sellingPrice * qty;
    recalcTotalDiscount += discountAmount * qty;
    recalcTotalCost += (product.costPrice || 0) * qty;
    recalcItemsCount += qty;
  }

  order.itemsPrice = recalcItemsPrice;
  order.totalDiscount = recalcTotalDiscount;
  order.totalCost = recalcTotalCost;
  order.itemsCount = recalcItemsCount;

  const newItemsRevenue = recalcItemsPrice - recalcTotalDiscount;
  const newTotalPrice = newItemsRevenue + order.shippingCost;

  order.totalPrice = newTotalPrice;
  order.priceWithoutShipping = newItemsRevenue; // Update revenue field

  // FIX 3: Re-lock realizedProfit immediately if the order is already delivered
  // instead of setting it to null and relying on the analytics reducer's fallback.
  // This makes the intent explicit and avoids any ambiguity in the reducer path.
  order.estimatedProfit = newItemsRevenue - recalcTotalCost;
if (order.status === "delivered") {
  order.realizedProfit = newItemsRevenue - recalcTotalCost;
}else {
    order.realizedProfit = null; // Will be set again when delivered
  }

  // depositAmount stays locked — the customer already paid it.
  // dueAmount absorbs the full price delta from the exchange.
  order.dueAmount = newTotalPrice - order.depositAmount;

  // Append to the audit log (never overwrite previous exchanges)
  order.isExchanged = true;
  if (!order.exchangedProducts) order.exchangedProducts = [];
  order.exchangedProducts.push(...exchanges);
  order.exchangeReason = exchangeReason || order.exchangeReason || "Customer exchange";

  await order.save();

  // Per-item summary for the response — show both selling prices and final prices
  // so the caller can display the full breakdown to the customer.

  const exchangeSummary = exchanges.map((e) => ({
    
    originalProductId: e.originalProductId,
    newProductId: e.newProductId,
    quantity: e.quantity,
    originalSellingPrice: e.originalSellingPrice.toFixed(2),
    originalDiscountPct: e.originalDiscountPct,
    originalFinalPricePerUnit: e.originalFinalPrice.toFixed(2),
    newSellingPrice: e.newSellingPrice.toFixed(2),
    newDiscountPct: e.newDiscountPct,
    newFinalPricePerUnit: e.newFinalPrice.toFixed(2),
    differencePerUnit: (e.newFinalPrice - e.originalFinalPrice).toFixed(2),
    totalLineDifference: e.priceAdjustment.toFixed(2),
  }));

  res.json({
    success: true,
    message: "Order products exchanged successfully",
    data: {
      orderId: order._id,
      exchangeSummary,
      totalPriceAdjustment: totalPriceAdjustment.toFixed(2),
      previousTotalPrice: (newTotalPrice - totalPriceAdjustment).toFixed(2),
      newTotalPrice: newTotalPrice.toFixed(2),
      depositAlreadyPaid: order.depositAmount.toFixed(2),
      newDueAmount: order.dueAmount.toFixed(2),
      exchangeReason: order.exchangeReason,
      updatedOrder: order,
    },
  });
});