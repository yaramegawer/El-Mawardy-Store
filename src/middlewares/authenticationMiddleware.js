import { User } from "../../DB/models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  const token = req.headers["token"];

  if (!token) return next(new Error("Token is required!", { cause: 403 }));

  let payload;
  try {
    payload = jwt.verify(token, process.env.SECRET_KEY);
  } catch (err) {
    return next(new Error("Invalid or expired token!", { cause: 403 }));
  }

  const user = await User.findById(payload.id);
  if (!user) return next(new Error("User not found!", { cause: 404 }));

  req.user = user;
  next();
});