// POST /api/orders
// GET /api/orders
// GET /api/orders/:id
// PATCH /api/orders/:id
// PATCH /api/orders/:id/confirm-deposit
// DELETE /api/orders/:id

import { Order } from "../../../DB/models/orderModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Types } from "mongoose";


export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    products, customerName, phone, email, address, government,
    shippingCost, depositPaymentMethod, duePaymentMethod, notes, source
  } = req.body;

  let itemsPrice = 0;
  let totalDiscount = 0;
  let totalCost = 0;
  let totalItems = 0;
  const orderProducts = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
    }

    const orderQuantity = item.quantity || product.quantity || 1;

    if (orderQuantity > product.stock) {
      return next(new Error(`Insufficient stock for product ${product.name}`, { cause: 400 }));
    }

    const snapshotPrice = product.price;
    const snapshotCostPrice = product.buyPrice;
    const snapshotDiscount = product.discount || 0;

    if (snapshotCostPrice == null) {
      return next(new Error(
        `Product ${product.name} must have a buyPrice to calculate finance metrics`,
        { cause: 400 }
      ));
    }

    const productDiscountAmount = (snapshotPrice * snapshotDiscount) / 100;
    const productFinalPrice = snapshotPrice - productDiscountAmount;

    const snapshotColor = item.color || product.color;
    const snapshotSize = item.size || product.size;

    itemsPrice += orderQuantity * snapshotPrice;
    totalDiscount += orderQuantity * productDiscountAmount;
    totalCost += orderQuantity * snapshotCostPrice;
    totalItems += orderQuantity;

    orderProducts.push({
      productId: item.productId,
      quantity: orderQuantity,
      price: snapshotPrice,
      discountPercentage: snapshotDiscount,
      discountAmount: productDiscountAmount,
      finalPrice: productFinalPrice,
      costPrice: snapshotCostPrice,
      color: snapshotColor,
      size: snapshotSize,
    });
  }

  const itemsPriceAfterDiscount = itemsPrice - totalDiscount;
  const totalPrice = itemsPriceAfterDiscount + shippingCost;

  // FIX: profit = revenue from items (after discount) minus cost of goods.
  // Shipping cost is not product revenue, so it must not inflate profit.
  const profit = itemsPriceAfterDiscount - totalCost;

  const depositAmount = totalPrice * 0.5;
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
    totalDiscount,
    totalPrice,
    totalCost,
    profit,           // FIX: was (totalPrice - totalCost), which over-counted shipping
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
      totalDiscount: totalDiscount.toFixed(2),
      shippingCost,
      totalPrice: totalPrice.toFixed(2),
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

  res.json({
    success: true,
    message: "Orders retrieved successfully",
    data: paginatedOrders,
    pagination: { page, limit, total },
  });
});


export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  res.json({ success: true, message: "Order retrieved successfully", data: order });
});


