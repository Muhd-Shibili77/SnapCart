const express = require('express')
const orderrouter = express.Router()
const orderController = require('../controller/orderController')

orderrouter.post('/confrom_order',orderController.orderConfrom)

orderrouter.get('/order_history',orderController.orderHistory)

orderrouter.post('/cancel_order',orderController.orderCancel)

orderrouter.get('/order_detials',orderController.orderDetails)





module.exports= orderrouter