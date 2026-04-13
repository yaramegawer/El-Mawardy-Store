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

    const orderQuantity = item.quantity || product.quantity || 1;

    if (orderQuantity > product.stock) {
      return next(new Error(`Insufficient stock for product ${product.name}`, { cause: 400 }));
    }

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

    itemsPrice += orderQuantity * snapshotPrice;
    totalCost += orderQuantity * snapshotCostPrice;
    totalItems += orderQuantity;

    orderProducts.push({
      productId: item.productId,
      quantity: orderQuantity,
      price: snapshotPrice,
      discountPercentage: product.discount,
      discountAmount: (snapshotPrice / product.discount) - snapshotPrice,
      finalPrice: snapshotPrice,
      costPrice: snapshotCostPrice,
      color: snapshotColor,
      size: snapshotSize,
    });
  }

  const totalPrice = itemsPrice + shippingCost;
  const depositAmount = itemsPrice * 0.5;
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
    priceWithoutShipping: itemsPrice,
    realizedProfit: null, // set only when status becomes "delivered"
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


export const getFinanceAnalytics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {};
  if (startDate || endDate) {
    filter.orderDate = {};
    if (startDate) filter.orderDate.$gte = new Date(startDate);
    if (endDate) filter.orderDate.$lte = new Date(endDate);
  }
  const orders = await Order.find(filter).populate("products.productId", "name");

  const expenseFilter = {};
  if (startDate || endDate) {
    expenseFilter.date = {};
    if (startDate) expenseFilter.date.$gte = new Date(startDate);
    if (endDate) expenseFilter.date.$lte = new Date(endDate);
  }
  const expenses = await Expense.find(expenseFilter);

  const purchaseFilter = {};
  if (startDate || endDate) {
    purchaseFilter.date = {};
    if (startDate) purchaseFilter.date.$gte = new Date(startDate);
    if (endDate) purchaseFilter.date.$lte = new Date(endDate);
  }
  const purchases = await Purchase.find(purchaseFilter);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPurchases = purchases.reduce((sum, pur) => sum + pur.totalCost, 0);

  const summary = orders.reduce(
    (acc, order) => {
      // Always accumulate returns for all orders
      acc.totalReturns += order.returnAmount || 0;

      // Only count deposits for non-returned, non-cancelled, confirmed orders
      if (
        order.depositConfirmed &&
        order.source !== "store" &&
        order.status !== "cancelled" &&
        !order.isReturned &&
        order.paymentStatus !== "deposit_returned"
      ) {
        acc.totalDeposits += order.depositAmount || 0;
      }

      // Skip cancelled orders from revenue (track separately)
      if (order.status === "cancelled") {
        acc.totalCancelledProfit += Math.abs(order.realizedProfit || 0);
        return acc;
      }

      // Skip pending, returned orders from revenue
      if (order.isReturned || order.status === "pending" || order.status === "returned") {
        return acc;
      }

      // Only count confirmed, shipped, delivered
      if (order.status !== "confirmed" && order.status !== "shipped" && order.status !== "delivered") {
        return acc;
      }

      const orderCost =
        order.totalCost != null
          ? order.totalCost
          : order.products.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);

      const orderItems =
        order.itemsCount != null
          ? order.itemsCount
          : order.products.reduce((sum, item) => sum + item.quantity, 0);

      acc.totalOrders += 1;
      acc.totalRevenue += order.priceWithoutShipping || 0;
      acc.totalShipping += order.shippingCost || 0;
      acc.totalDiscount += order.totalDiscount || 0;
      acc.totalCost += orderCost;
      acc.totalItemsSold += orderItems;

      // realizedProfit is only set on delivered orders
      if (order.status === "delivered") {
        acc.totalRealizedProfit += order.realizedProfit || 0;
      }

      // Product breakdown
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
        const itemProfit = order.status === "delivered" ? itemFinalRevenue - itemCost : 0;

        if (!acc.products[id]) {
          acc.products[id] = {
            productId: id,
            name,
            quantitySold: 0,
            originalRevenue: 0,
            discount: 0,
            revenue: 0,
            cost: 0,
            realizedProfit: 0,
          };
        }
        acc.products[id].quantitySold += item.quantity;
        acc.products[id].originalRevenue += item.quantity * itemOriginalRevenue;
        acc.products[id].discount += item.quantity * itemDiscountAmount;
        acc.products[id].revenue += item.quantity * itemFinalRevenue;
        acc.products[id].cost += item.quantity * itemCost;
        acc.products[id].realizedProfit += item.quantity * itemProfit;
      });

      return acc;
    },
    {
      totalOrders: 0,
      totalRevenue: 0,
      totalShipping: 0,
      totalDiscount: 0,
      totalCost: 0,
      totalRealizedProfit: 0,
      totalItemsSold: 0,
      totalReturns: 0,
      totalDeposits: 0,
      totalCancelledProfit: 0,
      products: {},
    }
  );

  const productBreakdown = Object.values(summary.products).sort((a, b) => b.revenue - a.revenue);

  const netProfit = summary.totalRealizedProfit - totalExpenses;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayOrders = orders.filter(order => order.orderDate >= today && order.orderDate < tomorrow);
  const todayRealizedProfit = todayOrders.reduce((sum, order) => {
    return order.status === "delivered" ? sum + (order.realizedProfit || 0) : sum;
  }, 0);

  const todayExpenses = expenses.filter(exp => exp.date >= today && exp.date < tomorrow);
  const todayExpensesTotal = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const dailyTreasury = todayRealizedProfit - todayExpensesTotal;
  const totalTreasury = summary.totalRealizedProfit - totalExpenses - totalPurchases;

  res.json({
    success: true,
    message: "Finance analytics retrieved successfully",
    data: {
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      totalShipping: summary.totalShipping,
      totalDiscount: summary.totalDiscount,
      totalCost: summary.totalCost,
      totalRealizedProfit: summary.totalRealizedProfit,
      totalProfit: summary.totalRealizedProfit, // backwards compatibility
      totalCancelledProfit: summary.totalCancelledProfit,
      netProfit,
      totalItemsSold: summary.totalItemsSold,
      totalReturns: summary.totalReturns,
      totalDeposits: summary.totalDeposits,
      totalExpenses,
      totalPurchases,
      dailyTreasury,
      totalTreasury,
      depositPercentage: summary.totalRevenue ? (summary.totalDeposits / summary.totalRevenue) * 100 : 0,
      averageOrderValue: summary.totalOrders ? summary.totalRevenue / summary.totalOrders : 0,
      averageProfitPerItem: summary.totalItemsSold
        ? summary.totalRealizedProfit / summary.totalItemsSold
        : 0,
      productBreakdown,
      expenses,
      purchases,
    },
  });
});


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
        order.paymentStatus = "deposit_returned";
        order.refundStatus = "pending";
        order.returnAmount = order.depositAmount || 0;
        order.returnReason = "Order cancelled - deposit refund pending";
        order.refundDate = new Date();
      }
    }
    if (order.status !== "cancelled") {
      // Store negative realized profit to track the cancellation impact
      order.realizedProfit = -(order.totalCost || 0); // lost cost, no revenue recovered
      order.priceWithoutShipping = 0;
    }
  }

  if (status === "delivered") {
    order.paymentStatus = "completed";
    // RealizedProfit = Revenue (excl. shipping) - Cost of Goods
    const itemsPriceAfterDiscount = order.itemsPrice - order.totalDiscount;
    order.realizedProfit = itemsPriceAfterDiscount - order.totalCost;
  }

  if (paymentStatus) {
    if (status === "delivered" || status === "cancelled") {
      order.paymentStatus = paymentStatus;
    } else if (!status || (status !== "delivered" && status !== "cancelled")) {
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

  for (const item of order.products) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );

    if (!updated) {
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

  if (order.depositConfirmed && !order.isReturned) {
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
    }
  }

  await order.deleteOne();
  res.json({ success: true, message: "Order deleted successfully" });
});


