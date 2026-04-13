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
  var _req$body, supplier, paymentMethod, notes, productsWithStock, totalCost, purchaseProducts, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, product, quantity, costPrice, itemTotalCost, purchase, populatedPurchase;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, supplier = _req$body.supplier, paymentMethod = _req$body.paymentMethod, notes = _req$body.notes; // Validation - only require supplier now

          if (!(!supplier || !supplier.trim())) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", next(new Error("Supplier is required", {
            cause: 400
          })));

        case 3:
          _context.next = 5;
          return regeneratorRuntime.awrap(_productModel.Product.find({
            stock: {
              $gt: 0
            },
            buyPrice: {
              $gt: 0
            } // Only include products with valid buyPrice

          }));

        case 5:
          productsWithStock = _context.sent;

          if (!(!productsWithStock || productsWithStock.length === 0)) {
            _context.next = 8;
            break;
          }

          return _context.abrupt("return", next(new Error("No products found with stock greater than 0 and valid buy price", {
            cause: 400
          })));

        case 8:
          totalCost = 0;
          purchaseProducts = [];
          _iteratorNormalCompletion = true;
          _didIteratorError = false;
          _iteratorError = undefined;
          _context.prev = 13;
          _iterator = productsWithStock[Symbol.iterator]();

        case 15:
          if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
            _context.next = 31;
            break;
          }

          product = _step.value;
          quantity = product.stock || 1;
          costPrice = product.buyPrice;

          if (!(quantity <= 0)) {
            _context.next = 22;
            break;
          }

          console.log("Skipping product ".concat(product.name, " - invalid stock quantity: ").concat(quantity));
          return _context.abrupt("continue", 28);

        case 22:
          if (!(costPrice <= 0)) {
            _context.next = 25;
            break;
          }

          console.log("Skipping product ".concat(product.name, " - invalid buy price: ").concat(costPrice));
          return _context.abrupt("continue", 28);

        case 25:
          itemTotalCost = quantity * costPrice;
          totalCost += itemTotalCost;
          purchaseProducts.push({
            productId: product._id,
            quantity: quantity,
            costPrice: costPrice,
            totalCost: itemTotalCost
          });

        case 28:
          _iteratorNormalCompletion = true;
          _context.next = 15;
          break;

        case 31:
          _context.next = 37;
          break;

        case 33:
          _context.prev = 33;
          _context.t0 = _context["catch"](13);
          _didIteratorError = true;
          _iteratorError = _context.t0;

        case 37:
          _context.prev = 37;
          _context.prev = 38;

          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }

        case 40:
          _context.prev = 40;

          if (!_didIteratorError) {
            _context.next = 43;
            break;
          }

          throw _iteratorError;

        case 43:
          return _context.finish(40);

        case 44:
          return _context.finish(37);

        case 45:
          if (!(purchaseProducts.length === 0)) {
            _context.next = 47;
            break;
          }

          return _context.abrupt("return", next(new Error("No valid products found for purchase calculation", {
            cause: 400
          })));

        case 47:
          _context.next = 49;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.create({
            supplier: supplier,
            products: purchaseProducts,
            totalCost: totalCost,
            paymentMethod: paymentMethod || "cash",
            notes: notes,
            date: new Date()
          }));

        case 49:
          purchase = _context.sent;
          _context.next = 52;
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.findById(purchase._id).populate("products.productId", "name price buyPrice stock discount"));

        case 52:
          populatedPurchase = _context.sent;
          res.status(201).json({
            success: true,
            message: "Purchase created successfully",
            data: populatedPurchase
          });

        case 54:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[13, 33, 37, 45], [38,, 40, 44]]);
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
          return regeneratorRuntime.awrap(Promise.all([_purchaseModel.Purchase.find(filter).populate("products.productId", "name price buyPrice stock discount").sort({
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
          return regeneratorRuntime.awrap(_purchaseModel.Purchase.findById(req.params.id).populate("products.productId", "name price buyPrice stock discount"));

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
          }).populate("products.productId", "name price buyPrice stock discount"));

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
  var purchase;
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
          _context5.next = 7;
          return regeneratorRuntime.awrap(purchase.deleteOne());

        case 7:
          res.json({
            success: true,
            message: "Purchase deleted successfully"
          });

        case 8:
        case "end":
          return _context5.stop();
      }
    }
  });
});
exports.deletePurchase = deletePurchase;