const express = require("express");
const userrouter = express.Router();
// const userController = require('../controller/user-controller')
const addressController = require('../controller/user/addressController')
const authController = require('../controller/user/authController')
const userController = require('../controller/user/userController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

userrouter.use(userBlock)

userrouter.get("/login", authController.get_login);

userrouter.post("/login", authController.post_login);

userrouter.get("/signup", authController.get_signup);

userrouter.post("/signup", authController.post_signup);

userrouter.get("/otp", authController.get_otp_verification);

userrouter.post("/otp", authController.post_otp_verification);

userrouter.post("/resendOtp",authController.resend_otp);

userrouter.get("/home",userAuth,userController.get_home);

userrouter.get('/products',userAuth,userController.allProducts)

userrouter.get('/product',userAuth,userController.singleProduct)

userrouter.get('/category',userAuth,userController.category)

userrouter.get('/about',userAuth,userController.about)

userrouter.get('/contact',userAuth,userController.contact) 

userrouter.get('/profile',userAuth,userController.userProfile) 

userrouter.post('/edit_profile',userAuth,userController.editProfile)

userrouter.get('/address',userAuth,addressController.address)

userrouter.post('/add_address',userAuth,addressController.add_address)

userrouter.post('/edit_address',userAuth,addressController.edit_address)

userrouter.post('/delete_address',userAuth,addressController.delete_address)

userrouter.get('/password',userAuth,userController.password)

userrouter.post('/changePassword',userAuth,userController.changePassword)

userrouter.get('/forgetPassword',userController.forgetPassword)

userrouter.post('/forgetPassword',userController.postForgetPassword)

userrouter.get('/forgetOtp',userController.getForgetOtp)

userrouter.post('/forgetOtp',userController.postForgetOtp)

userrouter.get('/passwordChange',userController.get_forgetChangePassword)

userrouter.post('/passwordChange',userController.post_forgetChangePassword)

userrouter.post('/forgetResendOtp',userController.forgetResendOtp)

userrouter.get("/logout",authController.user_logout);

module.exports = userrouter;
