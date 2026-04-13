"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resetPassword = exports.forgetCode = exports.login = exports.signup = void 0;

var _joi = _interopRequireDefault(require("joi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var signup = _joi["default"].object({
  userName: _joi["default"].string().required().max(20).min(2),
  email: _joi["default"].string().required(),
  password: _joi["default"].string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required(),
  confirmPassword: _joi["default"].string().valid(_joi["default"].ref("password")).required(),
  role: _joi["default"].string().valid("user", "admin", "cashier")["default"]("user")
}).required();

exports.signup = signup;

var login = _joi["default"].object({
  email: _joi["default"].string().required(),
  password: _joi["default"].string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required()
}).required();

exports.login = login;

var forgetCode = _joi["default"].object({
  email: _joi["default"].string().email().required()
}).required();

exports.forgetCode = forgetCode;

var resetPassword = _joi["default"].object({
  email: _joi["default"].string().required(),
  password: _joi["default"].string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required(),
  confirmPassword: _joi["default"].string().valid(_joi["default"].ref("password")).required(),
  forgetCode: _joi["default"].string().length(5).required()
}).required();

exports.resetPassword = resetPassword;