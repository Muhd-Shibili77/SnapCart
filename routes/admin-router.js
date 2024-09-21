const express = require("express");
const adminrouter = express.Router();
const upload = require("../config/multer");
const adminController = require('../controller/adminController')
const productController =require('../controller/productController')

adminrouter.get("/login",adminController.admin_login);

adminrouter.post("/login",adminController.post_admin_login);

adminrouter.get("/dashboard",adminController.admin_dashboard);

adminrouter.get("/users",adminController.admin_users);

adminrouter.post("/block",adminController.block_users);

adminrouter.post("/unblock",adminController.unblock_users);

adminrouter.get("/products",productController.admin_products);

adminrouter.get("/product_detail",productController.product_detail);

adminrouter.get("/add_products",productController.add_products);

adminrouter.post("/add_products", upload.any(), productController.post_add_products);

adminrouter.post("/delete_products",productController.delete_products);

adminrouter.post("/restore_product",productController.restore_products);

adminrouter.get("/edit_product",productController.get_edit_products);

adminrouter.post("/edit_product", upload.any(),productController.post_edit_products);

adminrouter.get("/category",adminController.admin_category);

adminrouter.post("/add_category",adminController.add_category);

adminrouter.post("/delete_category",adminController.delete_category);

adminrouter.post("/restore_category",adminController.restore_category);

adminrouter.post("/edit_category",adminController.edit_category);

adminrouter.get("/brand",adminController.admin_brand);

adminrouter.post("/add_brand",adminController.add_brand);

adminrouter.post("/delete_brand",adminController.delete_brand);

adminrouter.post("/restore_brand",adminController.restore_brand);

adminrouter.post("/edit_brand",adminController.edit_brand);

adminrouter.get("/orders",adminController.orders);

adminrouter.post('/update_orderStatus',adminController.update_orderStatus)

adminrouter.get("/logout",adminController.admin_logout);

module.exports = adminrouter;
