"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Treasury = void 0;

var _mongoose = require("mongoose");

var treasurySchema = new _mongoose.Schema({
  date: {
    type: Date,
    "default": Date.now,
    unique: true
  },
  dailyTreasury: {
    type: Number,
    "default": 0
  },
  // Today's profits, resets daily
  totalTreasury: {
    type: Number,
    "default": 0
  },
  // All accumulated profits
  expensesDeducted: {
    type: Number,
    "default": 0
  } // Expenses deducted today

}, {
  timestamps: true
});
var Treasury = (0, _mongoose.model)("Treasury", treasurySchema);
exports.Treasury = Treasury;