import { Router } from "express";
import * as productController from './productController.js';
import * as productSchema from './productSchema.js';
import { isAuthenticated } from './../../middlewares/authenticationMiddleware.js';
import { fileUpload } from "../../utils/fileUpload.js";
import { validation } from "../../middlewares/validationMiddleware.js";
const router=Router();

router.post('/',isAuthenticated,fileUpload().fields([
    {name:"defaultImage",maxCount:1},
    {name:"subImage",maxCount:3},
]),validation(productSchema.createProduct),productController.createProduct);

router.get('/',productController.allProducts);

router.delete('/:id',isAuthenticated,productController.deleteProduct)

router.put('/:id',isAuthenticated,productController.updateProduct);
export default router;