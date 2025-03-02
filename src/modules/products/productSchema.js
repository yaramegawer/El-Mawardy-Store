import joi from 'joi';
import { isValidObjectId } from '../../middlewares/validationMiddleware.js';

export const createProduct=joi.object({
    name:joi.string().max(50).required(),
    price:joi.number().required(),
    description:joi.string(),

}).required();

export const deleteProduct=joi.object({
    id:joi.string().custom(isValidObjectId).required(),
}).required();