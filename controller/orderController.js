const User = require("../model/userdb");
const Address = require("../model/AddressDB");
const Order = require("../model/orderDB");
const Product = require("../model/productDB");
const Cart = require("../model/cartDb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Coupon = require("../model/couponDB");
const Wallet = require("../model/walletDB");
const path = require('path');
const { createInvoicePDF } = require('../utilies/createInvoice')

const generateOrderId = async () => {
  const prefix = "ORD";
  const latestOrder = await Order.findOne()
    .sort({ orderId: -1 })
    .select("orderId");
  const latestId = latestOrder
    ? parseInt(latestOrder.orderId.replace(prefix, ""))
    : 0;
  const newId = latestId + 1;
  return `${prefix}${newId.toString().padStart(5, "0")}`;
};

const orderConfrom = async (req, res) => {
  try {
   
      const user = await User.findOne({ email: req.session.email });
      const { addressId, cartId } = req.body;
      let { paymentMethod } = req.body;
      const address = await Address.findById(addressId);

      if (!address) {
        return res
          .status(400)
          .json({ success: false, message: "invalid address Id" });
      }

      const cart = await Cart.findById(cartId).populate("items.product");
      if (!cart) {
        return res
          .status(400)
          .json({ success: false, message: "invalid cart Id" });
      }

      let totalAmount = 0;
      const orderedItems = [];

      for (let item of cart.items) {
        const product = await Product.findById(item.product._id);
        if (!product) {
          return res
            .status(400)
            .json({ success: false, message: "Product not found" });
        }
       
        const brand = await Brand.findById(product.brand_id)
        const category = await Category.findById(product.category_id)
        brand.saleCount +=item.quantity;
        category.saleCount +=item.quantity;
        await category.save();
        await brand.save();

        const variant = product.variants.find(
          (a) => a._id.toString() === item.variantId
        );

        if (variant) {
          let rate = variant.offer ? variant.discount_price : variant.price;
          let price = rate * item.quantity;
          totalAmount += price;

          if(item.quantity > variant.stock){
            return res
            .status(400)
            .json({ success: false, message: "not enough stock" });
          }
          orderedItems.push({
            product: item.product._id,
            variantId: variant._id,
            quantity: item.quantity,
            price: rate,
          });

          variant.stock -= item.quantity;
          product.saleCount +=item.quantity;
          await product.save();
        } else {
          return res
            .status(400)
            .json({ success: false, message: "variant not found" });
        }
      }

      paymentMethod =
        paymentMethod === "cod" ? "Cash on Delivery" : "Bank Transfer";

      let discountOnOrder = 0;
      const coupon = await Coupon.findOne({
        "users.userId": user._id,
        "users.isBought": false,
      }); 

      if (coupon) {
        
        const discountPercentage = coupon.discount;
       
        const discountAmount = parseInt(
          (totalAmount * discountPercentage) / 100
        );
        discountOnOrder = Math.min(discountAmount, coupon.max_coupon_amount);

        await Coupon.findOneAndUpdate(
          { coupon_code: coupon.coupon_code, "users.userId": user._id },
          {
            $set: { "users.$.isBought": true },
          }
        );
      }
      
      let payableAmount = totalAmount - discountOnOrder;
      let deliveryCharge = 0;

      if(totalAmount < 2000){
        deliveryCharge = 40;
      }
      payableAmount += deliveryCharge
     

      if(payableAmount > 1000){
        return res.json({success:false,message:'above 1000 is not allowed cash of delivery'})
      }
      

      const addressOrder = [
        {
          fullName: address.fullName,
          streetAddress: address.streetAddress,
          pincode: address.pincode,
          phone: address.phone,
          city: address.city,
          state: address.state,
          country: address.country,
        },
      ];

      const orderID = await generateOrderId();
      
      const order = new Order({
        orderId: orderID,
        user: user._id,
        address: addressOrder,
        items: orderedItems,
        paymentMethod,
        totalAmount,
        discountAmount: discountOnOrder,
        deliveryCharge,
        payableAmount,
        couponApplied: coupon ? coupon._id : null,
        orderStatus: "Pending",
      });
      
      await order.save();
      await Cart.findByIdAndDelete(cartId);
      res
        .status(200)
        .json({ success: true, message: "order is placed successfully " });
   
  } catch (error) {
    console.error("error in ordering item", error);
    res
      .status(500)
      .json({ success: false, message: "an error occured,try again........" });
  }
};

const orderHistory = async (req, res) => {
    const user = await User.findOne({ email: req.session.email });
    
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }
    const order = await Order.find({ user: user._id })
      .populate("items.product")
      .sort({ orderId: -1 });

    res.render("user/orderHistory", { order,cartCount });
 
};

