import { Router } from "express";
import * as productController from './productController.js';
import * as productSchema from './productSchema.js';
import { isAuthenticated } from './../../middlewares/authenticationMiddleware.js';
import { fileUpload } from "../../utils/fileUpload.js";
import { validation } from "../../middlewares/validationMiddleware.js";
import { isAdmin } from "../../middlewares/isAdmin.js";
const router=Router();

router.post('/',/*isAdmin,*/fileUpload().fields([
    {name:"defaultImage",maxCount:1},
    {name:"subImage"},
]),validation(productSchema.createProduct),productController.createProduct);

router.get('/',productController.allProducts);

router.get('/search',productController.searchByCode);
router.get('/:id',productController.getProductById);

router.delete('/:id',isAuthenticated,isAdmin,productController.deleteProduct)


router.put('/:id',isAuthenticated,isAdmin,validation(productSchema.updateProduct),isAdmin,productController.updateProduct);
export default router;