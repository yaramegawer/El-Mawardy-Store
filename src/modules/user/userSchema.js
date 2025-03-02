import joi from 'joi';

export const signup=joi.object({
    userName:joi.string().required().max(20).min(2),
    email:joi.string().required(),
    password:joi.string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required(),
    confirmPassword:joi.string().valid(joi.ref("password")).required(),
}).required();

export const login=joi.object({
    email:joi.string().required(),
    password:joi.string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required(),
}).required();

export const forgetCode=joi.object({
    email:joi.string().email().required(),
}).required();

export const resetPassword=joi.object({
    email:joi.string().required(),
    password:joi.string().regex(/^(?=.*[A-Z])[A-Za-z\d]{8,}$/).required(),
    confirmPassword:joi.string().valid(joi.ref("password")).required(),
    forgetCode:joi.string().length(5).required(),
}).required();