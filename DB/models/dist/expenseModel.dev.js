"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Expense = void 0;

var _mongoose = require("mongoose");

var expenseSchema = new _mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  // e.g., "vodafone_cash", "shipping", "utilities", etc.
  date: {
    type: Date,
    "default": Date.now
  },
  paymentMethod: {
    type: String,
    "enum": ["vodafone_cash", "cash", "bank"],
    "default": "cash"
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});
var Expense = (0, _mongoose.model)("Expense", expenseSchema);
exports.Expense = Expense;