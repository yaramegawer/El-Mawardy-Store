import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './DB/connection.js';
import userRouter from './src/modules/user/userRouter.js';
import productRouter from './src/modules/products/productRouter.js';
import orderRouter from './src/modules/order/orderRouter.js';
import expenseRouter from './src/modules/expense/expenseRouter.js';
import purchaseRouter from './src/modules/purchase/purchaseRouter.js';
const app = express()

dotenv.config();

const port=process.env.PORT||3000;

await connectDB();
app.use(express.json());
app.use(cors());

app.use('/user',userRouter);
app.use('/product',productRouter)
app.use('/order',orderRouter)
app.use('/expense',expenseRouter)
app.use('/purchase',purchaseRouter)


app.use('*', (req, res,next) =>{
    return next(new Error("page not found",{cause:404}))
})

app.use((error,req,res,next)=>{
    const statusCode=error.cause||500;
    return res.status(statusCode).json({
        success:false,
        message:error.message,
        stack:error.stack
    });
});

app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});