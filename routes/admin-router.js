const express = require("express");
const adminrouter = express.Router();

const {
  admin_login,
  post_admin_login,
  admin_dashboard,
  admin_users,
  admin_logout,
  block_users,
  unblock_users,
  admin_products,
  add_products,
  admin_category,
  add_category,
  delete_category,
  restore_category,
  edit_category,
  admin_brand,
  add_brand,
  delete_brand,
  restore_brand,
  edit_brand,
} = require("../controller/adminController");

adminrouter.get("/login", admin_login);

adminrouter.post("/login", post_admin_login);

adminrouter.get("/dashboard", admin_dashboard);

adminrouter.get("/users", admin_users);

adminrouter.post("/block", block_users);

adminrouter.post("/unblock", unblock_users);

adminrouter.get("/products", admin_products);

adminrouter.get("/add_products", add_products);

adminrouter.get("/category", admin_category);

adminrouter.post("/add_category", add_category);

adminrouter.post("/delete_category", delete_category);

adminrouter.post("/restore_category", restore_category);

adminrouter.post("/edit_category", edit_category);

adminrouter.get("/brand", admin_brand);

adminrouter.post("/add_brand", add_brand);

adminrouter.post("/delete_brand", delete_brand);

adminrouter.post("/restore_brand", restore_brand);

adminrouter.post("/edit_brand", edit_brand);







adminrouter.get("/logout", admin_logout);

module.exports = adminrouter;