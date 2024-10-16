const express = require("express");
const userrouter = express.Router();
const userController = require('../controller/user-controller')
const walletController = require('../controller/walletController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

userrouter.use(userBlock)

userrouter.get("/login", userController.get_login);

userrouter.post("/login", userController.post_login);

userrouter.get("/signup", userController.get_signup);

userrouter.post("/signup", userController.post_signup);

userrouter.get("/otp", userController.get_otp_verification);

userrouter.post("/otp", userController.post_otp_verification);

userrouter.post("/resendOtp",userController.resend_otp);

userrouter.get("/home",userAuth,userController.get_home);

userrouter.get('/products',userAuth,userController.allProducts)

userrouter.get('/product',userAuth,userController.singleProduct)

userrouter.get('/category',userAuth,userController.category)

userrouter.get('/about',userAuth,userController.about)

userrouter.get('/contact',userAuth,userController.contact) 

userrouter.get('/profile',userAuth,userController.userProfile) 

userrouter.post('/edit_profile',userAuth,userController.editProfile)

userrouter.get('/address',userAuth,userController.address)

userrouter.post('/add_address',userAuth,userController.add_address)

userrouter.post('/edit_address',userAuth,userController.edit_address)

userrouter.post('/delete_address',userAuth,userController.delete_address)

userrouter.get('/password',userAuth,userController.password)

userrouter.post('/changePassword',userAuth,userController.changePassword)

userrouter.get('/forgetPassword',userController.forgetPassword)

userrouter.post('/forgetPassword',userController.postForgetPassword)

userrouter.get('/forgetOtp',userController.getForgetOtp)

userrouter.post('/forgetOtp',userController.postForgetOtp)

userrouter.get('/passwordChange',userController.get_forgetChangePassword)

userrouter.post('/passwordChange',userController.post_forgetChangePassword)

userrouter.post('/forgetResendOtp',userController.forgetResendOtp)

userrouter.get("/logout",userController.user_logout);

module.exports = userrouter;
