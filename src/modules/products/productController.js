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
    
    const price = Number(req.body.price);
    const discount = Number(req.body.discount || 0);
    const discountedPrice = price - (price * discount) / 100;

    // 5. Create product in DB
    const product = await Product.create({
        ...req.body,
        discount,
        discountedPrice,
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

    const updateFields = {};
    const product = await Product.findById(req.params.id);
    if (!product) {
        next(new Error("Product not found", { cause: 404 }));
        return;
    }

    const newPrice = req.body.price != null ? Number(req.body.price) : product.price;
    const newDiscount = req.body.discount != null ? Number(req.body.discount) : product.discount;
    const discountedPrice = newPrice - (newPrice * newDiscount) / 100;

    if (req.body.name != null) updateFields.name = req.body.name;
    if (req.body.price != null) updateFields.price = newPrice;
    if (req.body.buyPrice != null) updateFields.buyPrice = req.body.buyPrice;
    if (req.body.description != null) updateFields.description = req.body.description;
    if (req.body.stock != null) updateFields.stock = req.body.stock;
    if (req.body.category != null) updateFields.category = req.body.category;
    if (req.body.season != null) updateFields.season = req.body.season;
    if (req.body.color != null) updateFields.color = req.body.color;
    if (req.body.size != null) updateFields.size = req.body.size;
    updateFields.discount = newDiscount;
    updateFields.discountedPrice = discountedPrice;

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    return res.json({
        success: true,
        message: "Product updated successfully!",
        product: updatedProduct
    });
});

//search by code
export const searchByCode=asyncHandler(async(req,res,next)=>{
    const {code}=req.query;
    if(!code) return next(new Error("code is required",{cause:400}));
    const product=await Product.findOne({code});
    if(!product) return next(new Error("Product not found",{cause:404}));
    return res.json({
        success:true,
        product
    })
});

