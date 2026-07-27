"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.searchByCode = exports.updateProductImages = exports.updateProduct = exports.deleteProduct = exports.getProductById = exports.searchProducts = exports.allProducts = exports.createProduct = void 0;

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
          } // Only filter by visibility if NOT admin request


          if (req.query.admin !== 'true') {
            filter.visible = {
              $ne: false
            };
          }

          page = page < 1 ? 1 : page; // Prevent negative or zero pages

          limit = 20; // Set the correct number of products per page

          skip = (page - 1) * limit; // Calculate how many products to skip

          _context2.next = 10;
          return regeneratorRuntime.awrap(_productModel.Product.countDocuments(filter));

        case 10:
          totalProducts = _context2.sent;
          // Get total count of products
          totalPages = Math.ceil(totalProducts / limit); // Calculate total pages
          // Fetch paginated products

          _context2.next = 14;
          return regeneratorRuntime.awrap(_productModel.Product.find(filter).sort({
            createdAt: -1
          }).skip(skip).limit(limit));

        case 14:
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

        case 16:
        case "end":
          return _context2.stop();
      }
    }
  });
});
exports.allProducts = allProducts;
var searchProducts = (0, _asyncHandler.asyncHandler)(function _callee3(req, res, next) {
  var q, search, products;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          q = req.query.q;

          if (!(!q || !q.trim())) {
            _context3.next = 3;
            break;
          }

          return _context3.abrupt("return", res.status(200).json([]));

        case 3:
          search = q.trim();
          _context3.next = 6;
          return regeneratorRuntime.awrap(_productModel.Product.find({
            $or: [{
              code: {
                $regex: search,
                $options: "i"
              }
            }, {
              name: {
                $regex: search,
                $options: "i"
              }
            }]
          }).sort({
            createdAt: -1
          }));

        case 6:
          products = _context3.sent;
          res.status(200).json(products);

        case 8:
        case "end":
          return _context3.stop();
      }
    }
  });
});
exports.searchProducts = searchProducts;
var getProductById = (0, _asyncHandler.asyncHandler)(function _callee4(req, res, next) {
  var query, product;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          query = {
            _id: req.params.id
          }; // Only filter by visibility if NOT admin request

          if (req.query.admin !== 'true') {
            query.visible = {
              $ne: false
            };
          }

          _context4.next = 4;
          return regeneratorRuntime.awrap(_productModel.Product.findOne(query));

        case 4:
          product = _context4.sent;

          if (product) {
            _context4.next = 7;
            break;
          }

          return _context4.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 7:
          return _context4.abrupt("return", res.json({
            success: true,
            product: product
          }));

        case 8:
        case "end":
          return _context4.stop();
      }
    }
  });
});
exports.getProductById = getProductById;
var deleteProduct = (0, _asyncHandler.asyncHandler)(function _callee5(req, res, next) {
  var product, ids;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _context5.next = 2;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 2:
          product = _context5.sent;

          if (product) {
            _context5.next = 5;
            break;
          }

          return _context5.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 5:
          _context5.next = 7;
          return regeneratorRuntime.awrap(product.deleteOne());

        case 7:
          //delete images
          ids = product.images.map(function (image) {
            return image.id;
          });
          ids.push(product.defaultImage.id);
          _context5.next = 11;
          return regeneratorRuntime.awrap(_cloudinary["default"].api.delete_resources(ids));

        case 11:
          _context5.next = 13;
          return regeneratorRuntime.awrap(_cloudinary["default"].api.delete_folder("".concat(process.env.CLOUD_FOLDER_NAME, "/products/").concat(product.cloudFolder)));

        case 13:
          return _context5.abrupt("return", res.json({
            success: true,
            message: "product deleted successfully!"
          }));

        case 14:
        case "end":
          return _context5.stop();
      }
    }
  });
});
exports.deleteProduct = deleteProduct;
var updateProduct = (0, _asyncHandler.asyncHandler)(function _callee6(req, res, next) {
  var _req$body, name, price, discount, buyPrice, description, colorStock, category, season, size, visible, product, discountAmount, updatedProduct;

  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _req$body = req.body, name = _req$body.name, price = _req$body.price, discount = _req$body.discount, buyPrice = _req$body.buyPrice, description = _req$body.description, colorStock = _req$body.colorStock, category = _req$body.category, season = _req$body.season, size = _req$body.size, visible = _req$body.visible; // Check if the product exists

          _context6.next = 3;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 3:
          product = _context6.sent;

          if (product) {
            _context6.next = 7;
            break;
          }

          next(new Error("Product not found", {
            cause: 404
          }));
          return _context6.abrupt("return");

        case 7:
          //apply discount if provided
          if (discount) {
            discountAmount = price * req.body.discount / 100;
            price = price - discountAmount;
          }

          _context6.next = 10;
          return regeneratorRuntime.awrap(_productModel.Product.findByIdAndUpdate(req.params.id, {
            name: name,
            price: price,
            buyPrice: buyPrice,
            description: description,
            colorStock: colorStock,
            category: category,
            season: season,
            size: size,
            discount: discount,
            visible: visible
          }, {
            "new": true
          }));

        case 10:
          updatedProduct = _context6.sent;
          return _context6.abrupt("return", res.json({
            success: true,
            message: "Product updated successfully!",
            product: updatedProduct
          }));

        case 12:
        case "end":
          return _context6.stop();
      }
    }
  });
});
exports.updateProduct = updateProduct;
var updateProductImages = (0, _asyncHandler.asyncHandler)(function _callee7(req, res, next) {
  var product, cloudFolderStr, updatedImages, oldImageIds, defaultResult, subImageUploads, subImageResults, subImagesArray;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          _context7.next = 2;
          return regeneratorRuntime.awrap(_productModel.Product.findById(req.params.id));

        case 2:
          product = _context7.sent;

          if (product) {
            _context7.next = 5;
            break;
          }

          return _context7.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 5:
          if (req.files) {
            _context7.next = 7;
            break;
          }

          return _context7.abrupt("return", next(new Error("No images provided", {
            cause: 400
          })));

        case 7:
          cloudFolderStr = "".concat(process.env.CLOUD_FOLDER_NAME, "/products/").concat(product.cloudFolder);
          updatedImages = [];
          oldImageIds = []; // Handle default image update

          if (!(req.files.defaultImage && req.files.defaultImage.length > 0)) {
            _context7.next = 16;
            break;
          }

          // Delete old default image from Cloudinary
          oldImageIds.push(product.defaultImage.id); // Upload new default image

          _context7.next = 14;
          return regeneratorRuntime.awrap(_cloudinary["default"].uploader.upload(req.files.defaultImage[0].path, {
            folder: cloudFolderStr
          }));

        case 14:
          defaultResult = _context7.sent;
          product.defaultImage = {
            url: defaultResult.secure_url,
            id: defaultResult.public_id
          };

        case 16:
          if (!(req.files.subImage && req.files.subImage.length > 0)) {
            _context7.next = 24;
            break;
          }

          // Delete old additional images from Cloudinary
          product.images.forEach(function (image) {
            oldImageIds.push(image.id);
          }); // Upload new additional images

          subImageUploads = req.files.subImage.map(function (file) {
            return _cloudinary["default"].uploader.upload(file.path, {
              folder: cloudFolderStr
            });
          });
          _context7.next = 21;
          return regeneratorRuntime.awrap(Promise.all(subImageUploads));

        case 21:
          subImageResults = _context7.sent;
          subImagesArray = subImageResults.map(function (res) {
            return {
              id: res.public_id,
              url: res.secure_url
            };
          });
          product.images = subImagesArray;

        case 24:
          if (!(oldImageIds.length > 0)) {
            _context7.next = 27;
            break;
          }

          _context7.next = 27;
          return regeneratorRuntime.awrap(_cloudinary["default"].api.delete_resources(oldImageIds));

        case 27:
          _context7.next = 29;
          return regeneratorRuntime.awrap(product.save());

        case 29:
          return _context7.abrupt("return", res.json({
            success: true,
            message: "Product images updated successfully!",
            product: product
          }));

        case 30:
        case "end":
          return _context7.stop();
      }
    }
  });
}); //search by code

exports.updateProductImages = updateProductImages;
var searchByCode = (0, _asyncHandler.asyncHandler)(function _callee8(req, res, next) {
  var code, query, product;
  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          code = req.query.code;

          if (code) {
            _context8.next = 3;
            break;
          }

          return _context8.abrupt("return", next(new Error("code is required", {
            cause: 400
          })));

        case 3:
          query = {
            code: code
          }; // Only filter by visibility if NOT admin request

          if (req.query.admin !== 'true') {
            query.visible = {
              $ne: false
            };
          }

          _context8.next = 7;
          return regeneratorRuntime.awrap(_productModel.Product.findOne(query));

        case 7:
          product = _context8.sent;

          if (product) {
            _context8.next = 10;
            break;
          }

          return _context8.abrupt("return", next(new Error("Product not found", {
            cause: 404
          })));

        case 10:
          return _context8.abrupt("return", res.json({
            success: true,
            product: product
          }));

        case 11:
        case "end":
          return _context8.stop();
      }
    }
  });
});
exports.searchByCode = searchByCode;