// PATCH /api/orders/:id/return
export const returnOrder = asyncHandler(async (req, res, next) => {
  const { returnReason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.isReturned) {
    return next(new Error("Order has already been returned", { cause: 400 }));
  }

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
  order.status = "returned";
  order.paymentStatus = "deposit_returned";
  order.realizedProfit = null; // no profit realized on a returned order

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


// PATCH /api/orders/:id/exchange
export const exchangeOrderProducts = asyncHandler(async (req, res, next) => {
  const { exchangeItems, exchangeReason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  if (order.isExchanged) {
    return next(new Error("Cannot exchange order already been exchanged before", { cause: 403 }));
  }
  if (!order.depositConfirmed) {
    return next(
      new Error("Cannot exchange products on an order whose deposit has not been confirmed", { cause: 400 })
    );
  }

  let totalPriceAdjustment = 0;
  const exchanges = [];

  for (const exchange of exchangeItems) {
    const { originalLineItemId, newProductId, quantity, newColor, newSize } = exchange;

    const originalProduct = order.products.find(
      (p) => p._id && p._id.toString() === originalLineItemId.toString()
    );
    if (!originalProduct) {
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
        new Error(`Cannot exchange ${quantity} items — only ${originalProduct.quantity} in order`, { cause: 400 })
      );
    }

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
        new Error(`Insufficient stock for ${newProduct.name}. Available: ${newProduct.stock}`, { cause: 400 })
      );
    }

    const newSellingPrice = newProduct.price || 0;
    const newDiscountPct = newProduct.discount || 0;
    const newDiscountAmt = (newSellingPrice * newDiscountPct) / 100;
    const newFinalPrice = newSellingPrice - newDiscountAmt;

    const priceAdjustment = (newFinalPrice - originalFinalPrice) * quantity;

    await Product.findByIdAndUpdate(originalProduct.productId, { $inc: { stock: quantity } });
    await Product.findByIdAndUpdate(newProductId, { $inc: { stock: -quantity } });

    exchanges.push({
      originalProductId: originalProduct.productId,
      newProductId,
      quantity,
      originalSellingPrice,
      originalDiscountPct,
      originalFinalPrice,
      newSellingPrice,
      newDiscountPct,
      newFinalPrice,
      priceAdjustment,
    });

    totalPriceAdjustment += priceAdjustment;

    if (quantity === originalProduct.quantity) {
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
      originalProduct.quantity -= quantity;
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

  // Recalculate order totals from scratch
  let recalcItemsPrice = 0;
  let recalcTotalDiscount = 0;
  let recalcTotalCost = 0;
  let recalcItemsCount = 0;

  for (const product of order.products) {
    const sellingPrice = product.price || 0;
    const discountAmount = product.discountAmount != null
      ? product.discountAmount
      : (sellingPrice * (product.discountPercentage || 0)) / 100;

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
  order.priceWithoutShipping = newItemsRevenue;
  order.dueAmount = newTotalPrice - order.depositAmount;

  // Re-lock realizedProfit immediately if already delivered; otherwise clear it
  if (order.status === "delivered") {
    order.realizedProfit = newItemsRevenue - recalcTotalCost;
  } else {
    order.realizedProfit = null;
  }

  order.isExchanged = true;
  if (!order.exchangedProducts) order.exchangedProducts = [];
  order.exchangedProducts.push(...exchanges);
  order.exchangeReason = exchangeReason || order.exchangeReason || "Customer exchange";

  await order.save();

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