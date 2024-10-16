const express = require('express')
const orderrouter = express.Router()
const orderController = require('../controller/orderController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

orderrouter.use(userBlock)

orderrouter.post('/confrom_order',userAuth,orderController.orderConfrom)

orderrouter.post('/confrom_order_razorPay',orderController.confrom_order_razorPay)

orderrouter.post('/razorPay_verify_payment',orderController.razorPay_verify_payment)

orderrouter.post('/confrom_order_wallet',userAuth,orderController.confrom_order_wallet)

orderrouter.get('/order_history',userAuth,orderController.orderHistory)

orderrouter.post('/cancel_order',userAuth,orderController.orderCancel)

orderrouter.get('/order_detials',userAuth,orderController.orderDetails)

orderrouter.post('/order_return',userAuth,orderController.orderReturn)

orderrouter.post('/downloadInvoice',userAuth,orderController.downloadInvoice)

orderrouter.post('/repaymentRazorpay',orderController.repaymentRazorpay)

orderrouter.post('/verifyRepayment',orderController.verifyRepayment)





module.exports= orderrouter