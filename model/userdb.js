const mongoose = require ('mongoose')

const UserSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
        
    },
    email:{
        type:String,
        required:true
        
    },
    phone:{
        type:String,

        
    },
    password:{
        type:String,
        
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    isBlock:{
        type:Boolean,
        default:false
    },
    isVerify:{
        type:Boolean,
        default:true
    }
},{timestamps : true });

const User = mongoose.model("User",UserSchema);
module.exports = User;