const orderCancel = async (req, res) => {
  try {
    
      const user = await User.findOne({ email: req.session.email });
      const { orderId } = req.body;
      const order = await Order.findById(orderId);
      if (!order) {
        return res
          .status(400)
          .json({ success: false, message: "order not found " });
      }

      for (const item of order.items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity, saleCount:-item.quantity } }
        );
        const brand = await Brand.findById(product.brand_id)
        const category = await Category.findById(product.category_id)
        brand.saleCount -=item.quantity;
        category.saleCount -=item.quantity;
        await brand.save();
        await category.save();

      }

      await Order.findByIdAndUpdate(orderId, { orderStatus: "Cancelled" });

      if (order.paymentStatus === "Paid") {
        const refund = order.payableAmount;
        let wallet = await Wallet.findOne({ user: user._id });
        if (!wallet) {
          wallet = new Wallet({
            user: order.user,
            balanceAmount: 0,
            wallet_history: [],
          });
        }

        wallet.balanceAmount += refund;
        wallet.wallet_history.push({
          date: new Date(),
          amount: refund,
          description: `Refund for cancelled item (Order ID: ${order.orderId})`,
          transactionType: "credited",
        });
        await wallet.save();
      }
      res
        .status(200)
        .json({ success: true, message: "order cancelled succesfully" });
    
  } catch (error) {
    console.log("Error occurred while deleting cart items:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const orderDetails = async (req, res) => {
  
    const orderId = req.query.orderId;
    const user = await User.findOne({ email: req.session.email });
    
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );
    

    let cartCount=0;
    if(cart){
       cartCount  = cart.items.length;
    }
    const UserOR = await Order.findOne({ _id: orderId, user: user._id });

    if (UserOR) {
      const order = await Order.findOne({ _id: orderId }).populate(
        "items.product"
      );

      res.render("user/orderDetails", { order ,cartCount,user});
    } else {
      res.redirect("/user/home");
    }
 
};

const orderReturn = async (req, res) => {
  try {  
      const { orderId, itemId, reason, additionalReason } = req.body;

      if (!orderId) {
        return res.json({ success: false, error: "orderId not found" });
      }
      if (!itemId) {
        return res.json({ success: false, error: "item is empty" });
      }
      if (!reason) {
        return res.json({ success: false, error: "reason not found" });
      }
      const order = await Order.findOne({ orderId });
      const item = order.items.find((item) => item._id.toString() === itemId);
      if (!item) {
        return res
          .status(404)
          .json({ success: false, error: "Item not found in order" });
      }

      if (item.isReturnRequested) {
        return res.status(400).json({
          success: false,
          error: "Return request already submitted for this item",
        });
      }

      item.isReturnRequested = true;
      item.reasonOfReturn = reason;
      item.additionalReason = additionalReason;
      item.isAdminAcceptedReturn ='Pending';
      await order.save();

      res.status(200).json({
        success: true,
        message: "Return request submitted successfully",
        
      });
    
  } catch (error) {
    console.error("Error occurred while processing return product POST", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while submitting your return request",
    });
  }
};
function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${randomNum}`;
}
const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order Id not found' });
    }
    const order = await Order.findOne({ orderId: orderId })
      .populate("user", "name")
      .populate({
        path: "items.product",
        select: "product_name variants",
      });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const invoiceNumber = generateInvoiceNumber(); 
    const invoicePath = path.join(__dirname, `../invoices/invoice_${orderId}.pdf`);
    await createInvoicePDF(order, invoiceNumber, invoicePath, res);

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ success: false, error: "An error occurred while generating the invoice" });
  }
};

module.exports = {
  orderConfrom,
  orderHistory,
  orderCancel,
  orderDetails,
  orderReturn,
  downloadInvoice,
};
