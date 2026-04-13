"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.User = void 0;

var _mongoose = require("mongoose");

var userSchema = new _mongoose.Schema({
  userName: {
    type: String,
    required: true,
    min: 2,
    max: 20
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  forgetCode: {
    type: String,
    length: 5
  },
  role: {
    type: String,
    "enum": ["user", "cashier", "admin"],
    "default": "user"
  }
}, {
  timestamps: true
});
var User = (0, _mongoose.model)("User", userSchema);
exports.User = User;