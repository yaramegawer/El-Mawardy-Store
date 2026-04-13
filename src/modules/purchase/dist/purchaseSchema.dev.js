"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updatePurchaseSchema = exports.createPurchaseSchema = void 0;

var _joi = _interopRequireDefault(require("joi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var createPurchaseSchema = _joi["default"].object({
  supplier: _joi["default"].string().required(),
  paymentMethod: _joi["default"].string().valid("cash", "vodafone_cash", "bank")["default"]("cash"),
  notes: _joi["default"].string()
});

exports.createPurchaseSchema = createPurchaseSchema;

var updatePurchaseSchema = _joi["default"].object({
  supplier: _joi["default"].string(),
  paymentMethod: _joi["default"].string().valid("cash", "vodafone_cash", "bank"),
  notes: _joi["default"].string()
});

exports.updatePurchaseSchema = updatePurchaseSchema;