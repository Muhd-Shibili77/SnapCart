const express = require("express");
const cartrouter = express.Router();
const cartController = require('../controller/cartController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

cartrouter.use(userBlock)

cartrouter.get('/',userAuth,cartController.cart)

cartrouter.post('/addToCart',userAuth,cartController.add_to_cart)

cartrouter.post('/updateCart',cartController.updateCart)

cartrouter.delete('/deleteCart',cartController.deleteCart)

cartrouter.get('/checkout',userAuth,cartController.cartCheckout)

cartrouter.get('/checkoutOrder',userAuth,cartController.cartCheckoutorder)

cartrouter.post('/applyCoupon',userAuth,cartController.applyCoupon)

cartrouter.post('/applyCouponToUser',userAuth,cartController.applyCouponToUser)

cartrouter.post('/applyCouponFromUser',userAuth,cartController.applyCouponFromUser)

module.exports = cartrouter