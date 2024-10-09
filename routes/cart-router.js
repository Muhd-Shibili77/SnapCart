const express = require("express");
const cartrouter = express.Router();
const cartController = require('../controller/cartController')


cartrouter.get('/',cartController.cart)

cartrouter.post('/addToCart',cartController.add_to_cart)

cartrouter.post('/updateCart',cartController.updateCart)

cartrouter.delete('/deleteCart',cartController.deleteCart)

cartrouter.get('/checkout',cartController.cartCheckout)

cartrouter.get('/checkoutOrder',cartController.cartCheckoutorder)

cartrouter.post('/applyCoupon',cartController.applyCoupon)

cartrouter.post('/applyCouponToUser',cartController.applyCouponToUser)

cartrouter.post('/applyCouponFromUser',cartController.applyCouponFromUser)

module.exports = cartrouter