export const getFinanceAnalytics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  // FIX: Include all orders (pending included) so we can catch all Deposits and Returns.
  // We remove `isReturned: { $ne: true }` so the database doesn't silently hide returned orders.
  const filter = {
    status: { $in: [ "confirmed", "shipped", "delivered"] }
  };
  if (startDate || endDate) {
    filter.orderDate = {};
    if (startDate) filter.orderDate.$gte = new Date(startDate);
    if (endDate) filter.orderDate.$lte = new Date(endDate);
  }
  const orders = await Order.find(filter).populate("products.productId", "name");
  const summary = orders.reduce(
    (acc, order) => {
      // 1. ADD RETURNS & DEPOSITS (We do this for ALL orders)
      acc.totalReturns += order.returnAmount || 0;
      
      if (order.depositConfirmed && order.source !== "store") {
        acc.totalDeposits += order.depositAmount || 0;
      }
      // 2. BLOCK PENDING OR FULLY RETURNED ORDERS FROM REVENUE
      // We gathered their deposits/returns above, but we stop here so they don't break our profit margins!
      if (order.isReturned || order.status === "pending") {
         return acc;
      }
      // 3. REVENUE & PROFIT LOGIC (Only runs for active, unreturned orders)
      const orderCost =
        order.totalCost != null
          ? order.totalCost
          : order.products.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
      const orderProfit =
        order.profit != null
          ? order.profit
          : order.totalPrice - order.shippingCost - order.totalDiscount - orderCost;
      const orderItems =
        order.itemsCount != null
          ? order.itemsCount
          : order.products.reduce((sum, item) => sum + item.quantity, 0);
      const totalDiscount = order.totalDiscount || 0;
      acc.totalOrders += 1;
      acc.totalRevenue += order.totalPrice || 0;
      acc.totalShipping += order.shippingCost || 0;
      acc.totalDiscount += totalDiscount;
      acc.totalCost += orderCost;
      acc.totalProfit += orderProfit;
      acc.totalItemsSold += orderItems;
      // 4. PRODUCT BREAKDOWN MATH
      order.products.forEach((item) => {
        const id = item.productId?._id?.toString() || item.productId.toString();
        const name = item.productId?.name || "Unknown product";
        const itemCost = item.costPrice || 0;
        const itemDiscountAmount = item.discountAmount || 0;
        const itemOriginalRevenue = item.price || 0;
        
        const itemFinalRevenue =
          item.finalPrice != null
            ? item.finalPrice
            : itemOriginalRevenue - itemDiscountAmount;
        const itemProfit = itemFinalRevenue - itemCost;
        if (!acc.products[id]) {
          acc.products[id] = {
            productId: id,
            name,
            quantitySold: 0,
            originalRevenue: 0,
            discount: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        acc.products[id].quantitySold += item.quantity;
        acc.products[id].originalRevenue += item.quantity * itemOriginalRevenue;
        acc.products[id].discount += item.quantity * itemDiscountAmount;
        acc.products[id].revenue += item.quantity * itemFinalRevenue;
        acc.products[id].cost += item.quantity * itemCost;
        acc.products[id].profit += item.quantity * itemProfit;
      });
      return acc;
    },
    {
      totalOrders: 0,
      totalRevenue: 0,
      totalShipping: 0,
      totalDiscount: 0,
      totalCost: 0,
      totalProfit: 0,
      totalItemsSold: 0,
      totalReturns: 0,
      totalDeposits: 0,
      products: {},
    }
  );
  const productBreakdown = Object.values(summary.products).sort((a, b) => b.revenue - a.revenue);
  res.json({
    success: true,
    message: "Finance analytics retrieved successfully",
    data: {
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      totalShipping: summary.totalShipping,
      totalDiscount: summary.totalDiscount,
      totalCost: summary.totalCost,
      totalProfit: summary.totalProfit,
      totalItemsSold: summary.totalItemsSold,
      totalReturns: summary.totalReturns,
      totalDeposits: summary.totalDeposits,
      depositPercentage: summary.totalRevenue ? (summary.totalDeposits / summary.totalRevenue) * 100 : 0,
      averageOrderValue: summary.totalOrders ? summary.totalRevenue / summary.totalOrders : 0,
      averageProfitPerItem: summary.totalItemsSold
        ? summary.totalProfit / summary.totalItemsSold
        : 0,
      productBreakdown,
    },
  });
});


export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status,notes } = req.body;
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

  // FIX: mark payment as completed when the order is delivered
  if (status === "delivered") {
    order.paymentStatus = "completed";
  }

  order.status = status;
  order.notes=notes;
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
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.isReturned) {
    return next(new Error("Order has already been returned", { cause: 400 }));
  }

  // FIX: only restore stock if the deposit was confirmed (i.e. stock was actually
  // decremented when the deposit was confirmed). Returning an unconfirmed order
  // should never touch stock.
  if (order.depositConfirmed) {
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }
  }

  const returnAmount = order.totalPrice;

  order.isReturned = true;
  order.returnAmount = returnAmount;
  order.returnReason = returnReason || "Customer return";
  order.returnDate = new Date();
  order.refundStatus = "pending";

  await order.save();

  res.json({
    success: true,
    message: "Order returned successfully" + (order.depositConfirmed ? " and stock restored" : ""),
    data: {
      orderId: order._id,
      returnAmount: returnAmount.toFixed(2),
      returnReason: order.returnReason,
      refundStatus: order.refundStatus,
      stockRestored: order.depositConfirmed ? order.itemsCount : 0,
    },
  });
});


