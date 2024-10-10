const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({

    orderId:{
        type:String,
        unique:true,
        required:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:'User'
    },
    address:[{

        fullName:{
            type:String,
            required:true
        },
        streetAddress:{
            type:String,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        country:{
            type:String,
            required:true
        },
    }],
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            required:true,
            ref:'Products'
        },
        variantId:{
            type:String
        },
        quantity:{
            type:Number,
            required:true,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        isReturnRequested: {
            type: Boolean,
            default: false
        },
        isAdminAcceptedReturn: {
            type: String,
            
            enum: ['Pending', 'Accepted', 'Rejected']
        },
        reasonOfReturn: {
            type: String
        },
        additionalReason: {
            type: String
        }
    }],
    paymentMethod:{
        type:String,
        required:true,
        enum:['Cash on Delivery', 'Bank Transfer','Wallet']
    },
    razorpayOrderId: {
        type: String,
        default: null,
        sparse: true
    },
    paymentStatus: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Paid', 'Failed'] 
    },
    totalAmount:{
        type:Number,
        required:true
    },
    discountAmount: {  
        type: Number,
        default: 0
    },
    payableAmount: {
        type: Number,
        required: true
    },
    couponApplied: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: false
    },
    orderStatus:{
        type:String,
        required:true,
        enum:['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    },
    placeAt:{
        type:Date,
        default:Date.now()
    }
},{timestamps:true})

const Order = mongoose.model('Order',orderSchema)
module.exports=Order