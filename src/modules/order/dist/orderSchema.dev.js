"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exchangeOrderProducts = exports.returnOrder = exports.deleteOrder = exports.financeAnalytics = exports.confirmDeposit = exports.updateOrderStatus = exports.createOrder = void 0;

var _joi = _interopRequireDefault(require("joi"));

var _validationMiddleware = require("../../middlewares/validationMiddleware.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var createOrder = _joi["default"].object({
  products: _joi["default"].array().items(_joi["default"].object({
    productId: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
    quantity: _joi["default"].number().integer().min(1).optional(),
    // optional — falls back to product default
    color: _joi["default"].string().optional(),
    size: _joi["default"].string().optional()
  })).min(1).required(),
  customerName: _joi["default"].string().required(),
  phone: _joi["default"].string().required(),
  email: _joi["default"].string().email().required(),
  address: _joi["default"].string().required(),
  government: _joi["default"].string().required(),
  shippingCost: _joi["default"].number().min(0).required(),
  depositPaymentMethod: _joi["default"].string().valid("vodafone_cash").required(),
  duePaymentMethod: _joi["default"].string().valid("vodafone_cash", "cash_on_delivery").required(),
  source: _joi["default"].string().valid("online", "store").optional(),
  notes: _joi["default"].string().optional() // FIX: was missing — controller destructures and saves it

});

exports.createOrder = createOrder;

var updateOrderStatus = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
  // FIX: "delivered" and "cancelled" were missing.
  // The controller sets paymentStatus = "completed" on "delivered",
  // so blocking it here would silently prevent that transition.
  status: _joi["default"].string().valid("pending", "confirmed", "shipped", "delivered", "cancelled").required(),
  notes: _joi["default"].string()
});

exports.updateOrderStatus = updateOrderStatus;

var confirmDeposit = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required()
});

exports.confirmDeposit = confirmDeposit;

var financeAnalytics = _joi["default"].object({
  id: _joi["default"].any().forbidden(),
  startDate: _joi["default"].date().optional(),
  endDate: _joi["default"].date().optional()
});

exports.financeAnalytics = financeAnalytics;

var deleteOrder = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required()
});

exports.deleteOrder = deleteOrder;

var returnOrder = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
  returnReason: _joi["default"].string().optional()
});

exports.returnOrder = returnOrder;

var exchangeOrderProducts = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
  exchangeItems: _joi["default"].array().items(_joi["default"].object({
    // FIX: was joi.number().integer() — the controller now looks up line items
    // by their Mongoose subdocument _id (a MongoDB ObjectId string), not by
    // array index. An integer would always fail the order.products.id() lookup.
    originalLineItemId: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
    newProductId: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
    quantity: _joi["default"].number().integer().min(1).required(),
    newColor: _joi["default"].string().optional(),
    newSize: _joi["default"].string().optional()
  })).min(1).required(),
  exchangeReason: _joi["default"].string().optional()
});

exports.exchangeOrderProducts = exchangeOrderProducts;