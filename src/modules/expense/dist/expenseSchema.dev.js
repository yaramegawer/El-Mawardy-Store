"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateExpenseSchema = exports.createExpenseSchema = void 0;

var _joi = _interopRequireDefault(require("joi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var createExpenseSchema = _joi["default"].object({
  description: _joi["default"].string().required(),
  amount: _joi["default"].number().positive().required(),
  category: _joi["default"].string().required(),
  paymentMethod: _joi["default"].string().valid("vodafone_cash", "cash", "bank")["default"]("cash"),
  notes: _joi["default"].string()
});

exports.createExpenseSchema = createExpenseSchema;

var updateExpenseSchema = _joi["default"].object({
  description: _joi["default"].string(),
  amount: _joi["default"].number().positive(),
  category: _joi["default"].string(),
  paymentMethod: _joi["default"].string().valid("vodafone_cash", "cash", "bank"),
  notes: _joi["default"].string()
});

exports.updateExpenseSchema = updateExpenseSchema;