const User = require("../model/userdb");
const Product = require('../model/productDB')
const Category = require('../model/categoryDB')
const Brand = require('../model/brandDB')



const wishlistGet = async (req,res)=>{
    if(req.session.email){
        res.render('user/wishlist')
    }else{
        res.redirect('/user/login')
    }

}






module.exports = {
    wishlistGet
}