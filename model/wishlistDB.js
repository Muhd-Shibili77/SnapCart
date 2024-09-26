const mongoose = require('mongoose')

const WishlistSchema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Products',
            required:true
        },
        variantId:{
            type:String,
            required:true
        }
    }],
},{timestamps:true})

const Wishlist = mongoose.model('Wishlist',WishlistSchema)

module.exports=Wishlist