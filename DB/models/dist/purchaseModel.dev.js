"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Purchase = void 0;

var _mongoose = require("mongoose");

var purchaseSchema = new _mongoose.Schema({
  supplier: {
    type: String,
    required: true
  },
  products: [{
    productId: {
      type: _mongoose.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    costPrice: {
      type: Number,
      required: true
    },
    totalCost: {
      type: Number,
      required: true
    } // quantity * costPrice

  }],
  totalCost: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    "default": Date.now
  },
  paymentMethod: {
    type: String,
    "enum": ["cash", "vodafone_cash", "bank"],
    "default": "cash"
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});
var Purchase = (0, _mongoose.model)("Purchase", purchaseSchema);
exports.Purchase = Purchase;