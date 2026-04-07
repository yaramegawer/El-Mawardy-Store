import { Router } from "express";
import * as orderController from './orderController.js';
import { validation } from "../../middlewares/validationMiddleware.js";
import * as orderSchema from './orderSchema.js';

const router=Router();

router.post('/', validation(orderSchema.createOrder), orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.patch('/:id', validation(orderSchema.updateOrderStatus), orderController.updateOrderStatus);
router.patch('/:id/confirm-deposit', validation(orderSchema.confirmDeposit), orderController.confirmDeposit);
router.delete('/:id', validation(orderSchema.deleteOrder), orderController.deleteOrder);

export default router;