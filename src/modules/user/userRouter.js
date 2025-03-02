import { Router } from "express";
const router=Router();
import * as userController from './userController.js';
import * as userSchema from './userSchema.js';
import { validation } from "../../middlewares/validationMiddleware.js";

router.post('/register',validation(userSchema.signup),userController.signup);
router.post('/login',validation(userSchema.login),userController.login);
router.patch('/forgetCode',validation(userSchema.forgetCode),userController.forgetCode);
router.patch('/resetPassword',validation(userSchema.resetPassword),userController.resetPassword);
export default router;