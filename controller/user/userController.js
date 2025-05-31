const bcrypt = require("bcrypt");
const mongoose = require("mongoose"); 
const User = require("../../model/userdb");
const OTP = require("../../model/otpdb");
const Product = require("../../model/productDB");
const Category = require("../../model/categoryDB");
const Brand = require("../../model/brandDB");
const Wishlist = require("../../model/wishlistDB");
const Cart = require('../../model/cartDb')

const userProfile = async (req, res) => {
  const email = req.session.email;
  const user = await User.findOne({ email: email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }
  res.render("user/userProfile", { user, cartCount });
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

const password = async (req, res) => {
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");

  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }

  res.render("user/changePassword", { success: false, cartCount });
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

    const otpuse = await OTP.findOne({ email: email });
    if (!otpuse) {
      return res.status(400).json({ error: "OTP is expired" });
    }

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
const contact = async (req, res) => {
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }
  res.render("user/contact", { cartCount });
};
const about = async (req, res) => {
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }
  res.render("user/about", { cartCount });
};

const category = async (req, res) => {
  try {
    const id = req.query.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send("Invalid category ID");
    }
    const user = await User.findOne({ email: req.session.email });
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    let cartCount = 0;
    if (cart) {
      cartCount = cart.items.length;
    }
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const totalProducts = await Product.find({
      category_id: id,
    }).countDocuments();

    const totalPage = Math.ceil(totalProducts / limit);
    const category = await Product.find({ category_id: id, isDelete: false })
      .populate("category_id")
      .populate({
        path: "variants.offer",
        modal: "Offer",
      })
      .skip(skip)
      .limit(limit);
    res.render("user/category", {
      category,
      totalPage,
      currentPage: page,
      cartCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};
const singleProduct = async (req, res) => {
  const proId = req.query.proId;
  const varId = req.query.varId;
  const user = await User.findOne({ email: req.session.email });

  const cart = await Cart.findOne({ user: user._id }).populate("items.product");

  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
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

  const product = await Product.findOne({ _id: proId, isDelete: false })
    .populate("category_id")
    .populate("variants.offer");

  if (!product) {
    return res.redirect("/user/products");
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

const get_home = async (req, res) => {
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }
  const mensProduct = await Product.find({
    category_id: "66e01b1fb148f23cc19fa331",
    isDelete: false,
  })
    .populate("category_id")
    .populate({
      path: "variants.offer",
      model: "Offer",
    });

  const womensProduct = await Product.find({
    category_id: "66e18d806bf28e92c6d2e0ea",
    isDelete: false,
  })
    .populate("category_id")
    .populate({
      path: "variants.offer",
      model: "Offer",
    });
  const kidsProduct = await Product.find({
    category_id: "66e18d856bf28e92c6d2e0f2",
    isDelete: false,
  })
    .populate("category_id")
    .populate({
      path: "variants.offer",
      model: "Offer",
    });
  const accessoris = await Product.find({
    category_id: "66e2970551da17d55eb8ba49",
    isDelete: false,
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
  const { search, brand, category, priceRange, sort } = req.query;
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");

  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
  }

  let query = {
    isDelete: false,
  };
  // Search filter
  if (search) {
    query.product_name = { $regex: new RegExp(search, "i") };
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
  const pipeline = [{ $match: query }, { $unwind: "$variants" }];
  // Price filter
  if (priceRange) {
    let priceMatch = {};
    if (priceRange.includes("+")) {
      const minPrice = priceRange.replace("+", "");
      priceMatch.$gte = Number(minPrice);
    } else {
      const priceBounds = priceRange.split("-");

      if (priceBounds[0]) {
        priceMatch.$gte = Number(priceBounds[0]);
      }

      if (priceBounds[1]) {
        priceMatch.$lte = Number(priceBounds[1]);
      }
    }

    pipeline.push({
      $match: {
        "variants.price": priceMatch,
      },
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
  pipeline.push({ $skip: skip }, { $limit: Number(limit) });
  pipeline.push({
    $lookup: {
      from: "offers",
      localField: "variants.offer",
      foreignField: "_id",
      as: "variants.offer",
    },
  });

  pipeline.push({
    $unwind: {
      path: "$variants.offer",
      preserveNullAndEmptyArrays: true,
    },
  });

  const product = await Product.aggregate(pipeline);
  const categoryes = await Category.find({ isDeleted: false });
  const brands = await Brand.find({ isDeleted: false });

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
    selectedCategory: category,
    selectedBrand: brand,
    selectedPrice: priceRange,
  });
};
module.exports = {
  userProfile,
  editProfile,
  password,
  changePassword,
  forgetPassword,
  postForgetPassword,
  getForgetOtp,
  postForgetOtp,
  get_forgetChangePassword,
  post_forgetChangePassword,
  forgetResendOtp,
  contact,
  about,
  category,
  get_home,
  allProducts,
  singleProduct,
};
