import joi from 'joi';
import { isValidObjectId } from '../../middlewares/validationMiddleware.js';

export const createProduct=joi.object({
    code:joi.string().required(),
    name:joi.string().max(50).required(),
    price:joi.number().required(),
    buyPrice:joi.number().required(),
    quantity:joi.number().default(1),
    color:joi.array().items(joi.string().required()).required(),
    size:joi.array().items(joi.string().required()).required(),
    description:joi.string().default(" "),
    stock:joi.number().default(0),
    category:joi.string().required(),
    season:joi.string().required(),
}).required();

export const deleteProduct=joi.object({
    id:joi.string().custom(isValidObjectId).required(),
}).required();

export const updateProduct=joi.object({
    id:joi.string().custom(isValidObjectId).required(),
    name:joi.string().max(50),
    price:joi.number(),
    buyPrice:joi.number(),
    quantity:joi.number(),
    color:joi.array().items(joi.string()),
    size:joi.array().items(joi.string()),
    description:joi.string(),
    stock:joi.number(),
    category:joi.string(),
    season:joi.string(),
    discount:joi.number().min(0).max(100).optional(), // percentage discount (e.g., 20 for 20% off)
}).required();