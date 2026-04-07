import { model, Schema, Types } from "mongoose";


const orderSchema=new Schema({
    customerName:{type:String,required:true},
    phone:{type:String,required:true},
    email:{type:String,required:true},
    address:{type:String,required:true},
    government:{type:String,required:true},
    products:[
        {
            productId:{type:Types.ObjectId,ref:"Product",required:true},
            quantity:{type:Number,required:true},
            price:{type:Number,required:true},   // snapshot (auto-calculated from product)
            color:String,
            size:String
        }
    ],
    shippingCost:{type:Number,required:true},
    totalPrice:{type:Number,required:true},      // items + shipping
    depositAmount:{type:Number,required:true},   // 50% of total
    depositPaymentMethod:{type:String,enum:["vodafone_cash"],required:true},
    dueAmount:{type:Number,required:true},           // total - deposit
    duePaymentMethod:{type:String,enum:["vodafone_cash","cash_on_delivery"],required:true},
    orderDate:{type:Date,default:Date.now},
    paymentStatus:{type:String,enum:["pending","deposit_sent","confirmed"],default:"pending"},
    depositConfirmed:{type:Boolean,default:false},  // true when moderator confirms deposit
    paymentProof:String,   // image URL (optional later)
    status:{type:String,enum:["pending","confirmed","shipped"],default:"pending"}
},{timestamps:true});

export const Order=model('Order',orderSchema);