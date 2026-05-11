import joi from 'joi';

export const updateFinance = joi.object({
    capitalMoney: joi.number().min(0).optional(),
    availableCash: joi.number().min(0).optional(),
}).required();
