const express = require("express");
const adminrouter = express.Router();
const upload = require("../config/multer");
const authController = require('../controller/admin/authController')
const brandController = require('../controller/admin/brandController')
const categoryController = require('../controller/admin/categoryController')
const dashboardController = require('../controller/admin/dashboardController')
const orderController = require('../controller/admin/orderController')
const reportController = require('../controller/admin/reportController')
const userController = require('../controller/admin/userController')

const productController =require('../controller/productController')
const offerController = require('../controller/offerController')
const couponController = require('../controller/couponController')
const adminAuth = require('../middleware/adminAuth')


adminrouter.get("/login",authController.admin_login);

adminrouter.post("/login",authController.post_admin_login);

adminrouter.get("/dashboard",adminAuth,dashboardController.admin_dashboard);

adminrouter.get("/users",adminAuth,userController.admin_users);

adminrouter.post("/block",adminAuth,userController.block_users);

adminrouter.post("/unblock",adminAuth,userController.unblock_users);

adminrouter.get("/products",adminAuth,productController.admin_products);

adminrouter.get("/product_detail",adminAuth,productController.product_detail);

adminrouter.get("/add_products",adminAuth,productController.add_products);

adminrouter.post("/add_products",adminAuth, upload.any(), productController.post_add_products);

adminrouter.post("/delete_products",adminAuth,productController.delete_products);

adminrouter.post("/restore_product",adminAuth,productController.restore_products);

adminrouter.get("/edit_product",adminAuth,productController.get_edit_products);

adminrouter.post("/edit_product",adminAuth, upload.any(),productController.post_edit_products);

adminrouter.get("/category",adminAuth,categoryController.admin_category);

adminrouter.post("/add_category",categoryController.add_category);

adminrouter.post("/delete_category",adminAuth,categoryController.delete_category);

adminrouter.post("/restore_category",adminAuth,categoryController.restore_category);

adminrouter.post("/edit_category",adminAuth,categoryController.edit_category);

adminrouter.get("/brand",adminAuth,brandController.admin_brand);

adminrouter.post("/add_brand",brandController.add_brand);

adminrouter.post("/delete_brand",adminAuth,brandController.delete_brand);

adminrouter.post("/restore_brand",adminAuth,brandController.restore_brand);

adminrouter.post("/edit_brand",adminAuth,brandController.edit_brand);

adminrouter.get("/orders",adminAuth,orderController.orders);

adminrouter.get("/offers",adminAuth,offerController.offers);

adminrouter.post("/addOffers",adminAuth,offerController.addOffers);

adminrouter.post("/deleteOffer",adminAuth,offerController.deleteOffer);

adminrouter.post("/restoreOffer",adminAuth,offerController.restoreOffer);

adminrouter.post("/editOffers",adminAuth,offerController.editOffers);

adminrouter.post("/updateProductOffer",offerController.updateProductOffer);

adminrouter.post("/removeProductOffer",adminAuth,offerController.removeProductOffer);

adminrouter.post("/updateCategoryOffer",offerController.updateCategoryOffer);

adminrouter.post("/removeCategoryOffer",offerController.removeCategoryOffer);

adminrouter.post('/update_orderStatus',adminAuth,orderController.update_orderStatus)

adminrouter.post('/rejectReturn',adminAuth,orderController.rejectReturn)

adminrouter.post('/acceptReturn',adminAuth,orderController.acceptReturn)

adminrouter.get('/coupon',adminAuth,couponController.coupon)

adminrouter.post('/addCoupon',adminAuth,couponController.addCoupon)

adminrouter.post('/editCoupon',adminAuth,couponController.editCoupon)

adminrouter.post('/deleteCoupon',adminAuth,couponController.deleteCoupon)

adminrouter.post('/downloadReport',reportController.downloadReport)

adminrouter.get("/logout",authController.admin_logout);

module.exports = adminrouter;
