import { Router } from "express";
import * as treasuryController from './treasuryController.js';
import * as treasurySchema from './treasurySchema.js';
import { validation } from "../../middlewares/validationMiddleware.js";

const router = Router();

router.get('/summary', treasuryController.getTreasurySummary);
router.get('/daily', treasuryController.getDailyTreasury);
router.get('/history', treasuryController.getTreasuryHistory);
router.post('/rebuild', treasuryController.rebuildTreasury);
router.put('/finance', validation(treasurySchema.updateFinance), treasuryController.updateFinance);

export default router;
