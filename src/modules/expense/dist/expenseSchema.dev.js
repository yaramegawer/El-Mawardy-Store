"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createExpenseSchema = void 0;

var _joi = _interopRequireDefault(require("joi"));

var _Joi$string, _Joi$string2;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var validCategories = ["rent", "utilities", "marketing", "salaries", "supplies", "maintenance", "shipping", "ads", "vodafone_cash", "other_operating"];
var validPaymentMethods = ["vodafone_cash", "cash", "bank"];

var createExpenseSchema = _joi["default"].object({
  description: _joi["default"].string().trim().min(1).required(),
  amount: _joi["default"].number().positive().required(),
  category: (_Joi$string = _joi["default"].string()).valid.apply(_Joi$string, validCategories).required(),
  paymentMethod: (_Joi$string2 = _joi["default"].string()).valid.apply(_Joi$string2, validPaymentMethods)["default"]("cash"),
  notes: _joi["default"].string().trim().allow("")
});

exports.createExpenseSchema = createExpenseSchema;