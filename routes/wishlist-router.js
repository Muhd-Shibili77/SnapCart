const express = require('express')
const wishlistrouter = express.Router()
const wishlistController = require('../controller/wishlistController')

wishlistrouter.get('/',wishlistController.wishlistGet)



module.exports=wishlistrouter