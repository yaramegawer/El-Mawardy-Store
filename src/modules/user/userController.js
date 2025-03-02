import { Token } from '../../../DB/models/tokenModel.js';
import { User } from '../../../DB/models/userModel.js';
import { asyncHandler } from './../../utils/asyncHandler.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import randomstring from 'randomstring';
import { sendEmail } from './../../utils/sendEmail.js';


export const signup=asyncHandler(async(req,res,next)=>{
    const {email,password}=req.body;

    const user=await User.findOne({email});

    if(user)
        return next(new Error("User already registered!",{cause:412}));

    const hashedPassword=await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));

    await User.create({...req.body,password:hashedPassword});

    return res.status(201).json({
        success:true,
        message:"User created successfully!"
    });
});

export const login=asyncHandler(async(req,res,next)=>{
    const {email,password}=req.body;

    const user=await User.findOne({email});

    if(!user)
        return next(new Error("User not found!",{cause:404}));

    const match=await bcrypt.compare(password,user.password);
    if(!match)
        return next(new Error("Incorrect Password!",{cause:400}));


    let token=jwt.sign({email,id:user._id,role: user.role},process.env.SECRET_KEY);
    token=await Token.create({token,user:user._id,role:user.role});

    return res.status(200).json({
        success:true,
        message:"USer logged in successfully!",
        token:token.token
    })
});

export const forgetCode=asyncHandler(async(req,res,next)=>{
    const {email}=req.body;

    const user=await User.findOne({email});

    if(!user)
        return next(new Error("User not found!",{cause:404}));

    const forgetCode=randomstring.generate({
        charset:"numeric",
        length:5
    });
    user.forgetCode=forgetCode;
    await user.save();
    const messageSent=await sendEmail({
        to:email,
        subject:"Reset Password",
        html:`Your code to reset your account is ${forgetCode}`,
    });
    if(!messageSent)
        return next(new Error("Something went wrong!",{cause:400}));

    //send response 
    res.json({
        success:true,
        message:"Code sent! Check your email please!",
        forgetCode,
    });
});

export const resetPassword=asyncHandler(async(req,res,next)=>{
    const {email,password,forgetCode}=req.body;
    
    const user=await User.findOne({email});

    if(!user)
        return next(new Error("User not found!",{cause:404}));

    if(forgetCode!==user.forgetCode)
        return next(new Error('Invalid code!',{cause:403}));

    user.password=await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));
    await user.save();


    const tokens=await Token.find({user:user._id});

    tokens.forEach(async(token)=>{
        token.isValid=false;
        await token.save();
    });

    return res.json({
        success:true,
        message:"Password reset successfully, try to login now :)"
    });
});
