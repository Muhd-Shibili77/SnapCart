const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const validator = require("validator");
const nodemailer = require("nodemailer");
const OTP = require("../model/otpdb");
const Product = require('../model/productDB')
const Category = require('../model/categoryDB')
const Brand = require('../model/brandDB')
const axios = require('axios');

const get_login = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/login");
  }
};

const post_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;


  try {
    const userexist = await User.findOne({ email: email ,isAdmin:false});
   if(userexist.isBlock){
    res.render('user/login',{blocked:"you are blocked"})
   }else{
    if (userexist) {
      const passwordmatch = await bcrypt.compare(password, userexist.password);
      if (passwordmatch) {
        
        req.session.email = userexist.email;

        res.redirect("/user/home");
      } else {
        res.render("user/login", { passNo: "incorrect password" });
      }
    } else {
      res.render("user/login", { notexist: "Email not found" });
    }
   }
    
  } catch (err) {
    console.log("error in login ", err);
  }
};

const get_signup = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/signup");
  }
};

const genarateOTP = function generatotp() {
  return Math.floor(1000 + Math.random() * 9000);
};

const sendOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // This is for development only
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "OTP from SnapCart",
      text: `Your Signup OTP is ${otp}, it will expire after 60 seconds`,
    };

    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully to:", email);
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

const post_signup = async (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    const data = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    };
    const otp = genarateOTP();
try{
  const existphone = await User.findOne({ phone: data.phone }); //checking the user is exist or not
  const existemail = await User.findOne({ email: data.email }); //checking the user is exist or not
  const a = validator.trim(data.name);
  const b = validator.trim(data.phone);
  
  if (validator.isEmpty(a)) {
    res.render("user/signup", { Emptyname: "Cannot be Empty" });
  } else if (validator.isEmpty(b)) {
    res.render("user/signup", { Emptyphone: "Cannot be Empty" });
  } else {
    if (existemail) {
      res.render("user/signup", { existemail: "This email already exist" }); //if user exist show this on signup page
    } else if (existphone) {
      res.render("user/signup", {
        existphone: "This phone number already exist",
      }); //if user exist show this on signup page
    } else {
      const salt = 10; //number of salts
      const hashedpassword = await bcrypt.hash(data.password, salt); //hashing the password
      data.password = hashedpassword; //replacing normal password into hashed password
      req.session.data=data
      // const userData = await User.insertMany(data); // inserting data to database
      const otpmodel = new OTP({
        email: data.email,
        otp: otp,
      });
      req.session.tempemail =data.email
        
      console.log(req.session.tempemail)

      await sendOtp(data.email, otp);
      await otpmodel.save();
      res.redirect("/user/otp");
    }
  }
} catch(err){
  console.error("Error during signup:", err);
  res.render("user/signup", { error: "An error occurred. Please try again." });
} 
}
}

const get_otp_verification = async (req, res) => {
  if (!req.session.email) {
    res.render("user/otp");
  } else {
    res.redirect("/user/signup");
  }
};

const post_otp_verification = async (req, res) => {
  if (!req.session.email) {
    const { otp1, otp2, otp3, otp4 } = req.body;
    const otp = otp1 + otp2 + otp3 + otp4;

    const email = req.session.tempemail;
    const otpuse = await OTP.findOne({ email: email });
    if(!otpuse){
      res.render("user/otp", { err: "otp is expired" });
    }
    if (otpuse.otp == otp) {
      // await User.updateOne({ email: email }, { $set: { isVerify: true } });
      const data = req.session.data
      console.log(data)
      const userData = await User.insertMany(data)
      console.log(userData)
      console.log("signup successfull");

      res.redirect("/user/login");
    } else {
      res.render("user/otp", { err: "otp is not correct" });
    }
  } else {
    res.redirect("/user/signup");
  }
};





const resend_otp = async (req, res) => {
  const email = req.session.tempemail;
  console.log(req.session.tempemail+"this is from resemd ptp")
  console.log("Starting OTP resend process for:", email);

  try {
      // Corrected to find the user by email
      const user = await OTP.findOne({ email });

      if (!user) {
          console.log('User not found');
          return res.redirect('/user/signup');
      }

      const otp = genarateOTP(); // Assuming this function generates a new OTP
      await OTP.findOneAndDelete({ email }); // Delete any existing OTPs for this user

      // Create and save the new OTP
      const otpModel = new OTP({
          email: email,
          otp: otp,
      });
      await otpModel.save();

      // Send the OTP to the user's email
      await sendOtp(email, otp);

      res.redirect('/user/otp'); // Redirect to the OTP page
  } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).send('Server error. Please try again later.'); // Respond with an error status
  }
};

const get_home = async(req, res) => {
  if(req.session.email){
    const mensProduct = await Product.find({category_id:'66e01b1fb148f23cc19fa331'}).populate('category_id')
    const womensProduct = await Product.find({category_id:'66e18d806bf28e92c6d2e0ea'}).populate('category_id')
    const kidsProduct = await Product.find({category_id:'66e18d856bf28e92c6d2e0f2'}).populate('category_id')
    const accessoris = await Product.find({category_id:'66e2970551da17d55eb8ba49'}).populate('category_id')
    res.render("user/home",{mensProduct,womensProduct,kidsProduct,accessoris});

  }else{
    res.redirect('/user/login')
  }

};

const allProducts = async (req,res)=>{
  if(req.session.email){
    const product = await Product.find()
    res.render('user/products',{product})
  }else{
    res.redirect('/user/login')
  }
}

const singleProduct = async(req,res)=>{
  if(req.session.email){
    const id = req.query.id
    const product = await Product.findOne({_id:id}).populate('category_id')
    const category = product.category_id;
    const relatableProduct = await Product.find({category_id:category})
    res.render('user/single-product',{product,relatableProduct})
  }else{
    res.redirect('/user/login')
  }
}

const category =async (req,res)=>{
  if(req.session.email){
    const id = req.query.id
    const category = await Product.find({category_id:id}).populate('category_id')
    res.render('user/category',{category})

  }else{
    res.redirect('/user/login')
  }
}

const about = (req,res)=>{
  if(req.session.email){
    res.render('user/about')
  }else{
    res.redirect('/user/login')
  }
}
const contact = (req,res)=>{
  if(req.session.email){
    res.render('user/contact')
  }else{
    res.redirect('/user/login')
  }
}


const user_logout=(req,res)=>{
    req.session.destroy((err) => {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/");
        }
      });

}

module.exports = {
  get_login,
  post_login,
  get_signup,
  post_signup,
  get_home,
  get_otp_verification,
  post_otp_verification,
  user_logout,
  resend_otp,
  allProducts,
  singleProduct,
  category,
  about,
  contact,
}
