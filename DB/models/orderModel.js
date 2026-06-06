import { model, Schema, Types } from "mongoose";

const orderSchema = new Schema(
  {
    customerName: { type: String, required: true },
    phone:        { type: String, required: true },
    email:        { type: String },
    address:      { type: String, required: true },
    government:   { type: String, required: true },

    products: [
      {
        // _id is declared explicitly with a default so Mongoose always generates
        // one — even for subdocuments pushed as plain objects during exchanges.
        // The exchange controller looks up line items by _id.toString() comparison,
        // so a missing or undefined _id means the item can never be found.
        _id:                { type: Types.ObjectId, default: () => new Types.ObjectId() },
        productId:          { type: Types.ObjectId, ref: "Product", required: true },
        quantity:           { type: Number, required: true },
        price:              { type: Number, required: true },  // snapshot selling price (pre-discount)
        discountPercentage: { type: Number, default: 0 },      // snapshot discount %
        discountAmount:     { type: Number, default: 0 },      // discount amount per unit
        finalPrice:         { type: Number, required: true },  // selling price after discount
        costPrice:          { type: Number, required: true },  // snapshot buy price
        color:              { type: String },
        size:               { type: String },
      },
    ],

    shippingCost:  { type: Number, required: true },
    itemsPrice:    { type: Number, required: true }, // sum of (price × qty) before discount
    totalDiscount: { type: Number, default: 0 },     // sum of (discountAmount × qty)
    totalPrice:    { type: Number, required: true }, // itemsPrice - totalDiscount + shippingCost
    totalCost:     { type: Number, required: true }, // sum of (costPrice × qty)
    
    // ── Financial Metrics ──────────────────────────────────────────────────────
    // Revenue = itemsPrice - totalDiscount (product sales only, excl. shipping)
    // Shipping is a service fee, not product revenue
    estimatedProfit: { type: Number, required: true }, // calculated at creation: (itemsPrice - totalDiscount) - totalCost
    realizedProfit:  { type: Number, default: null }, // set only when status becomes "delivered"
    
    itemsCount:    { type: Number, required: true }, // total units across all line items

    depositAmount:        { type: Number, required: true },                                   // 50% of totalPrice
    depositPaymentMethod: { type: String, enum: ["vodafone_cash"], required: true },
    dueAmount:            { type: Number, required: true },                                   // totalPrice - depositAmount (adjusts after exchange)
    duePaymentMethod:     { type: String, enum: ["vodafone_cash", "cash_on_delivery"], required: true },

    orderDate:        { type: Date, default: Date.now },
    paymentStatus:    { type: String, enum: ["pending", "deposit_sent", "completed", "deposit_returned"], default: "pending" },
    depositConfirmed: { type: Boolean, default: false }, // set true by moderator via confirm-deposit

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled","returned","exchanged"],
      default: "pending",
    },

    source: { type: String, enum: ["online", "store"], default: "online" },
    notes:  { type: String },

    // ── Returns ────────────────────────────────────────────────────────────────
    // Order-level fields (deprecated - kept for backward compatibility)
    isReturned:   { type: Boolean, default: false },
    returnAmount: { type: Number,  default: 0 },
    returnReason: { type: String },
    returnDate:   { type: Date },
    refundStatus: { type: String, enum: ["none", "pending", "processed"], default: "none" },
    refundDate:   { type: Date },

    // Item-level returns (new implementation)
    returnedProducts: [
      {
        originalLineItemId: { type: Types.ObjectId, required: true }, // Reference to order.products._id
        productId:          { type: Types.ObjectId, ref: "Product", required: true },
        quantity:           { type: Number, required: true },

        // Price snapshot at time of return
        originalSellingPrice: { type: Number }, // pre-discount selling price per unit
        originalDiscountPct:  { type: Number, default: 0 },
        originalFinalPrice:   { type: Number }, // post-discount price per unit (what was charged)

        // Return calculation
        returnAmount: { type: Number, required: true }, // quantity * originalFinalPrice

        // Status tracking
        status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },

        // Dates
        requestDate:  { type: Date, default: Date.now },
        approvedDate: { type: Date },
        completedDate: { type: Date },

        // Reason
        returnReason: { type: String, required: true },
      },
    ],

    // ── Exchanges ──────────────────────────────────────────────────────────────
    isExchanged: { type: Boolean, default: false },

    // FIX: fields aligned with what the controller pushes.
    // Old schema had only originalPrice / newPrice (post-discount numbers stored
    // under ambiguous names). Controller now stores full price breakdown so the
    // dashboard can display pre-discount prices, discount %, and final prices.
    // Old stale field `exchangeProductId` (single ObjectId, never written) removed.
    exchangedProducts: [
      {
        originalLineItemId: { type: Types.ObjectId, required: true }, // Reference to order.products._id
        originalProductId:   { type: Types.ObjectId, ref: "Product", required: true },
        newProductId:        { type: Types.ObjectId, ref: "Product", required: true },
        quantity:            { type: Number, required: true },

        // Original line item prices at time of exchange
        originalSellingPrice: { type: Number }, // pre-discount selling price per unit
        originalDiscountPct:  { type: Number, default: 0 },
        originalFinalPrice:   { type: Number }, // post-discount price per unit (what was charged)

        // Replacement product prices at time of exchange
        newSellingPrice: { type: Number }, // pre-discount selling price per unit
        newDiscountPct:  { type: Number, default: 0 },
        newFinalPrice:   { type: Number }, // post-discount price per unit (what will be charged)

        // (newFinalPrice - originalFinalPrice) × quantity — positive means customer owes more
        priceAdjustment: { type: Number, default: 0 },

        // Status tracking
        status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },

        // Dates
        requestDate:  { type: Date, default: Date.now },
        approvedDate: { type: Date },
        completedDate: { type: Date },

        // Variant information
        newColor: { type: String },
        newSize:  { type: String },
      },
    ],
    priceWithoutShipping:Number,

    exchangeReason: { type: String },
  },
  { timestamps: true }
);

export const Order = model("Order", orderSchema);