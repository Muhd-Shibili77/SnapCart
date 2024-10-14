const express = require('express')
const wishlistrouter = express.Router()
const wishlistController = require('../controller/wishlistController')
const userBlock = require('../middleware/userBlock')

wishlistrouter.use(userBlock)

wishlistrouter.get('/',wishlistController.wishlistGet)

wishlistrouter.post('/toWishlist',wishlistController.addToWishlist)

wishlistrouter.post('/DeleteWishlist',wishlistController.removeFromWishlist)


module.exports=wishlistrouter