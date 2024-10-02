const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    category_name:{
        type:String,
        required:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    offer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Offer'
    }
   },{
      timestamps:true
});

const category = mongoose.model('Category',categorySchema)
module.exports=category
