const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const validator = require("validator");
const nodemailer = require("nodemailer");
const OTP = require("../model/otpdb");
const Product = require('../model/productDB')
const Category = require('../model/categoryDB')
const Brand = require('../model/brandDB')
const Address = require('../model/AddressDB')
const axios = require('axios');

const get_login = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/login",{success:false});
  }
};

const post_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;


  try {
    
    const userexist = await User.findOne({ email: email ,isAdmin:false});
    if(!userexist){
      return res.render('user/login',{blocked:'user not exist'})
    }
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
    const product = await Product.find({isDelete:false})
    res.render('user/products',{product})
  }else{
    res.redirect('/user/login')
  }
}

const singleProduct = async(req,res)=>{
  if(req.session.email){
    const proId = req.query.proId
    const varId = req.query.varId
    
    const product = await Product.findOne({_id:proId}).populate('category_id')
    
    // Find the specific variant from the product using varId
    const variant = product.variants.find(variant => variant._id.toString() === varId);
    
    const category = product.category_id;
    const relatableProduct = await Product.find({category_id:category})
    res.render('user/single-product',{product,relatableProduct,variant})
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

const checkuser = async (req,res,next)=>{
  if(req.session.email){
    const email = req.session.email
    const userExist = await User.findOne({email:email})
    if(userExist.isBlock){
      req.session.destroy((err)=>{
        if(err){
          console.log(err)
        }
        res.redirect('/user/login')
      })
    }else{
      next();
    }
  }else{
    next();
  }
}



const userProfile =async (req,res)=>{
  if(req.session.email){
    const email = req.session.email
    const user = await User.findOne({email:email})
    res.render('user/userProfile',{user})
  }else{
    res.redirect('/user/login')
  }
}

const editProfile=async (req,res)=>{
  if(req.session.email){
    try{
      const {userName,userId,email,phone }=req.body
        const userExist = await User.findOne({email:email})
        console.log(userExist)
        if( userExist && userExist.email != email){
          return res.status(400).json({ error: "email already exists" });
        }
      await User.findByIdAndUpdate(userId,{name:userName,email:email,phone:phone})
      res.redirect('/user/profile')

    }catch(error){
      res.status(500).json({ err: "something went wrong while updating the user" });
    }
  }else{
    res.redirect('/user/login')
  }
}

const address= async (req,res)=>{
  if(req.session.email){
   
    const user = await User.findOne({email:req.session.email})
    const address = await Address.find({userId:user._id})
    res.render('user/address',{address})
  }else{
    res.redirect('/user/login')
  }
}

const add_address = async (req,res)=>{
  if(req.session.email){
    try{

      const user = await User.findOne({email:req.session.email})
      const {fullName,address,zipCode,phone,city,state,country}=req.body
      const userId = user._id
  
      const newAddress = new Address({
        fullName:fullName,
        streetAddress:address,
        zipCode:zipCode,
        phone:phone,
        city:city,
        state:state,
        country:country,
        userId:userId
      })
      await newAddress.save();
      res.status(200).json({ message: "new address added successfully" });
    }catch(error){
      res
        .status(500)
        .json({ err: "something went wrong while adding new address" });
    }
  }else{
    res.redirect('/user/login')
  }
}


const edit_address= async (req,res)=>{
    if(req.session.email){
      try{
        const {userId,fullName,address,zipCode,phone,city,state,country} =req.body
        
        await Address.findByIdAndUpdate(userId,{fullName:fullName,streetAddress:address,zipCode:zipCode,phone:phone,city:city,state:state,country:country})
        res.status(200).json({message:"edit address successfully"})
      }catch(error){
        res.status(500).json({message:'something went wrong while editing the address'})
      }
    }else{
      res.redirect('/user/login')
    }
}

const delete_address = async (req,res)=>{
    const {addressId} = req.body
    console.log(req.body)
    console.log(addressId);
    
    try{  
       await Address.findByIdAndDelete(addressId)

      res.status(200).json({message:'delete address successfully'})
    }catch(error){
      res.status(500).json({message:'something went wrong while deleting the address'})
    }
}


const password = async (req,res)=>{
  if(req.session.email){
    res.render('user/changePassword',{success:false})
  }else{
    res.redirect('/user/login')
  }
}

const changePassword = async (req,res)=>{
  if(req.session.email){
    try{
      const {oldPassword,newPassword }= req.body
      
      
      
      const user = await User.findOne({email:req.session.email})
     
      
      const passwordMatch = await bcrypt.compare(oldPassword,user.password)
      
  
      if(!passwordMatch){
        return res.render('user/changePassword',{ noPass:'incorrect password',success:false })
      }
      
      
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      
      
      const a = await User.updateOne({email:req.session.email},{$set:{password:newHashedPassword}})
        console.log('password changed')
       res.render('user/changePassword',{ success:true })
    }catch(error){
      res.status(500).json({message:'error in updating password',error})
    }
    
  }else{
    res.redirect('/user/login')
  }
}


const forgetPassword= (req,res)=>{
  res.render('user/forgetPassword')
}

const postForgetPassword = async(req,res)=>{
  const email = req.body.email
  if( typeof req.session.email != 'undefined' && email != req.session.email){
    return res.render('user/forgerPassword',{emailExist:'email is not matching'})
  }
  const emailExist = await User.findOne({email:email})
  if(!emailExist){
    return res.render('user/forgetPassword',{emailExist:'Email is not exist '})
  }
  req.session.tempemail = email
  const otp = genarateOTP()
  const otpmodel = new OTP({
    email:email,
    otp:otp,
  })
  await sendOtp(email,otp)
  await otpmodel.save();
  res.redirect('/user/forgetOtp')

  
}

const getForgetOtp = (req,res)=>{
  if(req.session.tempemail){
    res.render('user/forgetOtp')
  }else{
    res.redirect('/user/forgetPassword')
  }
}

const postForgetOtp = async (req,res)=>{
  if(req.session.tempemail){

    const { otp1, otp2, otp3, otp4 } = req.body;
    const otp = otp1 + otp2 + otp3 + otp4;

    const email = req.session.tempemail;
    const otpuse = await OTP.findOne({ email: email });
    if(!otpuse){
      res.render("user/forgetOtp", { err: "otp is expired" });
    }
    if(otpuse.otp ===otp){
      await OTP.deleteOne({ email: email });
      res.render('user/changeForgetPassword')
    }else{
      res.render("user/forgetOtp", { err: "incorrect otp" });
    }
  
  
  }else{
    res.redirect('/user/forgetPassword')
  }
}

const forgetChangePassword = async (req,res)=>{

  const {password,confromPassword}= req.body
  const email = req.session.tempemail
  if(password != confromPassword){
    return res.render('user/changeForgetPassword',{noMatch:'password not match'})
  }
  const newHashedPassword = await bcrypt.hash(confromPassword, 10);
  await  User.updateOne({email:email},{$set:{password:newHashedPassword}})
  console.log('password changed successfulyy')
  if(req.session.email){
    return res.redirect('/user/password?success=true')
  }else{
    return res.redirect("/user/login?success=true");
  }
}

const forgetResendOtp = async (req,res)=>{
  const email = req.session.tempemail;
  console.log(req.session.tempemail+"this is from resend otp")
  console.log("Starting OTP resend process for:", email);

  try {
      // Corrected to find the user by email
      const user = await OTP.findOne({ email });

      if (!user) {
          
          return res.render("user/forgetOtp", { err: "user not found " });
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

      res.redirect('/user/forgetOtp'); // Redirect to the OTP page
  } catch (error) {
      console.error('Error resending OTP:', error);
      res.status(500).send('Server error. Please try again later.'); // Respond with an error status
  }
}


const search=async(req,res)=>{
  if(req.session.email){
    
    const searchQuery  = req.query.query.trim()
    try{

      const product = await Product.find({
        product_name: { $regex: searchQuery, $options: 'i' }, // Correct usage of regex for search
        isDelete: false // Assuming you want to exclude deleted products
    });
    res.render('user/products', { product });
    
    }catch(error){
      console.log('Error occurred while searching:', error);
      res.status(500).json({ success: false, message: 'An error occurred' });
    }
  }else{
    res.redirect('/user/login')
  }
}



const sort = async (req,res)=>{
  if(req.session.email){
    try{

      const sort = req.query.sort || ''
  
      let sortCriteria = {}
  
      switch(sort){
  
        case 'popularity':
                  sortCriteria = { popularity: -1 }; // Example: sort by popularity descending
                  break;
              case 'price_asc':
                  sortCriteria = { 'variants.price': 1 }; // Price ascending
                  break;
              case 'price_desc':
                  sortCriteria = { 'variants.price': -1 }; // Price descending
                  break;
              case 'ratings':
                  sortCriteria = { ratings: -1 }; // Example: sort by ratings descending
                  break;
              case 'featured':
                  sortCriteria = { featured: -1 }; // Example: sort by featured descending
                  break;
              case 'new_arrivals':
                  sortCriteria = { createdAt: -1 }; // Example: sort by new arrivals (latest first)
                  break;
              case 'a_to_z':
                  sortCriteria = { product_name: 1 }; // A to Z
                  break;
              case 'z_to_a':
                  sortCriteria = { product_name: -1 }; // Z to A
                  break;
              default:
                  sortCriteria = {}; // Default sorting (no sorting)
                  break;
          }
          const product = await Product.find({isDelete:false}).sort(sortCriteria)
          res.render('user/products', { product });
    }catch(error){
      console.log('Error occurred while sorting:', error);
      res.status(500).json({ success: false, message: 'An error occurred' });
    }


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
  checkuser,
  userProfile,
  editProfile,
  address,
  add_address,
  edit_address,
  delete_address,
  password,
  changePassword,
  forgetPassword,
  postForgetPassword,
  getForgetOtp,
  postForgetOtp,
  forgetChangePassword,
  forgetResendOtp,
  search,
  sort,
}
