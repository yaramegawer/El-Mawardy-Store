import { asyncHandler } from "../../utils/asyncHandler.js";
import { nanoid } from "nanoid";
import { Product } from './../../../DB/models/productModel.js';
import cloudinary from './../../utils/cloudinary.js';

export const createProduct=asyncHandler(async(req,res,next)=>{
    if(!req.files) return next(new Error("product images are required",{cause:400}));
    const cloudFolder=nanoid();
    let images=[]
    //upload sub images
    for(const file of req.files.subImage){
        const {secure_url,public_id}=await cloudinary.uploader.upload(file.path,{folder:`${process.env.CLOUD_FOLDER_NAME}/products/${cloudFolder}`});
        images.push({id:public_id,url:secure_url});
    }

    //upload default image
    const {secure_url,public_id}=await cloudinary.uploader.upload(req.files.defaultImage[0].path,{folder:`${process.env.CLOUD_FOLDER_NAME}/products/${cloudFolder}`});

    //create product
    const product=await Product.create({...req.body,cloudFolder,/*createdBy:req.user._id,*/defaultImage:{url:secure_url,id:public_id},images});

    //send response
    return res.json({
        success:true,
        message:"product created successfully"
    })
});


export const allProducts=asyncHandler(async(req,res,next)=>{
    let page = parseInt(req.query.page) || 1; // Ensure page is a valid number
    //fiter by category and season
    let filter = {};
    if (req.query.category) {
        filter.category = req.query.category;
    }
    if (req.query.season) {
        filter.season = req.query.season;
    }

    page = page < 1 ? 1 : page; // Prevent negative or zero pages

    const limit = 20; // Set the correct number of products per page
    const skip = (page - 1) * limit; // Calculate how many products to skip

    const totalProducts = await Product.countDocuments(filter); // Get total count of products
    const totalPages = Math.ceil(totalProducts / limit); // Calculate total pages

    // Fetch paginated products
    const products = await Product.find(filter).skip(skip).limit(limit);

    return res.json({
        success: true,
        products,
        pagination: {
            totalProducts,
            totalPages,
            currentPage: page,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        }
    });
});

export const getProductById=asyncHandler(async(req,res,next)=>{
    const product=await Product.findById(req.params.id);
    if(!product) return next(new Error("Product not found",{cause:404}));       
    return res.json({
        success:true,
        product
    })
});

export const deleteProduct=asyncHandler(async(req,res,next)=>{
    //check product
    const product=await Product.findById(req.params.id);
    if(!product) return next(new Error("Product not found",{cause:404}));

    //delete product from db
    await product.deleteOne();
    //delete images
    const ids=product.images.map((image)=>image.id);
    ids.push(product.defaultImage.id);
    await cloudinary.api.delete_resources(ids);
    //delete folder
    await cloudinary.api.delete_folder(`${process.env.CLOUD_FOLDER_NAME}/products/${product.cloudFolder}`)
    //return response
    return res.json({
        success:true,
        message:"product deleted successfully!"
    })

});

export const updateProduct = asyncHandler(async (req, res, next) => {

    const {name,price,description,stock,category,season,color,size}=req.body;
    // Check if the product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
        next(new Error("Product not found", { cause: 404 }));
        return;
    }

    const updatedProduct=await Product.findByIdAndUpdate(req.params.id,{name,price,description,stock,category,season,color,size})

    return res.json({
        success: true,
        message: "Product updated successfully!",
        product: updatedProduct
    });
});
