const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
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
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
},{timestamps:true})

const Address = mongoose.model('Address',addressSchema)

module.exports = Address;