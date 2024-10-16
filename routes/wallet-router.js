const express = require('express')
const walletrouter = express.Router()
const walletController = require('../controller/walletController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

walletrouter.use(userBlock)

walletrouter.get('/',userAuth,walletController.userWallet)

walletrouter.post('/addFund',userAuth,walletController.addFund)

walletrouter.post('/verifyPayment',userAuth,walletController.verifyPayment)

module.exports = walletrouter