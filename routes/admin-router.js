const express = require("express");
const adminrouter = express.Router();
const upload = require("../config/multer");
const adminController = require('../controller/adminController')
const productController =require('../controller/productController')
const offerController = require('../controller/offerController')
const couponController = require('../controller/couponController')
const adminAuth = require('../middleware/adminAuth')


adminrouter.get("/login",adminController.admin_login);

adminrouter.post("/login",adminController.post_admin_login);

adminrouter.get("/dashboard",adminAuth,adminController.admin_dashboard);

adminrouter.get("/users",adminAuth,adminController.admin_users);

adminrouter.post("/block",adminAuth,adminController.block_users);

adminrouter.post("/unblock",adminAuth,adminController.unblock_users);

adminrouter.get("/products",adminAuth,productController.admin_products);

adminrouter.get("/product_detail",adminAuth,productController.product_detail);

adminrouter.get("/add_products",adminAuth,productController.add_products);

adminrouter.post("/add_products",adminAuth, upload.any(), productController.post_add_products);

adminrouter.post("/delete_products",adminAuth,productController.delete_products);

adminrouter.post("/restore_product",adminAuth,productController.restore_products);

adminrouter.get("/edit_product",adminAuth,productController.get_edit_products);

adminrouter.post("/edit_product",adminAuth, upload.any(),productController.post_edit_products);

adminrouter.get("/category",adminAuth,adminController.admin_category);

adminrouter.post("/add_category",adminController.add_category);

adminrouter.post("/delete_category",adminAuth,adminController.delete_category);

adminrouter.post("/restore_category",adminAuth,adminController.restore_category);

adminrouter.post("/edit_category",adminAuth,adminController.edit_category);

adminrouter.get("/brand",adminAuth,adminController.admin_brand);

adminrouter.post("/add_brand",adminController.add_brand);

adminrouter.post("/delete_brand",adminAuth,adminController.delete_brand);

adminrouter.post("/restore_brand",adminAuth,adminController.restore_brand);

adminrouter.post("/edit_brand",adminAuth,adminController.edit_brand);

adminrouter.get("/orders",adminAuth,adminController.orders);

adminrouter.get("/offers",adminAuth,offerController.offers);

adminrouter.post("/addOffers",adminAuth,offerController.addOffers);

adminrouter.post("/deleteOffer",adminAuth,offerController.deleteOffer);

adminrouter.post("/restoreOffer",adminAuth,offerController.restoreOffer);

adminrouter.post("/editOffers",adminAuth,offerController.editOffers);

adminrouter.post("/updateProductOffer",offerController.updateProductOffer);

adminrouter.post("/removeProductOffer",adminAuth,offerController.removeProductOffer);

adminrouter.post("/updateCategoryOffer",offerController.updateCategoryOffer);

adminrouter.post("/removeCategoryOffer",offerController.removeCategoryOffer);

adminrouter.post('/update_orderStatus',adminAuth,adminController.update_orderStatus)

adminrouter.post('/rejectReturn',adminAuth,adminController.rejectReturn)

adminrouter.post('/acceptReturn',adminAuth,adminController.acceptReturn)

adminrouter.get('/coupon',adminAuth,couponController.coupon)

adminrouter.post('/addCoupon',adminAuth,couponController.addCoupon)

adminrouter.post('/editCoupon',adminAuth,couponController.editCoupon)

adminrouter.post('/deleteCoupon',adminAuth,couponController.deleteCoupon)

adminrouter.post('/downloadReport',adminController.downloadReport)

adminrouter.get("/logout",adminController.admin_logout);

module.exports = adminrouter;
