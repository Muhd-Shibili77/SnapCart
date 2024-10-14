const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
    offerName:{
        type:String,
        required:true
    },
    offerPercentage:{
        type:Number,
        required:true
    },
    offerStartDate:{
        type:Date,
        required:true
    },
    isDelete:{
        type:Boolean,
        default:false
    }
});

const Offer = mongoose.model('Offer',offerSchema)

module.exports=Offer