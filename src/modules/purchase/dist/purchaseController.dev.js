"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.deletePurchase = exports.updatePurchase = exports.getPurchaseById = exports.getAllPurchases = exports.createPurchase = void 0;

var _purchaseModel = require("../../../DB/models/purchaseModel.js");

var _productModel = require("../../../DB/models/productModel.js");

var _asyncHandler = require("../../utils/asyncHandler.js");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var createPurchase = (0, _asyncHandler.asyncHandler)(function _callee(req, res, next) {
  var _req$body, supplier, products, paymentMethod, notes, totalCost, purchaseProducts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item, product, quantity, costPrice, purchase;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, supplier = _req$body.supplier, products = _req$body.products, paymentMethod = _req$body.paymentMethod, notes = _req$body.notes;
          totalCost = 0;
          purchaseProducts = [];
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 6;
          _iterator = products[Symbol.iterator]();

        case 8:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 24;
            break;
          }

          item = _step.value;
          _context.next = 12;
          return regeneratorRuntime.awrap(_productModel.Product.findById(item.productId));

        case 12:
          product = _context.sent;

          if (product) {
            _context.next = 15;
            break;
          }

          return _context.abrupt("return", next(new Error("Product with ID ".concat(item.productId, " not found"), {
            cause: 404
          })));

        case 15:
          quantity = item.quantity || 1;
          costPrice = item.costPrice;
          totalCost += quantity * costPrice;
          purchaseProducts.push({
            productId: item.productId,
            quantity: quantity,
            costPrice: costPrice,
            totalCost: quantity * costPrice
          }); // Update product stock and buyPrice

          _context.next = 21;
          return regeneratorRuntime.awrap(_productModel.Product.findByIdAndUpdate(item.productId, {
            $inc: {
              stock: quantity
            },
            buyPrice: costPrice // Update buyPrice to latest

          }));

        case 21:
          _iteratorNormalCompletion = true;
          _context.next = 8;
          break;

        case 24:
          _context.next = 30;
          break;

        case 26:
          _context.prev = 26;
          _context.t0 = _context["catch"](6);
          _didIteratorError = true;
          _iteratorError = _context.t0;

        case 30:
          _context.prev = 30;
          _context.prev = 31;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 33:
          _context.prev = 33;

          if (!_didIteratorError) {
            _context.next = 36;
            break;
          }

          throw _iteratorError;

        case 36:
          return _context.finish(33);

        case 37:
          return _context.finish(30);

        case 38:
          _context.next = 40;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.create({
            supplier: supplier,
            products: purchaseProducts,
            totalCost: totalCost,
            paymentMethod: paymentMethod,
            notes: notes
          }));

        case 40:
          purchase = _context.sent;
          res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: purchase
          });

        case 42:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[6, 26, 30, 38], [31,, 33, 37]]);
});
exports.createPurchase = createPurchase;
var getAllPurchases = (0, _asyncHandler.asyncHandler)(function _callee2(req, res, next) {
  var filter, page, limit, skip, _ref, _ref2, purchases, total;

  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          filter = {};
          if (req.query.supplier) filter.supplier = {
            $regex: req.query.supplier,
            $options: "i"
          };

          if (req.query.startDate || req.query.endDate) {
            filter.date = {};
            if (req.query.startDate) filter.date.$gte = new Date(req.query.startDate);
            if (req.query.endDate) filter.date.$lte = new Date(req.query.endDate);
          }

          page = parseInt(req.query.page) || 1;
          limit = parseInt(req.query.limit) || 10;
          skip = (page - 1) * limit;
          _context2.next = 8;
          return regeneratorRuntime.awrap(Promise.all([_purchaseModel.Purchase.find(filter).populate("products.productId", "name").sort({
            createdAt: -1
          }).skip(skip).limit(limit), _purchaseModel.Purchase.countDocuments(filter)]));

        case 8:
          _ref = _context2.sent;
          _ref2 = _slicedToArray(_ref, 2);
          purchases = _ref2[0];
          total = _ref2[1];
          res.json({
            success: true,
            message: "Purchases retrieved successfully",
            data: purchases,
            pagination: {
              page: page,
              limit: limit,
              total: total
            }
          });

        case 13:
        case "end":
          return _context2.stop();
      }
    }
  });
});
exports.getAllPurchases = getAllPurchases;
var getPurchaseById = (0, _asyncHandler.asyncHandler)(function _callee3(req, res, next) {
  var purchase;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.findById(req.params.id).populate("products.productId", "name"));

        case 2:
          purchase = _context3.sent;

          if (purchase) {
            _context3.next = 5;
            break;
          }

          return _context3.abrupt("return", next(new Error("Purchase not found!", {
            cause: 404
          })));

        case 5:
          res.json({
            success: true,
            message: "Purchase retrieved successfully",
            data: purchase
          });

        case 6:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.getPurchaseById = getPurchaseById;
var updatePurchase = (0, _asyncHandler.asyncHandler)(function _callee4(req, res, next) {
  var _req$body2, supplier, paymentMethod, notes, purchase;

  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          // Note: Updating purchases might be complex due to stock changes, perhaps restrict or handle carefully
          _req$body2 = req.body, supplier = _req$body2.supplier, paymentMethod = _req$body2.paymentMethod, notes = _req$body2.notes;
          _context4.next = 3;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.findByIdAndUpdate(req.params.id, {
            supplier: supplier,
            paymentMethod: paymentMethod,
            notes: notes
          }, {
            "new": true
          }));

        case 3:
          purchase = _context4.sent;

          if (purchase) {
            _context4.next = 6;
            break;
          }

          return _context4.abrupt("return", next(new Error("Purchase not found!", {
            cause: 404
          })));

        case 6:
          res.json({
            success: true,
            message: "Purchase updated successfully",
            data: purchase
          });

        case 7:
        case "end":
          return _context4.stop();
      }
    }
  });
});
exports.updatePurchase = updatePurchase;
var deletePurchase = (0, _asyncHandler.asyncHandler)(function _callee5(req, res, next) {
  var purchase, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, item;

  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.findById(req.params.id));

        case 2:
          purchase = _context5.sent;

          if (purchase) {
            _context5.next = 5;
            break;
          }

          return _context5.abrupt("return", next(new Error("Purchase not found!", {
            cause: 404
          })));

        case 5:
          // Restore stock
          _iteratorNormalCompletion2 = true;
          _didIteratorError2 = false;
          _iteratorError2 = undefined;
          _context5.prev = 8;
          _iterator2 = purchase.products[Symbol.iterator]();

        case 10:
          if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
            _context5.next = 17;
            break;
          }

          item = _step2.value;
          _context5.next = 14;
          return regeneratorRuntime.awrap(_productModel.Product.findByIdAndUpdate(item.productId, {
            $inc: {
              stock: -item.quantity
            }
          }));

        case 14:
          _iteratorNormalCompletion2 = true;
          _context5.next = 10;
          break;

        case 17:
          _context5.next = 23;
          break;

        case 19:
          _context5.prev = 19;
          _context5.t0 = _context5["catch"](8);
          _didIteratorError2 = true;
          _iteratorError2 = _context5.t0;

        case 23:
          _context5.prev = 23;
          _context5.prev = 24;

          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }

        case 26:
          _context5.prev = 26;

          if (!_didIteratorError2) {
            _context5.next = 29;
            break;
          }

          throw _iteratorError2;

        case 29:
          return _context5.finish(26);

        case 30:
          return _context5.finish(23);

        case 31:
          _context5.next = 33;
          return regeneratorRuntime.awrap(purchase.deleteOne());

        case 33:
          res.json({
            success: true,
            message: "Purchase deleted successfully"
          });

        case 34:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[8, 19, 23, 31], [24,, 26, 30]]);
});
exports.deletePurchase = deletePurchase;