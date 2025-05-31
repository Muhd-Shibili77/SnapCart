const express = require('express')
const orderrouter = express.Router()
const orderController = require('../controller/orderController')
const paymentController = require('../controller/paymentController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

orderrouter.use(userBlock)

orderrouter.post('/confrom_order',userAuth,orderController.orderConfrom)

orderrouter.post('/confrom_order_razorPay',paymentController.confrom_order_razorPay)

orderrouter.post('/razorPay_verify_payment',paymentController.razorPay_verify_payment)

orderrouter.post('/confrom_order_wallet',userAuth,paymentController.confrom_order_wallet)

orderrouter.get('/order_history',userAuth,orderController.orderHistory)

orderrouter.post('/cancel_order',userAuth,orderController.orderCancel)

orderrouter.get('/order_detials',userAuth,orderController.orderDetails)

orderrouter.post('/order_return',userAuth,orderController.orderReturn)

orderrouter.post('/downloadInvoice',userAuth,orderController.downloadInvoice)

orderrouter.post('/repaymentRazorpay',paymentController.repaymentRazorpay)

orderrouter.post('/verifyRepayment',paymentController.verifyRepayment)





module.exports= orderrouter