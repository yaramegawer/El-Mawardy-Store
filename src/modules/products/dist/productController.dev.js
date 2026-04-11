"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.searchByCode = exports.updateProduct = exports.deleteProduct = exports.getProductById = exports.allProducts = exports.createProduct = void 0;

var _asyncHandler = require("../../utils/asyncHandler.js");

var _nanoid = require("nanoid");

var _productModel = require("./../../../DB/models/productModel.js");

var _cloudinary = _interopRequireDefault(require("./../../utils/cloudinary.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var createProduct = (0, _asyncHandler.asyncHandler)(function _callee(req, res, next) {
  var cloudFolder, cloudFolderStr, subImageUploads, defaultImageUpload, results, defaultResult, subImagesArray, product;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          if (req.files) {
            _context.next = 2;
            break;
          }

          return _context.abrupt("return", next(new Error("product images are required", {
            cause: 400
          })));

        case 2:
          cloudFolder = (0, _nanoid.nanoid)();
          cloudFolderStr = "".concat(process.env.CLOUD_FOLDER_NAME, "/products/").concat(cloudFolder); // 1. Fire off all uploads concurrently

          subImageUploads = (req.files.subImage || []).map(function (file) {
            return _cloudinary["default"].uploader.upload(file.path, {
              folder: cloudFolderStr
            });
          });
          defaultImageUpload = _cloudinary["default"].uploader.upload(req.files.defaultImage[0].path, {
            folder: cloudFolderStr
          }); // 2. Wait for all of them to finish at the exact same time

          _context.next = 8;
          return regeneratorRuntime.awrap(Promise.all([].concat(_toConsumableArray(subImageUploads), [defaultImageUpload])));

        case 8:
          results = _context.sent;
          // 3. Extract the default image (which is the last one in the array)
          defaultResult = results.pop(); // 4. Map the remaining results (all the subImages) into the format MongoDB expects

          subImagesArray = results.map(function (res) {
            return {
              id: res.public_id,
              url: res.secure_url
            };
          }); // 5. Create product in DB

          _context.next = 13;
          return regeneratorRuntime.awrap(_productModel.Product.create(_objectSpread({}, req.body, {
            cloudFolder: cloudFolder,

            /* createdBy: req.user._id, */
            defaultImage: {
              url: defaultResult.secure_url,
              id: defaultResult.public_id
            },
            images: subImagesArray
          })));

        case 13:
          product = _context.sent;
          return _context.abrupt("return", res.json({
            success: true,
            message: "product created successfully"
          }));

        case 15:
        case "end":
          return _context.stop();
      }
    }
  });
});
exports.createProduct = createProduct;
var allProducts = (0, _asyncHandler.asyncHandler)(function _callee2(req, res, next) {
  var page, filter, limit, skip, totalProducts, totalPages, products;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          page = parseInt(req.query.page) || 1; // Ensure page is a valid number
          //fiter by category and season

          filter = {};

          if (req.query.category) {
            filter.category = req.query.category;
          }

          if (req.query.season) {
            filter.season = req.query.season;
          }

          page = page < 1 ? 1 : page; // Prevent negative or zero pages

          limit = 20; // Set the correct number of products per page

          skip = (page - 1) * limit; // Calculate how many products to skip

          _context2.next = 9;
          return regeneratorRuntime.awrap(_productModel.Product.countDocuments(filter));

        case 9:
          totalProducts = _context2.sent;
          // Get total count of products
          totalPages = Math.ceil(totalProducts / limit); // Calculate total pages
          // Fetch paginated products

          _context2.next = 13;
          return regeneratorRuntime.awrap(_productModel.Product.find(filter).skip(skip).limit(limit));

        case 13:
          products = _context2.sent;
          return _context2.abrupt("return", res.json({
            success: true,
            products: products,
            pagination: {
              totalProducts: totalProducts,
              totalPages: totalPages,
              currentPage: page,
              hasNextPage: page < totalPages,
              hasPrevPage: page > 1
            }
          }));

        case 15:
        case "end":
          return _context2.stop();
      }
    }
  });
});
exports.allProducts = allProducts;
var getProductById = (0, _asyncHandler.asyncHandler)(function _callee3(req, res, next) {
  var product;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 2:
          product = _context3.sent;

          if (product) {
            _context3.next = 5;
            break;
          }

          return _context3.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 5:
          return _context3.abrupt("return", res.json({
            success: true,
            product: product
          }));

        case 6:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.getProductById = getProductById;
var deleteProduct = (0, _asyncHandler.asyncHandler)(function _callee4(req, res, next) {
  var product, ids;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 2:
          product = _context4.sent;

          if (product) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 5:
          _context4.next = 7;
          return regeneratorRuntime.awrap(product.deleteOne());

        case 7:
          //delete images
          ids = product.images.map(function (image) {
            return image.id;
          });
          ids.push(product.defaultImage.id);
          _context4.next = 11;
          return regeneratorRuntime.awrap(_cloudinary["default"].api.delete_resources(ids));

        case 11:
          _context4.next = 13;
          return regeneratorRuntime.awrap(_cloudinary["default"].api.delete_folder("".concat(process.env.CLOUD_FOLDER_NAME, "/products/").concat(product.cloudFolder)));

        case 13:
          return _context4.abrupt("return", res.json({
            success: true,
            message: "product deleted successfully!"
          }));

        case 14:
        case "end":
          return _context4.stop();
      }
    }
  });
});
exports.deleteProduct = deleteProduct;
var updateProduct = (0, _asyncHandler.asyncHandler)(function _callee5(req, res, next) {
  var _req$body, name, price, discount, buyPrice, description, stock, category, season, color, size, product, discountAmount, updatedProduct;

  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _req$body = req.body, name = _req$body.name, price = _req$body.price, discount = _req$body.discount, buyPrice = _req$body.buyPrice, description = _req$body.description, stock = _req$body.stock, category = _req$body.category, season = _req$body.season, color = _req$body.color, size = _req$body.size; // Check if the product exists

          _context5.next = 3;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 3:
          product = _context5.sent;

          if (product) {
            _context5.next = 7;
            break;
          }

          next(new Error("Product not found", {
            cause: 404
          }));
          return _context5.abrupt("return");

        case 7:
          //qpply discount if provided
          if (discount) {
            discountAmount = price * req.body.discount / 100;
            price = price - discountAmount;
          }

          _context5.next = 10;
          return regeneratorRuntime.awrap(_productModel.Product.findByIdAndUpdate(req.params.id, {
            name: name,
            price: price,
            buyPrice: buyPrice,
            description: description,
            stock: stock,
            category: category,
            season: season,
            color: color,
            size: size,
            discount: discount
          }, {
            "new": true
          }));

        case 10:
          updatedProduct = _context5.sent;
          return _context5.abrupt("return", res.json({
            success: true,
            message: "Product updated successfully!",
            product: updatedProduct
          }));

        case 12:
        case "end":
          return _context5.stop();
      }
    }
  });
}); //search by code

exports.updateProduct = updateProduct;
var searchByCode = (0, _asyncHandler.asyncHandler)(function _callee6(req, res, next) {
  var code, product;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          code = req.query.code;

          if (code) {
            _context6.next = 3;
            break;
          }

          return _context6.abrupt("return", next(new Error("code is required", {
            cause: 400
          })));

        case 3:
          _context6.next = 5;
          return regeneratorRuntime.awrap(_productModel.Product.findOne({
            code: code
          }));

        case 5:
          product = _context6.sent;

          if (product) {
            _context6.next = 8;
            break;
          }

          return _context6.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 8:
          return _context6.abrupt("return", res.json({
            success: true,
            product: product
          }));

        case 9:
        case "end":
          return _context6.stop();
      }
    }
  });
});
exports.searchByCode = searchByCode;