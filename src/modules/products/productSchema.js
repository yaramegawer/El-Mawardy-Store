import joi from 'joi';
import { isValidObjectId } from '../../middlewares/validationMiddleware.js';

export const createProduct=joi.object({
    name:joi.string().max(50).required(),
    price:joi.number().required(),
    quantity:joi.number().default(1),
    color:joi.array().items(joi.string().required()).required(),
    size:joi.array().items(joi.string().required()).required(),
    description:joi.string(),
    stock:joi.number().default(0),
    category:joi.string().required(),
    season:joi.string().required(),
}).required();

export const deleteProduct=joi.object({
    id:joi.string().custom(isValidObjectId).required(),
}).required();