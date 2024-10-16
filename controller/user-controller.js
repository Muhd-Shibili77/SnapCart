const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const validator = require("validator");
const nodemailer = require("nodemailer");
const OTP = require("../model/otpdb");
const Product = require("../model/productDB");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Address = require("../model/AddressDB");
const Wishlist = require("../model/wishlistDB");
const axios = require("axios");
const Wallet = require("../model/walletDB");
const Cart = require('../model/cartDb')

const get_login = (req, res) => {
  if (req.session.email) {
    res.redirect("/user/home");
  } else {
    res.render("user/login", { success: false });
  }
};

const post_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const userexist = await User.findOne({ email: email, isAdmin: false });
    if (!userexist) {
      return res.json({ success: false, error: "User does not exist" });
    }
    if (userexist.isBlock) {
      return res.json({ success: false, error: "You are blocked" });
    }

    const passwordmatch = await bcrypt.compare(password, userexist.password);
    if (passwordmatch) {
      req.session.email = userexist.email;
      return res
        .status(200)
        .json({ success: true, message: "Successfully logged in" });
    } else {
      return res.json({ success: false, error: "Incorrect password" });
    }
  } catch (err) {
    console.log("Error in login: ", err);
    return res.json({
      success: false,
      error: "Server error. Please try again later.",
    });
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

function generateReferralCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  let letterPart = "";
  for (let i = 0; i < 3; i++) {
    letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  let numberPart = "";
  for (let i = 0; i < 4; i++) {
    numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return letterPart + numberPart;
}

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
    return res.json({ success: false, message: "Already logged in." });
  }
  const referalCode = req.body.referalCode;

  const user = await User.findOne({ referalCode: referalCode });
  
  if (!user) {
    return res.json({ success: false, message: "Invalid user name" });
  }
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    wallet = new Wallet({
      user: user._id,
      balance: 0,
      wallet_history: [],
    });
    await wallet.save();
  }

  req.session.referalCode = referalCode;

  const data = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    referalCode: generateReferralCode(),
  };

  const otp = genarateOTP();

  try {
    // Checking if phone or email already exists
    const existPhone = await User.findOne({ phone: data.phone });
    const existEmail = await User.findOne({ email: data.email });

    // Trim and validate fields
    const trimmedName = validator.trim(data.name);
    const trimmedPhone = validator.trim(data.phone);

    if (validator.isEmpty(trimmedName)) {
      return res.json({ success: false, message: "Name cannot be empty." });
    }

    if (validator.isEmpty(trimmedPhone)) {
      return res.json({
        success: false,
        message: "Phone number cannot be empty.",
      });
    }

    if (existEmail) {
      return res.json({
        success: false,
        message: "This email already exists.",
      });
    }

    if (existPhone) {
      return res.json({
        success: false,
        message: "This phone number already exists.",
      });
    }

    // Hashing password
    const salt = 10;
    const hashedPassword = await bcrypt.hash(data.password, salt);
    data.password = hashedPassword;

    req.session.data = data;

    // Creating OTP model
    const otpModel = new OTP({
      email: data.email,
      otp: otp,
    });
    req.session.tempEmail = data.email;

    await sendOtp(data.email, otp);
    await otpModel.save();

    return res.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("Error during signup:", err);
    return res.json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

const get_otp_verification = async (req, res) => {
  if (!req.session.email) {
    res.render("user/otp");
  } else {
    res.redirect("/user/signup");
  }
};

const post_otp_verification = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.tempEmail;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "OTP expired. Please try again." });
    }

    // Find the OTP in the database
    const otpDoc = await OTP.findOne({ email });

    if (otpDoc) {
      // Check if OTP is correct
      if (otpDoc.otp === otp) {
        // Check if the user already exists
        const userExists = await User.findOne({ email });

        if (userExists) {
          return res
            .status(400)
            .json({
              success: false,
              error: "Email already verified. Please signup again.",
            });
        }

        const referalCode = req.session.referalCode;
        const user = await User.findOne({ referalCode: referalCode });
        if (!user) {
          return res.json({ success: false, message: "Invalid referal code" });
        }
        let wallet = await Wallet.findOne({ user: user._id });
        if (wallet) {
          wallet.balanceAmount += 200;
          wallet.wallet_history.push({
            amount: 200,
            description: "Referral Reward",
            transactionType: "credited",
          });
          await wallet.save();
        }

        const data = req.session.data;
        await User.insertMany([data]);
        await OTP.deleteOne({ email });

        // Clear session data
        delete req.session.data;
        delete req.session.tempEmail;

        return res
          .status(200)
          .json({
            success: true,
            message: "OTP verified successfully. Signup completed!",
          });
      } else {
        return res
          .status(400)
          .json({ success: false, error: "OTP is not correct" });
      }
    } else {
      return res
        .status(400)
        .json({
          success: false,
          error: "OTP not found or expired. Please resend OTP.",
        });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

const resend_otp = async (req, res) => {
  if (!req.session.tempEmail) {
    return res.redirect("/user/signup");
  }

  const email = req.session.tempEmail;
  console.log(req.session.tempEmail + " this is from resend OTP");
  console.log("Starting OTP resend process for:", email);

  try {
    const userOtpRecord = await OTP.findOne({ email });

    if (!userOtpRecord) {
      return res.render("user/forgetOtp", {
        success: false,
        err: "email not found",
      });
    }

    const otp = genarateOTP();

    await OTP.findOneAndDelete({ email });

    const newOtpRecord = new OTP({
      email: email,
      otp: otp,
    });

    await newOtpRecord.save();

    await sendOtp(email, otp);

    res.status(200).json({ success: true, message: "otp sented successfuly" });
  } catch (error) {
    console.error("Error resending OTP:", error);

    res.status(500).send("Server error. Please try again later.");
  }
};

const get_home = async (req, res) => {
 
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    const mensProduct = await Product.find({
      category_id: "66e01b1fb148f23cc19fa331",isDelete:false
    })
      .populate("category_id")
      .populate({
        path: "variants.offer",
        model: "Offer",
      });

    const womensProduct = await Product.find({
      category_id: "66e18d806bf28e92c6d2e0ea",isDelete:false
    })
      .populate("category_id")
      .populate({
        path: "variants.offer",
        model: "Offer",
      });
    const kidsProduct = await Product.find({
      category_id: "66e18d856bf28e92c6d2e0f2",isDelete:false
    })
      .populate("category_id")
      .populate({
        path: "variants.offer",
        model: "Offer",
      });
    const accessoris = await Product.find({
      category_id: "66e2970551da17d55eb8ba49",isDelete:false
    })
      .populate("category_id")
      .populate({
        path: "variants.offer",
        model: "Offer",
      });
    res.render("user/home", {
      mensProduct,
      womensProduct,
      kidsProduct,
      accessoris,
      cartCount,
    });
  
};

const allProducts = async (req, res) => {
  
    
    const { search, brand, category,priceRange, sort } = req.query;
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    let query = {
      isDelete: false,
  };

   // Search filter
   if (search) {
    query.product_name = { $regex: new RegExp(search, 'i') };
}

 // Brand filter
 if (brand) {
  const brandDoc = await Brand.findOne({ brand_name: brand });
  if (brandDoc) {
      query.brand_id = brandDoc._id;
  }
}

// Category filter
if (category) {
  const categoryDoc = await Category.findOne({ category_name: category });
  if (categoryDoc) {
      query.category_id = categoryDoc._id;
  }
  
}



// Create pipeline
const pipeline = [
  { $match: query },
  { $unwind: "$variants" },
];

// Price filter
if (priceRange) {
  let priceMatch = {};

  
  if (priceRange.includes('+')) {
    
    const minPrice = priceRange.replace('+', '');
    priceMatch.$gte = Number(minPrice);
  } else {
    
    const priceBounds = priceRange.split('-');

 
    if (priceBounds[0]) {
      priceMatch.$gte = Number(priceBounds[0]);
    }

    if (priceBounds[1]) {
      priceMatch.$lte = Number(priceBounds[1]);
    }
  }

  pipeline.push({
    $match: {
      "variants.price": priceMatch
    }
  });
}




let sortCriteria = {};

    switch (sort) {
      case "price_asc":
        sortCriteria = { "variants.price": 1 };
        break;
      case "price_desc":
        sortCriteria = { "variants.price": -1 };
        break;
      case "new_arrivals":
        sortCriteria = { createdAt: -1 };
        break;
      case "a_to_z":
        sortCriteria = { product_name: 1 };
        break;
      case "z_to_a":
        sortCriteria = { product_name: -1 };
        break;
      default:
        sortCriteria = {};
        break;
    }
    if (Object.keys(sortCriteria).length > 0) {
      pipeline.push({ $sort: sortCriteria });
    }



    const page = parseInt(req.query.page) || 1;
    const limit = 8;
  const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments(query);
    const totalPage = Math.ceil(totalProducts / limit);
   
    // Add pagination to pipeline
    pipeline.push(
      { $skip: skip },
      { $limit: Number(limit) }
  );

  pipeline.push({
    $lookup: {
        from: "offers",
        localField: "variants.offer",
        foreignField: "_id",
        as: "variants.offer"
    }
});

pipeline.push({
    $unwind: {
        path: "$variants.offer",
        preserveNullAndEmptyArrays: true
    }
});



const product = await Product.aggregate(pipeline);
const categoryes = await Category.find({isDeleted:false})
const brands = await Brand.find({isDeleted:false})


    res.render("user/products", {
      product,
      totalPage,
      currentPage: page,
      categoryes,
      brands,
      sort,
      brand,
      category,
      priceRange,
      search,
      cartCount,
      selectedCategory:category,
      selectedBrand:brand,
      selectedPrice:priceRange,
    });
  
};

const singleProduct = async (req, res) => {
  
    const proId = req.query.proId;
    const varId = req.query.varId;
    const user = await User.findOne({ email: req.session.email });
    
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    const wishlist = await Wishlist.findOne({ user_id: user._id });

    let wishlistHeart = null;
    let ProductInWishlist = false;

    if (wishlist && wishlist.items.length > 0) {
      wishlistHeart = wishlist.items.find(
        (x) => x.variantId.toString() === varId
      );
      ProductInWishlist = wishlistHeart ? true : false;
    }

    const product = await Product.findOne({ _id: proId,isDelete:false })
      .populate("category_id")
      .populate("variants.offer");
    
      if(!product){
        return res.redirect('/user/products')
      }
    // Find the specific variant from the product using varId

    const variant = product.variants.find(
      (variant) => variant._id.toString() === varId
    );

    const category = product.category_id;
    const relatableProduct = await Product.find({ category_id: category });
    res.render("user/single-product", {
      product,
      relatableProduct,
      variant,
      ProductInWishlist,
      cartCount,
    });
  
};

const category = async (req, res) => {
 
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );

     let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    const id = req.query.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const totalProducts = await Product.find({
      category_id: id,
    }).countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const category = await Product.find({ category_id: id ,isDelete:false})
      .populate("category_id")
      .populate({
        path: "variants.offer",
        modal: "Offer",
      })
      .skip(skip)
      .limit(limit);

    res.render("user/category", { category, totalPage, currentPage: page ,cartCount});
 
};

