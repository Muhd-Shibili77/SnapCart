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
        }
    }],
    paymentMethod:{
        type:String,
        required:true,
        enum:['Cash on Delivery', 'Bank Transfer']
    },
    totalAmount:{
        type:Number,
        required:true
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