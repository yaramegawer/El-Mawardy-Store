"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = require("express");

var _purchaseController = require("./purchaseController.js");

var _validationMiddleware = require("../../middlewares/validationMiddleware.js");

var _purchaseSchema = require("./purchaseSchema.js");

var router = (0, _express.Router)();
router.post("/", (0, _validationMiddleware.validation)(_purchaseSchema.createPurchaseSchema), _purchaseController.createPurchase);
router.get("/", _purchaseController.getAllPurchases);
router.get("/:id", _purchaseController.getPurchaseById);
router.patch("/:id", (0, _validationMiddleware.validation)(_purchaseSchema.updatePurchaseSchema), _purchaseController.updatePurchase);
router["delete"]("/:id", _purchaseController.deletePurchase);
var _default = router;
exports["default"] = _default;