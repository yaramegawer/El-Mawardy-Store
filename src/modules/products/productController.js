import { asyncHandler } from "../../utils/asyncHandler.js";
import { nanoid } from "nanoid";
import { Product } from './../../../DB/models/productModel.js';
import cloudinary from './../../utils/cloudinary.js';

export const createProduct = asyncHandler(async (req, res, next) => {
    if (!req.files) return next(new Error("product images are required", { cause: 400 }));
    
    const cloudFolder = nanoid();
    const cloudFolderStr = `${process.env.CLOUD_FOLDER_NAME}/products/${cloudFolder}`;
    
    // 1. Fire off all uploads concurrently
    const subImageUploads = (req.files.subImage || []).map(file => 
      cloudinary.uploader.upload(file.path, { folder: cloudFolderStr })
    );
    const defaultImageUpload = cloudinary.uploader.upload(req.files.defaultImage[0].path, { folder: cloudFolderStr });
    
    // 2. Wait for all of them to finish at the exact same time
    const results = await Promise.all([...subImageUploads, defaultImageUpload]);
    
    // 3. Extract the default image (which is the last one in the array)
    const defaultResult = results.pop();
    
    // 4. Map the remaining results (all the subImages) into the format MongoDB expects
    const subImagesArray = results.map(res => ({ id: res.public_id, url: res.secure_url }));
    
    // 5. Create product in DB
    const product = await Product.create({
        ...req.body,
        cloudFolder,
        /* createdBy: req.user._id, */
        defaultImage: { 
            url: defaultResult.secure_url, 
            id: defaultResult.public_id 
        },
        images: subImagesArray
    });
    // 6. Send response
    return res.json({
        success: true,
        message: "product created successfully"
    });
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

    // Only filter by visibility if NOT admin request
    if (req.query.admin !== 'true') {
        filter.visible = { $ne: false };
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
    let query = { _id: req.params.id };
    // Only filter by visibility if NOT admin request
    if (req.query.admin !== 'true') {
        query.visible = { $ne: false };
    }
    const product=await Product.findOne(query);
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

    let {name,price,discount,buyPrice,description,colorStock,category,season,size,visible}=req.body;
    // Check if the product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
        next(new Error("Product not found", { cause: 404 }));
        return;
    }
    //apply discount if provided
    if(discount){
        const discountAmount=(price*req.body.discount)/100;
        price=price-discountAmount;
    }

    const updatedProduct=await Product.findByIdAndUpdate(req.params.id,{name,price,buyPrice,description,colorStock,category,season,size,discount,visible},{new:true})

    return res.json({
        success: true,
        message: "Product updated successfully!",
        product: updatedProduct
    });
});

export const updateProductImages = asyncHandler(async (req, res, next) => {
    // Check if the product exists
    const product = await Product.findById(req.params.id);
    if (!product) {
        return next(new Error("Product not found", { cause: 404 }));
    }

    if (!req.files) {
        return next(new Error("No images provided", { cause: 400 }));
    }

    const cloudFolderStr = `${process.env.CLOUD_FOLDER_NAME}/products/${product.cloudFolder}`;
    const updatedImages = [];
    const oldImageIds = [];

    // Handle default image update
    if (req.files.defaultImage && req.files.defaultImage.length > 0) {
        // Delete old default image from Cloudinary
        oldImageIds.push(product.defaultImage.id);
        
        // Upload new default image
        const defaultResult = await cloudinary.uploader.upload(req.files.defaultImage[0].path, { 
            folder: cloudFolderStr 
        });
        
        product.defaultImage = {
            url: defaultResult.secure_url,
            id: defaultResult.public_id
        };
    }

    // Handle additional images update
    if (req.files.subImage && req.files.subImage.length > 0) {
        // Delete old additional images from Cloudinary
        product.images.forEach(image => {
            oldImageIds.push(image.id);
        });
        
        // Upload new additional images
        const subImageUploads = req.files.subImage.map(file => 
            cloudinary.uploader.upload(file.path, { folder: cloudFolderStr })
        );
        
        const subImageResults = await Promise.all(subImageUploads);
        const subImagesArray = subImageResults.map(res => ({ 
            id: res.public_id, 
            url: res.secure_url 
        }));
        
        product.images = subImagesArray;
    }

    // Delete old images from Cloudinary if they were replaced
    if (oldImageIds.length > 0) {
        await cloudinary.api.delete_resources(oldImageIds);
    }

    // Save the updated product
    await product.save();

    return res.json({
        success: true,
        message: "Product images updated successfully!",
        product
    });
});

//search by code
export const searchByCode=asyncHandler(async(req,res,next)=>{
    const {code}=req.query;
    if(!code) return next(new Error("code is required",{cause:400}));
    let query = { code };
    // Only filter by visibility if NOT admin request
    if (req.query.admin !== 'true') {
        query.visible = { $ne: false };
    }
    const product=await Product.findOne(query);
    if(!product) return next(new Error("Product not found",{cause:404}));
    return res.json({
        success:true,
        product
    })
});

