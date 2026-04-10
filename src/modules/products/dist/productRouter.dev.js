"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = require("express");

var productController = _interopRequireWildcard(require("./productController.js"));

var productSchema = _interopRequireWildcard(require("./productSchema.js"));

var _authenticationMiddleware = require("./../../middlewares/authenticationMiddleware.js");

var _fileUpload = require("../../utils/fileUpload.js");

var _validationMiddleware = require("../../middlewares/validationMiddleware.js");

var _isAdmin = require("../../middlewares/isAdmin.js");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var router = (0, _express.Router)();
router.post('/',
/*isAdmin,*/
(0, _fileUpload.fileUpload)().fields([{
  name: "defaultImage",
  maxCount: 1
}, {
  name: "subImage"
}]), (0, _validationMiddleware.validation)(productSchema.createProduct), productController.createProduct);
router.get('/', productController.allProducts);
router.get('/search', productController.searchByCode);
router.get('/:id', productController.getProductById);
router["delete"]('/:id', _authenticationMiddleware.isAuthenticated, _isAdmin.isAdmin, productController.deleteProduct);
router.put('/:id', _authenticationMiddleware.isAuthenticated, _isAdmin.isAdmin, (0, _validationMiddleware.validation)(productSchema.updateProduct), _isAdmin.isAdmin, productController.updateProduct);
var _default = router;
exports["default"] = _default;