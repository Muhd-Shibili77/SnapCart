const express = require('express')
const adminrouter=express.Router()

adminrouter.get('/dashboard',(req,res)=>{
    if(req.session.user){
        res.redirect('/user/home')
    }if(req.session.isAdmin){
        res.render('admin/admin-dashboard')
    }else{
        res.redirect('/')
    }
})



module.exports=adminrouter