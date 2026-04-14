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

    if (orderQuantity > product.stock) {
      return next(new Error(`Insufficient stock for product ${product.name}. Required: ${orderQuantity}, Available: ${product.stock}`, { cause: 400 }));
    }

    // product.price is already the final selling price (discount already applied in product model)
    const snapshotPrice = product.price;
    const snapshotCostPrice = product.buyPrice;

    if (snapshotCostPrice == null) {
      return next(new Error(
        `Product ${product.name} must have a buyPrice to calculate finance metrics`,
        { cause: 400 }
      ));
    }

    const snapshotColor = item.color || product.color;
    const snapshotSize = item.size || product.size;

    // Calculate discount properly - handle division by zero
    const discountPercentage = product.discount || 0;
    let originalPrice = snapshotPrice;
    let discountAmount = 0;
    
    if (discountPercentage > 0) {
      // If product has discount, calculate original price and discount amount
      originalPrice = snapshotPrice / (1 - discountPercentage / 100);
      discountAmount = originalPrice - snapshotPrice;
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
    orderDate: Date.now(),
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
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
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

  // Fetch all data in parallel for better performance
  let [orders, expenses, purchases, products] = await Promise.all([
    Order.find(createDateFilter("createdAt")).populate("products.productId", "name buyPrice stock"),
    Expense.find(createDateFilter("date")),
    Purchase.find(createDateFilter("date")),
    Product.find()
  ]);

  // If no orders found with date filter, fetch all orders
  if (orders.length === 0) {
    orders = await Order.find({}).populate("products.productId", "name buyPrice stock");
  }
  
  // If no expenses found with date filter, fetch all expenses
  if (expenses.length === 0) {
    expenses = await Expense.find({});
  }
  
  // If no purchases found with date filter, fetch all purchases
  if (purchases.length === 0) {
    purchases = await Purchase.find({});
  }

  // =============================
  // A. GROSS PROFIT CALCULATION: Sales Revenue - COGS (Units Sold * Purchase Price)
  // =============================
  let salesRevenue = 0; // Total sales from delivered orders
  let cogs = 0; // Cost of Goods Sold (Units Sold * Purchase Price)
  let totalRealizedProfit = 0;

  orders.forEach((order) => {
    // Skip cancelled and pending orders
    if (order.status === "cancelled" || order.status === "pending") return;

    const revenue = order.priceWithoutShipping || 0;
    const cost = order.totalCost || 0;

    // Include delivered orders in revenue and COGS
    if (order.status === "delivered") {
      salesRevenue += revenue;
      cogs += cost;
      
      const realProfit = order.realizedProfit != null ? order.realizedProfit : (revenue - cost);
      totalRealizedProfit += realProfit;
    }

    // Handle returned orders - subtract total price from treasury
    if (order.isReturned || order.status === "returned") {
      totalRealizedProfit -= (order.totalPrice || 0);
    }
  });

  const grossProfit = salesRevenue - cogs;

  // =============================
  // B. NET PROFIT CALCULATION: Gross Profit - Operating Expenses
  // =============================
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // =============================
  // D. DAILY TREASURY/CASHBOOK: Opening balance, inflows, outflows, closing balance
  // =============================
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's transactions for daily treasury
  const todayOrders = orders.filter(order => order.createdAt >= today && order.createdAt < tomorrow);
  const todayExpenses = expenses.filter(exp => exp.date >= today && exp.date < tomorrow);
  const todayPurchases = purchases.filter(pur => pur.date >= today && pur.date < tomorrow);

  // Calculate today's inflows (sales)
  const todayInflow = todayOrders.reduce((sum, order) => {
    if (order.status === "delivered") {
      return sum + (order.priceWithoutShipping || 0);
    }
    return sum;
  }, 0);

  // Calculate today's outflows (expenses + purchases + returns)
  const todayOutflow = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0) +
                       todayPurchases.reduce((sum, pur) => sum + pur.totalCost, 0) +
                       todayOrders.reduce((sum, order) => {
                         if (order.isReturned || order.status === "returned") {
                           return sum + (order.totalPrice || 0);
                         }
                         return sum;
                       }, 0);

  // Daily treasury calculation
  const dailyTreasury = todayInflow - todayOutflow;

  // =============================
  // C. TREASURY MANAGEMENT: Current balance of cash/bank accounts
  // =============================
  const totalPurchases = purchases.reduce((sum, pur) => sum + pur.totalCost, 0);
  
  // All-time treasury: Accumulate all values over time
  // Should include all historical sales, expenses, and purchases
  const allTimeTreasury = totalRealizedProfit - totalExpenses - totalPurchases;
  
  // Current treasury balance: All-time treasury minus daily treasury movements
  const treasuryBalance = allTimeTreasury - dailyTreasury;

  // =============================
  // E. GOODS FINANCE: Inventory Value Tracking
  // =============================
  // Calculate total inventory value (stock_quantity * purchase_price)
  const inventoryValue = products.reduce((sum, product) => {
    return sum + (product.stock * (product.buyPrice || 0));
  }, 0);

  // =============================
  // RESPONSE WITH COMPREHENSIVE FINANCIAL DATA
  // =============================
  res.json({
    success: true,
    message: "Financial analytics retrieved successfully",
    data: {
      // Core Financial Metrics
      grossProfit,           // Sales Revenue - COGS
      netProfit,             // Gross Profit - Operating Expenses
      totalRealizedProfit,   // Actual profit from delivered orders
      
      // Treasury Management
      allTimeTreasury,       // All-time accumulated treasury balance
      treasuryBalance,       // Current cash/bank balance (all-time minus daily)
      dailyTreasury,         // Today's net cash movement
      
      // Transaction Totals
      salesRevenue,          // Total sales revenue
      cogs,                  // Cost of Goods Sold
      totalExpenses,         // Operating expenses
      totalPurchases,        // Inventory purchases
      
      // Daily Treasury Details
      todayInflow,           // Today's cash inflows (sales)
      todayOutflow,          // Today's cash outflows (expenses + purchases + returns)
      
      // Goods Finance
      inventoryValue,        // Total inventory value (stock * purchase price)
      
      // Additional Metrics
      totalOrders: orders.filter(o => o.status !== "cancelled" && o.status !== "pending").length,
      deliveredOrders: orders.filter(o => o.status === "delivered").length,
      returnedOrders: orders.filter(o => o.isReturned || o.status === "returned").length,
    },
  });
});

