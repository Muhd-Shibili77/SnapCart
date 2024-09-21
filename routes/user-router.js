const express = require("express");
const userrouter = express.Router();
const userController = require('../controller/user-controller')


userrouter.use(userController.checkuser)

userrouter.get("/login", userController.get_login);

userrouter.post("/login", userController.post_login);

userrouter.get("/signup", userController.get_signup);

userrouter.post("/signup", userController.post_signup);

userrouter.get("/otp", userController.get_otp_verification);

userrouter.post("/otp", userController.post_otp_verification);

userrouter.post("/resendOtp",userController.resend_otp);

userrouter.get("/home",userController.get_home);

userrouter.get('/products',userController.allProducts)

userrouter.get('/product',userController.singleProduct)

userrouter.get('/category',userController.category)

userrouter.get('/about',userController.about)

userrouter.get('/contact',userController.contact) 

userrouter.get('/profile',userController.userProfile) 

userrouter.post('/edit_profile',userController.editProfile)

userrouter.get('/address',userController.address)

userrouter.post('/add_address',userController.add_address)

userrouter.post('/edit_address',userController.edit_address)

userrouter.post('/delete_address',userController.delete_address)

userrouter.get('/password',userController.password)

userrouter.post('/changePassword',userController.changePassword)

userrouter.get('/forgetPassword',userController.forgetPassword)

userrouter.post('/forgetPassword',userController.postForgetPassword)

userrouter.get('/forgetOtp',userController.getForgetOtp)

userrouter.post('/forgetOtp',userController.postForgetOtp)

userrouter.post('/passwordChange',userController.forgetChangePassword)

userrouter.post('/forgetResendOtp',userController.forgetResendOtp)

userrouter.get('/search',userController.search)

userrouter.get('/sort',userController.sort)

userrouter.get("/logout",userController.user_logout);

module.exports = userrouter;
