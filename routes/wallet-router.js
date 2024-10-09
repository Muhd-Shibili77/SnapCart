const express = require('express')
const walletrouter = express.Router()
const walletController = require('../controller/walletController')

walletrouter.get('/',walletController.userWallet)

walletrouter.post('/addFund',walletController.addFund)

walletrouter.post('/verifyPayment',walletController.verifyPayment)

module.exports = walletrouter