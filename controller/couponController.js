const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");
const Cart = require("../model/cartDb");
const Address = require("../model/AddressDB");
const Coupon = require('../model/couponDB')


const coupon =async (req,res)=>{
    
      const coupon = await Coupon.find()
      res.render('admin/adminCoupon',{coupon})
    
  }
  
  const addCoupon =async (req,res)=>{
    
      const {couponCode , discount , startDate , endDate,minAmount,maxAmount,couponDescription} = req.body
   
      
      const existingCoupon = await Coupon.findOne({
        coupon_code: { $regex: new RegExp(`^${couponCode}$`, "i") },
      });
  
      if (existingCoupon) {
        return res.json({ success:false,error: "Coupon with this code already exists." });
      }
     
      if(!couponCode){
        return res.json({success:false,error:'coupon code is empty'})
    }
    if(!discount){
        return res.json({success:false,error:'coupon discount is empty'})
    }
    if (isNaN(discount)) {      
        return res.json({success:false,error:'discount must be a number.'})
    }

    if (discount < 1 || discount > 100) {
        return res.json({success:false,error:'discount not more than 100 and less than 0'})
    }
    if (discount !== Math.floor(discount)) {
        return res.json({success:false,error:'discound must be a whole number.'})
    }

    if(!endDate){
        return res.json({success:false,error:'coupon endDate is empty'})
    }
    if (endDate <= startDate) {
      return res.json({success:false,error:'End date must be after the start date.'})
      }
    if(!startDate){
        return res.json({success:false,error:'coupon startDate is empty'})
    }
    const currentDate = new Date()
    if (startDate < currentDate) {
        return res.json({success:false,error:'Start date cannot be in the past'})
    }

    if(!minAmount){
        return res.json({success:false,error:'coupon minAmount is empty'})
    }
    if (isNaN(minAmount)) {
        return res.json({success:false,error:'Min Amount must be a number.'})
      }
      if (parseInt(minAmount) === 0) {
         return res.json({success:false,error:'Min Amount cannot be zero.'})
      }
    if(!maxAmount){
        return res.json({success:false,error:'coupon maxAmount is empty'})
    }
    if (isNaN(maxAmount)) {
        return res.json({success:false,error:'Max Amount must be a number.'})
      }
      if (parseInt(maxAmount) === 0) {
         return res.json({success:false,error:'Max Amount cannot be zero.'})
      }
    
    if(!couponDescription){
        return res.json({success:false,error:'couponDescription is empty'})
    }
  
  
  
     const newCoupon = new Coupon({
       coupon_code:couponCode,
       discount:discount,
       start_date:startDate,
       exipry_date:endDate,
       min_purchase_amount:minAmount,
       max_coupon_amount :maxAmount,
       coupon_description:couponDescription
     })
  
     await newCoupon.save()
     res.json({success:true,message:'coupon successfully addedd'})
    
  }
  
  const editCoupon = async (req,res)=>{
   
        const {couponId,couponCode , discount , startDate , endDate,minAmount,maxAmount,couponDescription} = req.body
        
        
        
        if(!couponCode){
            return res.json({success:false,error:'coupon code is empty'})
        }
        if(!discount){
            return res.json({success:false,error:'coupon discount is empty'})
        }
        if (isNaN(discount)) {      
            return res.json({success:false,error:'discount must be a number.'})
        }
  
        if (discount < 1 || discount > 100) {
            return res.json({success:false,error:'discount not more than 100 and less than 0'})
        }
        if (discount !== Math.floor(discount)) {
            return res.json({success:false,error:'discound must be a whole number.'})
        }

        if(!endDate){
            return res.json({success:false,error:'coupon endDate is empty'})
        }
        if (endDate <= startDate) {
          return res.json({success:false,error:'End date must be after the start date.'})
          }
        if(!startDate){
            return res.json({success:false,error:'coupon startDate is empty'})
        }
        const currentDate = new Date()
        if (startDate < currentDate) {
            return res.json({success:false,error:'Start date cannot be in the past'})
        }

        if(!minAmount){
            return res.json({success:false,error:'coupon minAmount is empty'})
        }
        if (isNaN(minAmount)) {
            return res.json({success:false,error:'Min Amount must be a number.'})
          }
          if (parseInt(minAmount) === 0) {
             return res.json({success:false,error:'Min Amount cannot be zero.'})
          }
        if(!maxAmount){
            return res.json({success:false,error:'coupon maxAmount is empty'})
        }
        if (isNaN(maxAmount)) {
            return res.json({success:false,error:'Max Amount must be a number.'})
          }
          if (parseInt(maxAmount) === 0) {
             return res.json({success:false,error:'Max Amount cannot be zero.'})
          }
        
        if(!couponDescription){
            return res.json({success:false,error:'couponDescription is empty'})
        }

        await Coupon.findByIdAndUpdate(couponId,{
            
           coupon_code:couponCode,
           discount:discount,
           start_date:new Date(startDate),
           exipry_date:new Date(endDate),
           min_purchase_amount:minAmount,
           max_coupon_amount:maxAmount,
           coupon_description:couponDescription
        })
        res.json({success:true,message:'coupon edited successfully'})

   
  }

const deleteCoupon = async (req,res)=>{
   
        const {couponId}=req.body
        if(!couponId){
            return res.json({success:false,error:'couponId not found'})
        }
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
            return res.json({success:false,error:'coupon is not found'})
        }
        await Coupon.findByIdAndDelete(couponId)
        res.json({success:true,message:'coupon is deleted successfully'})
    
}

module.exports={
    coupon,
    addCoupon,
    editCoupon,
    deleteCoupon,
}