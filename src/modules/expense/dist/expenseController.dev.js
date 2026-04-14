"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deleteExpense = exports.updateExpense = exports.getExpenseById = exports.getAllExpenses = exports.createExpense = void 0;

var _expenseModel = require("../../../DB/models/expenseModel.js");

var _asyncHandler = require("../../utils/asyncHandler.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var createExpense = (0, _asyncHandler.asyncHandler)(function _callee(req, res, next) {
  var _req$body, description, amount, category, paymentMethod, notes, validCategories, validPaymentMethods, expense, validationErrors;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, description = _req$body.description, amount = _req$body.amount, category = _req$body.category, paymentMethod = _req$body.paymentMethod, notes = _req$body.notes; // Validation

          if (!(!description || description.trim().length === 0)) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", next(new Error("Description is required", {
            cause: 400
          })));

        case 3:
          if (!(!amount || isNaN(amount) || amount <= 0)) {
            _context.next = 5;
            break;
          }

          return _context.abrupt("return", next(new Error("Valid amount is required", {
            cause: 400
          })));

        case 5:
          validCategories = ["rent", "utilities", "marketing", "salaries", "supplies", "maintenance", "shipping", "ads", "vodafone_cash", "other_operating"];

          if (!(!category || !validCategories.includes(category))) {
            _context.next = 8;
            break;
          }

          return _context.abrupt("return", next(new Error("Invalid category. Valid categories: ".concat(validCategories.join(", ")), {
            cause: 400
          })));

        case 8:
          validPaymentMethods = ["vodafone_cash", "cash", "bank"];

          if (!(paymentMethod && !validPaymentMethods.includes(paymentMethod))) {
            _context.next = 11;
            break;
          }

          return _context.abrupt("return", next(new Error("Invalid payment method. Valid methods: ".concat(validPaymentMethods.join(", ")), {
            cause: 400
          })));

        case 11:
          _context.prev = 11;
          _context.next = 14;
          return regeneratorRuntime.awrap(_expenseModel.Expense.create({
            description: description.trim(),
            amount: parseFloat(amount),
            category: category,
            paymentMethod: paymentMethod || "cash",
            notes: notes ? notes.trim() : undefined
          }));

        case 14:
          expense = _context.sent;
          res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: expense
          });
          _context.next = 24;
          break;

        case 18:
          _context.prev = 18;
          _context.t0 = _context["catch"](11);

          if (!(_context.t0.name === 'ValidationError')) {
            _context.next = 23;
            break;
          }

          validationErrors = Object.values(_context.t0.errors).map(function (err) {
            return err.message;
          });
          return _context.abrupt("return", next(new Error("Validation failed: ".concat(validationErrors.join(", ")), {
            cause: 400
          })));

        case 23:
          return _context.abrupt("return", next(new Error("Failed to create expense. Please try again.", {
            cause: 500
          })));

        case 24:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[11, 18]]);
});
exports.createExpense = createExpense;
var getAllExpenses = (0, _asyncHandler.asyncHandler)(function _callee2(req, res, next) {
  var filter, page, limit, skip, _ref, _ref2, expenses, total;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          filter = {};
          if (req.query.category) filter.category = req.query.category;
          if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

          if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
            if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
          }

          page = parseInt(req.query.page) || 1;
          limit = parseInt(req.query.limit) || 10;
          skip = (page - 1) * limit;
          _context2.next = 9;
          return regeneratorRuntime.awrap(Promise.all([_expenseModel.Expense.find(filter).sort({
            date: -1
          }).skip(skip).limit(limit), _expenseModel.Expense.countDocuments(filter)]));

        case 9:
          _ref = _context2.sent;
          _ref2 = _slicedToArray(_ref, 2);
          expenses = _ref2[0];
          total = _ref2[1];
          res.json({
            success: true,
            message: "Expenses retrieved successfully",
            data: expenses,
            pagination: {
              page: page,
              limit: limit,
              total: total
            }
          });

        case 14:
        case "end":
          return _context2.stop();
      }
    }
  });
});
exports.getAllExpenses = getAllExpenses;
var getExpenseById = (0, _asyncHandler.asyncHandler)(function _callee3(req, res, next) {
  var expense;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(_expenseModel.Expense.findById(req.params.id));

        case 2:
          expense = _context3.sent;

          if (expense) {
            _context3.next = 5;
            break;
          }

          return _context3.abrupt("return", next(new Error("Expense not found!", {
            cause: 404
          })));

        case 5:
          res.json({
            success: true,
            message: "Expense retrieved successfully",
            data: expense
          });

        case 6:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.getExpenseById = getExpenseById;
var updateExpense = (0, _asyncHandler.asyncHandler)(function _callee4(req, res, next) {
  var _req$body2, description, amount, category, paymentMethod, notes, validCategories, validPaymentMethods, updateData, expense, validationErrors;

  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _req$body2 = req.body, description = _req$body2.description, amount = _req$body2.amount, category = _req$body2.category, paymentMethod = _req$body2.paymentMethod, notes = _req$body2.notes; // Validation

          if (!(description && description.trim().length === 0)) {
            _context4.next = 3;
            break;
          }

          return _context4.abrupt("return", next(new Error("Description cannot be empty", {
            cause: 400
          })));

        case 3:
          if (!(amount && (isNaN(amount) || amount <= 0))) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", next(new Error("Valid amount is required", {
            cause: 400
          })));

        case 5:
          validCategories = ["rent", "utilities", "marketing", "salaries", "supplies", "maintenance", "shipping", "ads", "vodafone_cash", "other_operating"];

          if (!(category && !validCategories.includes(category))) {
            _context4.next = 8;
            break;
          }

          return _context4.abrupt("return", next(new Error("Invalid category. Valid categories: ".concat(validCategories.join(", ")), {
            cause: 400
          })));

        case 8:
          validPaymentMethods = ["vodafone_cash", "cash", "bank"];

          if (!(paymentMethod && !validPaymentMethods.includes(paymentMethod))) {
            _context4.next = 11;
            break;
          }

          return _context4.abrupt("return", next(new Error("Invalid payment method. Valid methods: ".concat(validPaymentMethods.join(", ")), {
            cause: 400
          })));

        case 11:
          // Prepare update object with only provided fields
          updateData = {};
          if (description !== undefined) updateData.description = description.trim();
          if (amount !== undefined) updateData.amount = parseFloat(amount);
          if (category !== undefined) updateData.category = category;
          if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
          if (notes !== undefined) updateData.notes = notes.trim() || undefined;
          _context4.prev = 17;
          _context4.next = 20;
          return regeneratorRuntime.awrap(_expenseModel.Expense.findByIdAndUpdate(req.params.id, updateData, {
            "new": true,
            runValidators: true
          }));

        case 20:
          expense = _context4.sent;

          if (expense) {
            _context4.next = 23;
            break;
          }

          return _context4.abrupt("return", next(new Error("Expense not found!", {
            cause: 404
          })));

        case 23:
          res.json({
            success: true,
            message: "Expense updated successfully",
            data: expense
          });
          _context4.next = 32;
          break;

        case 26:
          _context4.prev = 26;
          _context4.t0 = _context4["catch"](17);

          if (!(_context4.t0.name === 'ValidationError')) {
            _context4.next = 31;
            break;
          }

          validationErrors = Object.values(_context4.t0.errors).map(function (err) {
            return err.message;
          });
          return _context4.abrupt("return", next(new Error("Validation failed: ".concat(validationErrors.join(", ")), {
            cause: 400
          })));

        case 31:
          return _context4.abrupt("return", next(new Error("Failed to update expense. Please try again.", {
            cause: 500
          })));

        case 32:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[17, 26]]);
});
exports.updateExpense = updateExpense;
var deleteExpense = (0, _asyncHandler.asyncHandler)(function _callee5(req, res, next) {
  var expense;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(_expenseModel.Expense.findByIdAndDelete(req.params.id));

        case 2:
          expense = _context5.sent;

          if (expense) {
            _context5.next = 5;
            break;
          }

          return _context5.abrupt("return", next(new Error("Expense not found!", {
            cause: 404
          })));

        case 5:
          res.json({
            success: true,
            message: "Expense deleted successfully"
          });

        case 6:
        case "end":
          return _context5.stop();
      }
    }
  });
});
exports.deleteExpense = deleteExpense;