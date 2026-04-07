import { model, Schema, Types } from "mongoose";

const productSchema=new Schema({
    name:{
        type:String,
        max:50,
        required:true
    }, 
    price:{
        type:Number,
        required:true
    }, 
    quantity:{
        type:Number,
        default:1
    },
    color:       [ {type:String,
        required:true
       } ]
    ,
    size:
       [ {type:String,
        required:true
       } ]
    ,
    description:String,
    images:[{
        id:{type:String,required:true},
        url:{type:String,required:true},
    }],
    defaultImage:{
        id:{type:String,required:true},
        url:{type:String,required:true},
    },
    cloudFolder:{type:String,unique:true,required:true},
    category:{type:String,required:true},
    season:{type:String,required:true},
    stock:{type:Number,default:0},
},{timestamps:true});

export const Product=model('Product',productSchema);