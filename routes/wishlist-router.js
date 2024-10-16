const express = require('express')
const wishlistrouter = express.Router()
const wishlistController = require('../controller/wishlistController')
const userBlock = require('../middleware/userBlock')
const userAuth = require('../middleware/userAuth')

wishlistrouter.use(userBlock)

wishlistrouter.get('/',userAuth,wishlistController.wishlistGet)

wishlistrouter.post('/toWishlist',userAuth,wishlistController.addToWishlist)

wishlistrouter.post('/DeleteWishlist',userAuth,wishlistController.removeFromWishlist)


module.exports=wishlistrouter