// Add the missing function declaration
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

  // Atomically decrement stock for each product, but only if sufficient stock exists.
  // Using findOneAndUpdate with a { stock: { $gte: quantity } } condition collapses
  // the old validate-then-decrement two-loop pattern into a single DB call per product,
  // and eliminates the race condition where two concurrent confirmations for the same
  // product both pass the stock check before either one decrements.
  for (const item of order.products) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );

    if (!updated) {
      // Either the product doesn't exist, or stock dropped below the required quantity
      // between the order being placed and the deposit being confirmed.
      const product = await Product.findById(item.productId);
      if (!product) {
        return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
      }
      return next(
        new Error(
          `Insufficient stock for product ${product.name}. Required: ${item.quantity}, available: ${product.stock}`,
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

  // FIX: restore stock if the order had already reserved inventory (deposit confirmed)
  // and has not already been returned (which would have restored stock separately).
  if (order.depositConfirmed && !order.isReturned) {
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
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
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
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

    if (quantity > newProduct.stock) {
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

    // Stock: return the original units, reserve the new ones
    await Product.findByIdAndUpdate(originalProduct.productId, { $inc: { stock: quantity } });
    await Product.findByIdAndUpdate(newProductId, { $inc: { stock: -quantity } });

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
        newColor || (Array.isArray(newProduct.color) ? newProduct.color[0] : newProduct.color);
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
        color: newColor || (Array.isArray(newProduct.color) ? newProduct.color[0] : newProduct.color),
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