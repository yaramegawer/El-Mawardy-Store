import { asyncHandler } from "../utils/asyncHandler.js";

// Middleware to restrict access to admins only
export const isAdmin = asyncHandler(async (req, res, next) => {
  // Make sure user is already authenticated
  if (!req.user) {
    return next(new Error("Unauthorized! User not logged in", { cause: 401 }));
  }

  if (req.user.role !== "admin") {
    return next(new Error("Access denied! Admins only.", { cause: 403 }));
  }

  // User is admin, allow access
  next();
});