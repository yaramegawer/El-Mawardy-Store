"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = require("express");

var _expenseController = require("./expenseController.js");

var _validationMiddleware = require("../../middlewares/validationMiddleware.js");

var _expenseSchema = require("./expenseSchema.js");

var router = (0, _express.Router)();
router.post("/", (0, _validationMiddleware.validation)(_expenseSchema.createExpenseSchema), _expenseController.createExpense);
router.get("/", _expenseController.getAllExpenses);
router.get("/:id", _expenseController.getExpenseById);
router.patch("/:id", _expenseController.updateExpense);
router["delete"]("/:id", _expenseController.deleteExpense);
var _default = router;
exports["default"] = _default;