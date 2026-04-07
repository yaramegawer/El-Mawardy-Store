
// POST /api/orders
// GET /api/orders
// GET /api/orders/:id
// PATCH /api/orders/:id
// PATCH /api/orders/:id/confirm-deposit
// DELETE /api/orders/:id


import { Order } from "../../../DB/models/orderModel.js";
import { Product } from "../../../DB/models/productModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";


export const createOrder = asyncHandler(async (req, res, next) => {
  const { products, customerName, phone, email, address, government, shippingCost, depositPaymentMethod, duePaymentMethod } = req.body;

  // Validate products and calculate items price
  let itemsPrice = 0;
  const orderProducts = []; // Store products with resolved quantities and prices
  
  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return next(new Error(`Product with ID ${item.productId} not found`, { cause: 404 }));
    }
    
    // Use provided quantity or fall back to product's default quantity
    const orderQuantity = item.quantity || product.quantity || 1;
    
    if (orderQuantity > product.stock) {
      return next(new Error(`Insufficient stock for product ${product.name}`, { cause: 400 }));
    }

    // Use current product price as snapshot
    const snapshotPrice = product.price;
    const snapshotColor = item.color || product.color;
    const snapshotSize = item.size || product.size;
    itemsPrice += orderQuantity * snapshotPrice;
    
    // Update product stock atomically to prevent race conditions
    await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -orderQuantity } });
    
    // Store product with resolved quantity, price, color and size
    orderProducts.push({
      productId: item.productId,
      quantity: orderQuantity,
      price: snapshotPrice,  // Price snapshot from product at order time
      color: snapshotColor,
      size: snapshotSize
    });
  }

  // Total price including shipping
  const totalPrice = itemsPrice + shippingCost;

  // Deposit & Due
  const depositAmount = itemsPrice * 0.5;
  const dueAmount = totalPrice - depositAmount;

  // Create order
  const order = await Order.create({
    products: orderProducts,  // Use products with resolved quantities
    customerName,
    phone,
    email,
    address,
    government,
    shippingCost,
    totalPrice,
    depositAmount,
    depositPaymentMethod: depositPaymentMethod || "vodafone_cash",
    dueAmount,
    duePaymentMethod: duePaymentMethod || "cash_on_delivery",
    paymentStatus: "pending",
    depositConfirmed: false,
    status: "pending",
    orderDate: Date.now()
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: order,
    depositInfo: {
      amount: depositAmount,
      paymentMethod: depositPaymentMethod || "vodafone_cash",
      instructions: `Please send 50% deposit (${depositAmount} EGP) to 01033727566 via Vodafone Cash for order #${order._id}. After sending, please message us on WhatsApp with your transaction details.`,
      whatsappLink: `https://wa.me/201033727566?text=${encodeURIComponent(`Hello, I sent ${depositAmount} EGP deposit for order ${order._id}. Transaction details: [Please add your transaction details here]`)}`
    }
  });
});

export const getAllOrders = asyncHandler(async (req, res, next) => {
  // Build filter object
  let filter = {};
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.customerName) {
    filter.customerName = { $regex: req.query.customerName, $options: 'i' }; // Case-insensitive search
  }
  
  if (req.query.phone) {
    filter.phone = req.query.phone;
  }
  
  if (req.query.depositConfirmed) {
    filter.depositConfirmed = req.query.depositConfirmed === 'true';
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const paginatedOrders = await Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

  res.json({
    success: true,
    message: "Orders retrieved successfully",
    data: paginatedOrders,
    pagination: {
      page,
      limit,
      total: await Order.countDocuments(filter)
    }
  });
});

export const getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) return next(new Error("Order not found!", { cause: 404 }));

  res.json({
    success: true,
    message: "Order retrieved successfully",
    data: order
  });
});


export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return next(new Error("Order not found!", { cause: 404 }));

    order.status = status;
    if (status === "confirmed" && order.depositConfirmed) {
        order.paymentStatus = "deposit_sent";
    } else if (status === "confirmed" && !order.depositConfirmed) {
        return next(new Error("Cannot confirm order: deposit not yet confirmed by moderator", { cause: 400 }));
    }
    await order.save();

    res.json({
        success: true,
        message: "Order status updated successfully",
        data: order
    });
});

// PATCH /api/orders/:id/confirm-deposit
export const confirmDeposit = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new Error("Order not found!", { cause: 404 }));

    order.depositConfirmed = true;
    order.paymentStatus = "deposit_sent";
    await order.save();

    res.json({
        success: true,
        message: "Deposit confirmed successfully",
        data: order
    });
});


// DELETE /api/orders/:id
export const deleteOrder = asyncHandler(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new Error("Order not found!", { cause: 404 }));
    await order.deleteOne();
    res.json({
        success: true,
        message: "Order deleted successfully"
    });
});