const express = require("express");
const cartrouter = express.Router();
const cartController = require('../controller/cartController')


cartrouter.get('/',cartController.cart)

cartrouter.post('/addToCart',cartController.add_to_cart)

cartrouter.post('/updateCart',cartController.updateCart)

cartrouter.delete('/deleteCart',cartController.deleteCart)

cartrouter.get('/checkout',cartController.cartCheckout)

module.exports = cartrouter