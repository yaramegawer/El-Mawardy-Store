"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateProduct = exports.deleteProduct = exports.createProduct = void 0;

var _joi = _interopRequireDefault(require("joi"));

var _validationMiddleware = require("../../middlewares/validationMiddleware.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var createProduct = _joi["default"].object({
  code: _joi["default"].string().required(),
  name: _joi["default"].string().max(50).required(),
  price: _joi["default"].number().required(),
  buyPrice: _joi["default"].number().required(),
  quantity: _joi["default"].number()["default"](1),
  color: _joi["default"].array().items(_joi["default"].string().required()).required(),
  size: _joi["default"].array().items(_joi["default"].string().required()).required(),
  description: _joi["default"].string().optional(),
  stock: _joi["default"].number()["default"](0),
  category: _joi["default"].string().required(),
  season: _joi["default"].string().required()
}).required();

exports.createProduct = createProduct;

var deleteProduct = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required()
}).required();

exports.deleteProduct = deleteProduct;

var updateProduct = _joi["default"].object({
  id: _joi["default"].string().custom(_validationMiddleware.isValidObjectId).required(),
  name: _joi["default"].string().max(50),
  price: _joi["default"].number(),
  buyPrice: _joi["default"].number(),
  quantity: _joi["default"].number(),
  color: _joi["default"].array().items(_joi["default"].string()),
  size: _joi["default"].array().items(_joi["default"].string()),
  description: _joi["default"].string(),
  stock: _joi["default"].number(),
  category: _joi["default"].string(),
  season: _joi["default"].string(),
  discount: _joi["default"].number().min(0).max(100).optional() // percentage discount (e.g., 20 for 20% off)

}).required();

exports.updateProduct = updateProduct;