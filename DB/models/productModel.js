import { model, Schema, Types } from "mongoose";

const productSchema=new Schema({
    code:{
        type:String,
        unique:true,
        required:true
    },
    name:{
        type:String,
        max:50,
        required:true
    }, 
    price:{
        type:Number,
        required:true
    }, 
    buyPrice:{
        type:Number,
        required:true
    },
    quantity:{
        type:Number,
        default:1
    },
    // ── Color-based stock tracking ───────────────────────────────────────────
    // Each entry pairs a color variant with its own stock level.
    // The top-level virtual `stock` sums all colorStock[].stock for backward
    // compatibility with code that reads product.stock.
    colorStock: [{
        color: { type: String, required: true },
        stock: { type: Number, default: 0 }
    }],
    size:
       [ {type:String,
        required:true
       } ]
    ,
    description:{type:String,default:" "},
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
    discount:{type:Number,default:0},
    
    // percentage discount (e.g., 20 for 20% off) 
},{timestamps:true});

// ── Virtual: stock ──────────────────────────────────────────────────────────
// Backward-compatible computed field that sums all colorStock[].stock.
// Reads work on documents and toJSON/toObject; writes are no-ops (update
// individual colorStock entries instead).
productSchema.virtual('stock').get(function () {
    if (!this.colorStock || this.colorStock.length === 0) return 0;
    return this.colorStock.reduce((sum, cs) => sum + (cs.stock || 0), 0);
});

// Backward-compatible virtual: color
// Returns an array of color strings extracted from colorStock.
productSchema.virtual('color').get(function () {
    if (!this.colorStock || this.colorStock.length === 0) return [];
    return this.colorStock.map(cs => cs.color);
});

// Ensure virtuals are included when converting to JSON/Object
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export const Product=model('Product',productSchema);