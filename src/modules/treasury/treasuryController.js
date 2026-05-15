import TreasuryService from "../../services/treasuryService.js";
import FinanceService from "../../services/financeService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Treasury } from './../../../DB/models/treasuryModel.js';
import { Product } from './../../../DB/models/productModel.js';

export const getTreasurySummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const treasuryData = await TreasuryService.getTreasurySummary(startDate, endDate);
  
  res.json({
    success: true,
    message: "Treasury summary retrieved successfully",
    data: treasuryData,
  });
});

export const rebuildTreasury = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.body;
  
  // Validate dates
  if (startDate && isNaN(new Date(startDate).getTime())) {
    return next(new Error("Invalid start date format", { cause: 400 }));
  }
  
  if (endDate && isNaN(new Date(endDate).getTime())) {
    return next(new Error("Invalid end date format", { cause: 400 }));
  }
  
  const result = await TreasuryService.rebuildTreasury(startDate, endDate);
  
  res.json({
    success: true,
    message: "Treasury rebuild completed successfully",
    data: result,
  });
});

export const getDailyTreasury = asyncHandler(async (req, res, next) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();
  
  if (isNaN(targetDate.getTime())) {
    return next(new Error("Invalid date format", { cause: 400 }));
  }
  
  const treasury = await TreasuryService.getOrCreateTreasury(targetDate);
  
  res.json({
    success: true,
    message: "Daily treasury retrieved successfully",
    data: treasury,
  });
});

export const getTreasuryHistory = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, limit = 30 } = req.query;
  
  const filter = {};
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  
  const treasuryRecords = await Treasury.find(filter)
    .sort({ date: -1 })
    .limit(parseInt(limit));
  
  res.json({
    success: true,
    message: "Treasury history retrieved successfully",
    data: treasuryRecords,
  });
});

export const updateFinance = asyncHandler(async (req, res, next) => {
  const { capitalMoney, availableCash } = req.body;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const treasuryUpdate = {};
  if (availableCash !== undefined) treasuryUpdate.availableCash = availableCash;

  let treasury = null;
  if (Object.keys(treasuryUpdate).length > 0) {
    treasury = await Treasury.findOneAndUpdate(
      { date: { $gte: startOfDay } },
      treasuryUpdate,
      { new: true, upsert: true }
    );
  }

  // Calculate total inventory value
  const products = await Product.find({ visible: { $ne: false } });
  let totalInventoryValue = 0;
  products.forEach((product) => {
    const stock = product.stock || 0;
    const buyPrice = product.buyPrice || 0;
    totalInventoryValue += stock * buyPrice;
  });

  // Calculate capital as inventory + available cash
  const calculatedCapital = totalInventoryValue + (treasury?.availableCash || 0);

  // Update finance settings with calculated capital
  const settings = await FinanceService.updateSettings({
    cashBaseline: availableCash,
    capitalMoney: calculatedCapital,
  });

  // Also update treasury with calculated capital
  if (treasury) {
    treasury.capitalMoney = calculatedCapital;
    await treasury.save();
  }

  res.json({
    success: true,
    message: "Finance data updated successfully",
    data: {
      settings: {
        cashBaseline: settings.cashBaseline,
        cashBaselineAt: settings.cashBaselineAt,
        capitalMoney: settings.capitalMoney,
      },
      treasury,
      totalInventoryValue,
    },
  });
});
