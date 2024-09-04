const express = require("express");
const userrouter = express.Router();

const {
  get_login,
  post_login,
  get_signup,
  post_signup,
  get_home,
  get_otp_verification,
  post_otp_verification,
  resend_otp,
  user_logout,
} = require("../controller/user-controller");

userrouter.get("/login", get_login);

userrouter.post("/login", post_login);

userrouter.get("/signup", get_signup);

userrouter.post("/signup", post_signup);

userrouter.get("/otp", get_otp_verification);

userrouter.post("/otp", post_otp_verification);

userrouter.post("/resendOtp",resend_otp);

userrouter.get("/home", get_home);

userrouter.get("/logout", user_logout);

module.exports = userrouter;
