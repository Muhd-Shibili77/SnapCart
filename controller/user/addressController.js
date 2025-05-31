const User = require("../../model/userdb");
const Address = require("../../model/AddressDB");
const Cart = require('../../model/cartDb')

const address = async (req, res) => {
  const user = await User.findOne({ email: req.session.email });
  const cart = await Cart.findOne({ user: user._id }).populate("items.product");
  let cartCount = 0;
  if (cart) {
    cartCount = cart.items.length;
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

  res.render("user/address", {
    address,
    totalPage,
    currentPage: page,
    cartCount,
  });
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
    const { userId, fullName, address, pincode, phone, city, state, country } =
      req.body;

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

module.exports ={
    address,
    add_address,
    edit_address,
    delete_address,
}