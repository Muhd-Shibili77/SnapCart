const mongoose = require('mongoose')

// Define the schema for Products
const productSchema = new mongoose.Schema({
   
    product_name: {
        type: String,
        required: true,
        unique: true,
    },
    product_highlights: {
        type: String,
        required: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    brand_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    product_description: {
        type: String,
        required: true
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    saleCount:{
        type:Number,
        default:0
    },
    variants: [{
        price: {
            type: Number,
            required: true,
        },
        discount_price:{
            type:Number,
            default:0
        },
        offer:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Offer'
        },
        size: {
            type: String,
            default:null,
            required: true,
        },
        stock: {
            type: Number,
            required: true,
        },
        color: {
            type: String,
            required: true
        },
        images: [{ 
            type: String,
            required: false
        }]
        
    }]
}, {
    timestamps: true,
});

// Create and export the model
const Products = mongoose.model('Products', productSchema);

module.exports = Products;