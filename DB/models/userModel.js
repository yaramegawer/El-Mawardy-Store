import { model, Schema } from "mongoose";

const userSchema=new Schema({
    userName:{type:String,required:true,min:2,max:20},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    forgetCode:{type:String,length:5},
},{timestamps:true});

export const User=model("User",userSchema);