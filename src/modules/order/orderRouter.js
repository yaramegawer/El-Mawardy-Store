import { Router } from "express";
import * as orderController from './orderController.js';
import { validation } from "../../middlewares/validationMiddleware.js";
import * as orderSchema from './orderSchema.js';

const router=Router();

router.post('/', validation(orderSchema.createOrder), orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/analytics', validation(orderSchema.financeAnalytics), orderController.getFinanceAnalytics);
router.get('/:id', orderController.getOrderById);
router.patch('/:id', validation(orderSchema.updateOrderStatus), orderController.updateOrderStatus);
router.patch('/:id/confirm-deposit', validation(orderSchema.confirmDeposit), orderController.confirmDeposit);
router.patch('/:id/return', validation(orderSchema.returnOrder), orderController.returnOrder);
router.patch('/:id/return-items', validation(orderSchema.returnOrderItems), orderController.returnOrderItems);
router.patch('/:id/exchange', validation(orderSchema.exchangeOrderProducts), orderController.exchangeOrderProducts);
router.patch('/:id/returns/:returnId/approve', validation(orderSchema.approveReturn), orderController.approveReturn);
router.patch('/:id/returns/:returnId/reject', validation(orderSchema.rejectReturn), orderController.rejectReturn);
router.patch('/:id/returns/:returnId/complete', validation(orderSchema.completeReturn), orderController.completeReturn);
router.patch('/:id/exchanges/:exchangeId/approve', validation(orderSchema.approveExchange), orderController.approveExchange);
router.patch('/:id/exchanges/:exchangeId/reject', validation(orderSchema.rejectExchange), orderController.rejectExchange);
router.patch('/:id/exchanges/:exchangeId/complete', validation(orderSchema.completeExchange), orderController.completeExchange);
router.delete('/:id', validation(orderSchema.deleteOrder), orderController.deleteOrder);

export default router;