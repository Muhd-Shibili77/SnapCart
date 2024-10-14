const express = require('express')
const orderrouter = express.Router()
const orderController = require('../controller/orderController')
const userBlock = require('../middleware/userBlock')


orderrouter.use(userBlock)

orderrouter.post('/confrom_order',orderController.orderConfrom)

orderrouter.post('/confrom_order_razorPay',orderController.confrom_order_razorPay)

orderrouter.post('/razorPay_verify_payment',orderController.razorPay_verify_payment)

orderrouter.post('/confrom_order_wallet',orderController.confrom_order_wallet)

orderrouter.get('/order_history',orderController.orderHistory)

orderrouter.post('/cancel_order',orderController.orderCancel)

orderrouter.get('/order_detials',orderController.orderDetails)

orderrouter.post('/order_return',orderController.orderReturn)

orderrouter.post('/downloadInvoice',orderController.downloadInvoice)

orderrouter.post('/repaymentRazorpay',orderController.repaymentRazorpay)

orderrouter.post('/verifyRepayment',orderController.verifyRepayment)





module.exports= orderrouter