// PATCH /api/orders/:id/exchange — swap products within an existing order
export const exchangeOrderProducts = asyncHandler(async (req, res, next) => {
  const { exchangeItems, exchangeReason } = req.body;

  // exchangeItems: [{ originalLineItemId, newProductId, quantity, newColor, newSize }]
  //
  // originalLineItemId is the Mongoose subdocument _id of the line item inside
  // order.products (e.g. "6643a1f2e4b09c1234567890"). Using the subdocument _id
  // instead of an array index is safe: indices shift whenever a partial exchange
  // pushes a new line into order.products within the same request, which would cause
  // a subsequent exchange in the same batch to silently target the wrong product.

  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if(order.isExchanged){
     return next(
      new Error("Cannot exchange order already been exchanged before", {
        cause: 403,
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
    const originalDiscountPct  = originalProduct.discountPercentage || 0;
    const originalDiscountAmt  = originalProduct.discountAmount != null
      ? originalProduct.discountAmount
      : (originalSellingPrice * originalDiscountPct) / 100;
    const originalFinalPrice   = originalProduct.finalPrice != null
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
    const newDiscountPct  = newProduct.discount || 0;
    const newDiscountAmt  = (newSellingPrice * newDiscountPct) / 100;
    const newFinalPrice   = newSellingPrice - newDiscountAmt;

    // Price adjustment is based on finalPrice (what is actually charged),
    // not the pre-discount price — this is what flows into totalPrice / dueAmount.
    const priceAdjustment = (newFinalPrice - originalFinalPrice) * quantity;

    // Stock: return the original units, reserve the new ones
    await Product.findByIdAndUpdate(originalProduct.productId, { $inc: { stock: quantity } });
    await Product.findByIdAndUpdate(newProductId, { $inc: { stock: -quantity } });

    // Audit log — store both the pre-discount selling price AND the final
    // (post-discount) price so the dashboard can display either.
    exchanges.push({
      originalProductId:    originalProduct.productId,
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
      originalProduct.productId         = newProductId;
      originalProduct.price             = newSellingPrice;
      originalProduct.discountPercentage = newDiscountPct;
      originalProduct.discountAmount    = newDiscountAmt;
      originalProduct.finalPrice        = newFinalPrice;
      originalProduct.costPrice         = newProduct.buyPrice || 0;
      originalProduct.color =
        newColor || (Array.isArray(newProduct.color) ? newProduct.color[0] : newProduct.color);
      originalProduct.size =
        newSize  || (Array.isArray(newProduct.size)  ? newProduct.size[0]  : newProduct.size);
    } else {
      // Partial exchange — shrink the original line, add a new one for the replacement
      originalProduct.quantity -= quantity;

      // Explicitly assign _id so Mongoose registers this as a proper subdocument.
      // Without it, order.products.id() cannot find this entry in future exchanges
      // because plain object literals pushed into a DocumentArray don't get an _id
      // tracked by Mongoose unless one is provided at push time.
      order.products.push({
        _id:                new Types.ObjectId(),
        productId:          newProductId,
        quantity,
        price:              newSellingPrice,
        discountPercentage: newDiscountPct,
        discountAmount:     newDiscountAmt,
        finalPrice:         newFinalPrice,
        costPrice:          newProduct.buyPrice || 0,
        color: newColor || (Array.isArray(newProduct.color) ? newProduct.color[0] : newProduct.color),
        size:  newSize  || (Array.isArray(newProduct.size)  ? newProduct.size[0]  : newProduct.size),
      });
    }
  }

  // Recalculate order totals from scratch after all line-item mutations
  let recalcItemsPrice    = 0;
  let recalcTotalDiscount = 0;
  let recalcTotalCost     = 0;
  let recalcItemsCount    = 0;

  for (const product of order.products) {
    const sellingPrice   = product.price || 0;
    const discountAmount = (sellingPrice * (product.discountPercentage || 0)) / 100;
    const finalPrice     = sellingPrice - discountAmount;

    // Keep stored fields consistent with recalculated values
    product.finalPrice    = finalPrice;
    product.discountAmount = discountAmount;

    const qty = product.quantity || 0;
    recalcItemsPrice    += sellingPrice * qty;
    recalcTotalDiscount += discountAmount * qty;
    recalcTotalCost     += (product.costPrice || 0) * qty;
    recalcItemsCount    += qty;
  }

  order.itemsPrice    = recalcItemsPrice;
  order.totalDiscount = recalcTotalDiscount;
  order.totalCost     = recalcTotalCost;
  order.itemsCount    = recalcItemsCount;

  const newItemsRevenue = recalcItemsPrice - recalcTotalDiscount;
  const newTotalPrice   = newItemsRevenue + order.shippingCost;

  order.totalPrice = newTotalPrice;
  order.profit     = newItemsRevenue - recalcTotalCost;

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
    originalProductId:        e.originalProductId,
    newProductId:             e.newProductId,
    quantity:                 e.quantity,
    originalSellingPrice:     e.originalSellingPrice.toFixed(2),
    originalDiscountPct:      e.originalDiscountPct,
    originalFinalPricePerUnit: e.originalFinalPrice.toFixed(2),
    newSellingPrice:          e.newSellingPrice.toFixed(2),
    newDiscountPct:           e.newDiscountPct,
    newFinalPricePerUnit:     e.newFinalPrice.toFixed(2),
    differencePerUnit:        (e.newFinalPrice - e.originalFinalPrice).toFixed(2),
    totalLineDifference:      e.priceAdjustment.toFixed(2),
  }));

  res.json({
    success: true,
    message: "Order products exchanged successfully",
    data: {
      orderId: order._id,
      exchangeSummary,
      totalPriceAdjustment: totalPriceAdjustment.toFixed(2),
      previousTotalPrice:   (newTotalPrice - totalPriceAdjustment).toFixed(2),
      newTotalPrice:        newTotalPrice.toFixed(2),
      depositAlreadyPaid:   order.depositAmount.toFixed(2),
      newDueAmount:         order.dueAmount.toFixed(2),
      exchangeReason:       order.exchangeReason,
      updatedOrder:         order,
    },
  });
});