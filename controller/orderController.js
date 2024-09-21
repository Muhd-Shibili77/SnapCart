const User = require('../model/userdb')
const Address = require('../model/AddressDB')
const Order = require('../model/orderDB')
const Product = require('../model/productDB')
const Cart = require('../model/cartDb')
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");




const generateOrderId = async ()=>{


    const prefix ='ORD'
    const latestOrder = await Order.findOne().sort({ orderId: -1 }).select('orderId');
    const latestId = latestOrder ? parseInt(latestOrder.orderId.replace(prefix, '')) : 0;
    const newId = latestId + 1;
    return `${prefix}${newId.toString().padStart(5, '0')}`;
}





const orderConfrom = async (req,res)=>{
    try{
        const {addressId,cartId}=req.body
        let {paymentMethod}=req.body
        const address = await Address.findById(addressId)
    
        if(!address){
            return res.status(400).json({success:false,message:'invalid address Id'})
        }
    
        const cart = await Cart.findById(cartId).populate('items.product')
        if(!cart){
            return res.status(400).json({success:false,message:'invalid cart Id'})
        }
    
        let totalAmount=0
        const orderedItems=[]
    
        for(let item of cart.items){
            const product = await Product.findById(item.product._id)
            if(!product){
                return res.status(400).json({success:false,message:'Product not found'})
            }
    
            const variant = product.variants.find(a=>a._id.toString()===item.variantId)
    
            if(variant){
                let price = variant.price * item.quantity
                totalAmount+=price
    
                orderedItems.push({
                    product:item.product._id,
                    variantId:variant._id,
                    quantity:item.quantity,
                    price:variant.price
                })
    
                variant.stock -= item.quantity
                
                await product.save()
    
            }else{
                return res.status(400).json({success:false,message:'variant not found'})
            }
        }

        
        if(paymentMethod == 'cod'){
            paymentMethod='Cash on Delivery'
        }else{
            paymentMethod='Bank Transfer'
        }
        

        const orderID = await generateOrderId()
        
        const user = await User.findOne({email:req.session.email})
        const order = new Order({
            orderId:orderID,
            user:user._id,
            address:addressId,
            items:orderedItems,
            paymentMethod,
            totalAmount,
            orderStatus:'Pending'
        })
        
        

        await order.save()

        await Cart.findByIdAndDelete(cartId)
        res.status(200).json({success:true,message:'order is placed successfully '})



    }catch(error){
        console.error('error in ordering item',error)
        res.status(500).json({success:false,message:'an error occured,try again........'})
    }
   






}


const orderHistory = async (req,res)=>{
    if(req.session.email){
        
        const user = await User.findOne({email:req.session.email})
        
        const order = await Order.find({user:user._id}).populate('items.product')
        
        
        
        res.render('user/orderHistory',{order})

    }else{
        res.redirect('/user/login')
    }
}


const orderCancel =async (req,res)=>{
    try{
        if(req.session.email){
            const {orderId }=req.body
            
            const order = await Order.findById(orderId)
            
            if(!order){
              return   res.status(400).json({success:false,message:'order not found '})
            }
            await Order.findByIdAndUpdate(orderId,{orderStatus:'Cancelled'})
            res.status(200).json({success:true,message:'order cancelled succesfully'})


        }else{
            res.redirect('/user/login')
        }


    }catch(error){
        console.log('Error occurred while deleting cart items:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}


const orderDetails = async (req,res)=>{
    if(req.session.email){
        const orderId = req.query.orderId
        
        
        const order = await Order.findOne({_id:orderId}).populate('items.product').populate('address')
               
        res.render('user/orderDetails',{order})
    }else{
        res.redirect('/user/login')
    }
}

 
// ==============admin========================

// const orders =





module.exports={orderConfrom,orderHistory,orderCancel,orderDetails}