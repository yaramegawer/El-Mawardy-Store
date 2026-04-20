import { Router } from "express";
import * as productController from './productController.js';
import * as productSchema from './productSchema.js';
import { isAuthenticated } from './../../middlewares/authenticationMiddleware.js';
import { fileUpload } from "../../utils/fileUpload.js";
import { validation } from "../../middlewares/validationMiddleware.js";
import { isAdmin } from "../../middlewares/isAdmin.js";
const router=Router();
import qs from 'qs';

// Middleware to parse nested multipart form data arrays and objects using qs
const parseFormData = (req, res, next) => {
    if (req.body) {
        req.body = qs.parse(qs.stringify(req.body));
    }
    next();
};

router.post('/',fileUpload().fields([
    {name:"defaultImage",maxCount:1},
    {name:"subImage"},
]),parseFormData,validation(productSchema.createProduct),productController.createProduct);

router.get('/',productController.allProducts);

router.get('/search',productController.searchByCode);
router.get('/:id',productController.getProductById);

router.delete('/:id',productController.deleteProduct)


router.put('/:id',validation(productSchema.updateProduct),productController.updateProduct);
export default router;