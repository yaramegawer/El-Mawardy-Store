import TreasuryService from "../../services/treasuryService.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

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