const about = async (req, res) => {
  
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    

    res.render("user/about",{cartCount});
 
};
const contact = async (req, res) => {
  
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );


    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }


    res.render("user/contact",{cartCount});
 
};



const userProfile = async (req, res) => {
  
    const email = req.session.email;
    const user = await User.findOne({ email: email });
    
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    
    res.render("user/userProfile", { user,cartCount });
  
};

const editProfile = async (req, res) => {
  
    try {
      const { userName, userId, phone } = req.body;
      
      const PhoneExist = await User.findOne({ phone: phone });

      if (PhoneExist && PhoneExist._id.toString() !== userId) {
        return res.status(400).json({ error: "Phone number already exists." });
      }

      await User.findByIdAndUpdate(userId, { name: userName, phone: phone });
      res.redirect("/user/profile");
    } catch (error) {
      res
        .status(500)
        .json({ err: "something went wrong while updating the user" });
    }
 
};

const address = async (req, res) => {
  
    const user = await User.findOne({ email: req.session.email });
    
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
   

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = (page - 1) * limit;
    const totalProducts = await Address.find({
      userId: user._id,
    }).countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const address = await Address.find({ userId: user._id })
      .skip(skip)
      .limit(limit);

    res.render("user/address", { address, totalPage, currentPage: page,cartCount });
  
};

