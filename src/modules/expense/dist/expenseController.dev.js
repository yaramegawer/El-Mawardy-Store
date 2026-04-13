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
  var _req$body, description, amount, category, paymentMethod, notes, expense;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, description = _req$body.description, amount = _req$body.amount, category = _req$body.category, paymentMethod = _req$body.paymentMethod, notes = _req$body.notes;
          _context.next = 3;
          return regeneratorRuntime.awrap(_expenseModel.Expense.create({
            description: description,
            amount: amount,
            category: category,
            paymentMethod: paymentMethod,
            notes: notes
          }));

        case 3:
          expense = _context.sent;
          res.status(201).json({
            success: true,
            message: "Expense created successfully",
            data: expense
          });

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
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
            createdAt: -1
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
  var _req$body2, description, amount, category, paymentMethod, notes, expense;

  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _req$body2 = req.body, description = _req$body2.description, amount = _req$body2.amount, category = _req$body2.category, paymentMethod = _req$body2.paymentMethod, notes = _req$body2.notes;
          _context4.next = 3;
          return regeneratorRuntime.awrap(_expenseModel.Expense.findByIdAndUpdate(req.params.id, {
            description: description,
            amount: amount,
            category: category,
            paymentMethod: paymentMethod,
            notes: notes
          }, {
            "new": true
          }));

        case 3:
          expense = _context4.sent;

          if (expense) {
            _context4.next = 6;
            break;
          }

          return _context4.abrupt("return", next(new Error("Expense not found!", {
            cause: 404
          })));

        case 6:
          res.json({
            success: true,
            message: "Expense updated successfully",
            data: expense
          });

        case 7:
        case "end":
          return _context4.stop();
      }
    }
  });
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