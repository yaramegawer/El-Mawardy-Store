import { model, Schema, Types } from "mongoose";

const orderSchema = new Schema(
  {
    customerName: { type: String, required: true },
    phone:        { type: String, required: true },
    email:        { type: String, required: true },
    address:      { type: String, required: true },
    government:   { type: String, required: true },

    products: [
      {
        _id:                { type: Types.ObjectId, default: () => new Types.ObjectId() },
        productId:          { type: Types.ObjectId, ref: "Product", required: true },
        quantity:           { type: Number, required: true },
        price:              { type: Number, required: true },  // snapshot selling price (pre-discount)
        discountPercentage: { type: Number, default: 0 },
        discountAmount:     { type: Number, default: 0 },      // discount amount per unit
        finalPrice:         { type: Number, required: true },  // selling price after discount
        costPrice:          { type: Number, required: true },  // snapshot buy price
        color:              { type: String },
        size:               { type: String },
      },
    ],

    shippingCost:  { type: Number, required: true },
    itemsPrice:    { type: Number, required: true }, // sum of (price × qty) before discount
    totalDiscount: { type: Number, default: 0 },
    totalPrice:    { type: Number, required: true }, // itemsPrice - totalDiscount + shippingCost
    totalCost:     { type: Number, required: true }, // sum of (costPrice × qty)

    // ── Financial Metrics ──────────────────────────────────────────────────────
    // Revenue = itemsPrice - totalDiscount (product sales only, excl. shipping)
    // realizedProfit is set only when status becomes "delivered"
    realizedProfit: { type: Number, default: null },

    itemsCount: { type: Number, required: true },

    depositAmount:        { type: Number, required: true },
    depositPaymentMethod: { type: String, enum: ["vodafone_cash"], required: true },
    dueAmount:            { type: Number, required: true },
    duePaymentMethod:     { type: String, enum: ["vodafone_cash", "cash_on_delivery"], required: true },

    orderDate:        { type: Date, default: Date.now },
    paymentStatus:    { type: String, enum: ["pending", "deposit_sent", "completed", "deposit_returned"], default: "pending" },
    depositConfirmed: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },

    source: { type: String, enum: ["online", "store"], default: "online" },
    notes:  { type: String },

    // ── Returns ────────────────────────────────────────────────────────────────
    isReturned:   { type: Boolean, default: false },
    returnAmount: { type: Number,  default: 0 },
    returnReason: { type: String },
    returnDate:   { type: Date },
    refundStatus: { type: String, enum: ["none", "pending", "processed"], default: "none" },
    refundDate:   { type: Date },

    // ── Exchanges ──────────────────────────────────────────────────────────────
    isExchanged: { type: Boolean, default: false },

    exchangedProducts: [
      {
        originalProductId:    { type: Types.ObjectId, ref: "Product" },
        newProductId:         { type: Types.ObjectId, ref: "Product" },
        quantity:             { type: Number },
        originalSellingPrice: { type: Number },
        originalDiscountPct:  { type: Number, default: 0 },
        originalFinalPrice:   { type: Number },
        newSellingPrice:      { type: Number },
        newDiscountPct:       { type: Number, default: 0 },
        newFinalPrice:        { type: Number },
        priceAdjustment:      { type: Number, default: 0 },
        exchangeDate:         { type: Date, default: Date.now },
      },
    ],

    priceWithoutShipping: { type: Number },
    exchangeReason:       { type: String },
  },
  { timestamps: true }
);

export const Order = model("Order", orderSchema);