const add_address = async (req, res) => {
 
    try {
      const user = await User.findOne({ email: req.session.email });
      const { fullName, address, pincode, phone, city, state, country } =
        req.body;
      const userId = user._id;

      const newAddress = new Address({
        fullName: fullName,
        streetAddress: address,
        pincode: pincode,
        phone: phone,
        city: city,
        state: state,
        country: country,
        userId: userId,
      });
      await newAddress.save();
      res.status(200).json({ message: "new address added successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ err: "something went wrong while adding new address" });
    }
  
};

const edit_address = async (req, res) => {
  
    try {
      const {
        userId,
        fullName,
        address,
        pincode,
        phone,
        city,
        state,
        country,
      } = req.body;

      await Address.findByIdAndUpdate(userId, {
        fullName: fullName,
        streetAddress: address,
        pincode: pincode,
        phone: phone,
        city: city,
        state: state,
        country: country,
      });
      res.status(200).json({ message: "edit address successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "something went wrong while editing the address" });
    }
  
};

const delete_address = async (req, res) => {
  const { addressId } = req.body;

  try {
    await Address.findByIdAndDelete(addressId);

    res.status(200).json({ message: "delete address successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "something went wrong while deleting the address" });
  }
};

const password = async (req, res) => {
  
    const user = await User.findOne({email:req.session.email})
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }

    

    res.render("user/changePassword", { success: false ,cartCount});
  
};

const changePassword = async (req, res) => {
 
    try {
      const { oldPass, newPass } = req.body;

      const user = await User.findOne({ email: req.session.email });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(oldPass, user.password);

      if (!passwordMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Incorrect current password" });
      }

      const newHashedPassword = await bcrypt.hash(newPass, 10);

      await User.updateOne(
        { email: req.session.email },
        { $set: { password: newHashedPassword } }
      );

      res
        .status(200)
        .json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error in updating password", error);
      res
        .status(500)
        .json({ success: false, message: "Error in updating password", error });
    }
 
};

const forgetPassword = (req, res) => {
  res.render("user/forgetPassword");
};

const postForgetPassword = async (req, res) => {
  const email = req.body.email;

  if (typeof req.session.email != "undefined" && email != req.session.email) {
    return res.status(400).json({ error: "Email does not match" });
  }

  const emailExist = await User.findOne({ email: email });
  if (!emailExist) {
    return res.status(400).json({ error: "Email does not exist" });
  }

  req.session.tempemail = email;
  const otp = genarateOTP();
  const otpmodel = new OTP({
    email: email,
    otp: otp,
  });
  await sendOtp(email, otp);
  await otpmodel.save();
  res.status(200).json({ message: "OTP sent successfully" });
};

const getForgetOtp = (req, res) => {
  if (req.session.tempemail) {
    res.render("user/forgetOtp");
  } else {
    res.redirect("/user/forgetPassword");
  }
};

const postForgetOtp = async (req, res) => {
  if (req.session.tempemail) {
    const { otp } = req.body;
    const email = req.session.tempemail;
    console.log('hei')
    const otpuse = await OTP.findOne({ email: email });
    if (!otpuse) {
      return res.status(400).json({ error: "OTP is expired" });
    }
    console.log('httt');
   
    

    if (otpuse.otp === otp) {
      await OTP.deleteOne({ email: email });
      return res.status(200).json({ message: "OTP verified successfully" });
    } else {
      return res.status(400).json({ error: "Incorrect OTP" });
   
    }
  } else {
    res.redirect("/user/forgetPassword");
  }
};

const get_forgetChangePassword = async (req, res) => {
  if (req.session.tempemail) {
    res.render("user/changeForgetPassword");
  } else {
    res.redirect("/user/forgetPassword");
  }
};

const post_forgetChangePassword = async (req, res) => {
  const { password, confirmPassword } = req.body;
  const email = req.session.tempemail;

  if (password !== confirmPassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }

  const newHashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne(
    { email: email },
    { $set: { password: newHashedPassword } }
  );

  console.log("Password changed successfully");

  const redirectUrl = req.session.email ? "/user/password" : "/user/login";

  return res.status(200).json({ success: true, redirectUrl });
};

const forgetResendOtp = async (req, res) => {
  if (!req.session.tempemail) {
    return res.redirect("/user/forgetPassword");
  }

  const email = req.session.tempemail;
  console.log(req.session.tempemail + " this is from resend OTP");
  console.log("Starting OTP resend process for:", email);

  try {
    const userOtpRecord = await OTP.findOne({ email });

    if (!userOtpRecord) {
      return res.render("user/forgetOtp", { err: "User not found" });
    }

    const otp = genarateOTP();

    await OTP.findOneAndDelete({ email });

    const newOtpRecord = new OTP({
      email: email,
      otp: otp,
    });
    await newOtpRecord.save();

    await sendOtp(email, otp);

    res.status(200).json({ message: "otp sented successfuly" });
  } catch (error) {
    console.error("Error resending OTP:", error);

    res.status(500).send("Server error. Please try again later.");
  }
};




const user_logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
};

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
  get_forgetChangePassword,
  post_forgetChangePassword,
  forgetResendOtp,
  
  
};
