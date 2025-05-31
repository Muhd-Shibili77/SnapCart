const User = require("../model/userdb");
const Address = require("../model/AddressDB");
const Order = require("../model/orderDB");
const Product = require("../model/productDB");
const Cart = require("../model/cartDb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Coupon = require("../model/couponDB");
const Wallet = require("../model/walletDB");
const razorpay = require("../config/razorPay");
const crypto = require("crypto");



const confrom_order_razorPay = async (req, res) => {
  try{
  const user = await User.findOne({ email: req.session.email });
  const { addressId, cartId } = req.body;
  const address = await Address.findById(addressId);

  if (!address) {
    return res
      .status(400)
      .json({ success: false, message: "invalid address Id" });
  }

  const cart = await Cart.findById(cartId).populate("items.product");
  if (!cart) {
    return res.status(400).json({ success: false, message: "invalid cart Id" });
  }

  let totalAmount = 0;

  for (let item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (!product) {
      return res
        .status(400)
        .json({ success: false, message: "Product not found" });
    }

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
    } else {
      return res
        .status(400)
        .json({ success: false, message: "variant not found" });
    }
  }
  let discountOnOrder = 0;
  const coupon = await Coupon.findOne({
    "users.userId": user._id,
    "users.isBought": false,
  });

  if (coupon) {
    const discountPercentage = coupon.discount;
    const discountAmount = parseInt((totalAmount * discountPercentage) / 100);
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
  
  const option = {
    amount: Math.round(payableAmount * 100),
    currency: "INR",
    receipt: `receipt#${cartId}`,
    payment_capture: 1,
  };

  try {
    const razorpayId = await razorpay.orders.create(option);
    return res.json({
      success: true,
      razorpayId,
      totalAmount,
      discountOnOrder,
      payableAmount,
    });

  } catch (error) {
    console.log(error, "Error creating Razorpay order");
    return res.status(500).json({ success: false, error: "Razorpay order creation failed" });
  }
}catch(error){
  console.error('Error:', error);
  return res.status(500).json({ error: 'Internal Server Error' });
}
};

const razorPay_verify_payment = async(req,res)=>{
try{
  const { addressId, cartId,payment_id,order_id,signature }=req.body
 let paymentMethod = req.body.paymentMethod;
 const user = await User.findOne({ email: req.session.email });
  const body = `${order_id}|${payment_id}`;
  
  const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
      .update(body)
      .digest('hex');

  const cart = await Cart.findById(cartId).populate("items.product");
  const address = await Address.findById(addressId);

       if (!cart) {
         return res.status(400).json({ success: false, message: "invalid cart Id" });
       }
       
       if (!address) {
         return res
           .status(400)
           .json({ success: false, message: "invalid address Id" });
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
         await brand.save();
         await category.save();

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
           product.saleCount += item.quantity;
           await product.save();
         } else {
           return res
             .status(400)
             .json({ success: false, message: "variant not found" });
         }
       }

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

      if(paymentMethod==='bank'){
        paymentMethod='Bank Transfer';
      }

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
      await order.save()

      if (expectedSignature === signature) {
       
        order.paymentStatus = 'Paid';
        
        await order.save();

        await Cart.findByIdAndDelete(cart._id);

        return res.json({success: true,message: "Payment verified, order created",order});
    } else {
        order.paymentStatus = 'Failed';
        const orderId = order._id;      
        await order.save();
        await Cart.findByIdAndDelete(cart._id);

        return res.json({success: false,message: "Payment verification failed, order created but payment incomplete",orderId:orderId});
    }
  } catch (error) {
    console.error('Error in razorpay payment:', error);
    res.status(500).json({ success:false,error: 'Internal Server Error' });
}


}

const confrom_order_wallet = async (req,res)=>{
  try {
  
      const user = await User.findOne({ email: req.session.email });
      const { addressId, cartId ,paymentMethod } = req.body;
      const wallet = await Wallet.findOne({ user: user._id });
      const address = await Address.findById(addressId);

      if (!address) {
        return res
          .status(400)
          .json({ success: false, message: "invalid address Id" });
      }
      if (!wallet) {
        return res
          .status(400)
          .json({ success: false, message: "no wallet for this user" });
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

      const walletBalance = wallet.balanceAmount;
      if(walletBalance < payableAmount){
        
        return res.json({ success: false, message: "not enough money in your wallet" });
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
        paymentStatus:'Paid',
        totalAmount,
        discountAmount: discountOnOrder,
        deliveryCharge,
        payableAmount,
        couponApplied: coupon ? coupon._id : null,
        orderStatus: "Pending",
      });
      await order.save();
      await Cart.findByIdAndDelete(cartId);
      wallet.balanceAmount -= payableAmount;
      wallet.wallet_history.push({
        data:new Date(),
        amount:payableAmount,
        description:"Order payment from wallet",
        transactionType:'debited'
      });
      await wallet.save();
      res.status(200).json({ success: true, message: "order is placed successfully " });
    
  } catch (error) {
    console.error("error in ordering item", error);
    res
      .status(500)
      .json({ success: false, message: "an error occured,try again........" });
  }
}

const repaymentRazorpay = async (req,res)=>{
    try {
      const { orderId } = req.body;
      const order = await Order.findOne({ _id: orderId });

      if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const payment_capture = 1; 
      const amount = order.payableAmount * 100; 
      const currency = 'INR';

      const options = {
          amount,
          currency,
          receipt: `receipt_${orderId}`,
          payment_capture
      };

      const response = await razorpay.orders.create(options);
      
      res.status(200).json({
          success: true,
          orderId: response.id,
          amount: response.amount,
          currency: response.currency,
          key: process.env.RAZOR_PAY_KEY_ID,
          name: 'SnapCart', 
          description: 'Repayment for Order',
          orderReceipt: orderId 
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error occurred' });
  }

  }
  const verifyRepayment = async (req,res)=>{
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');
      if (expectedSignature === razorpay_signature) {

          const order = await Order.findById(orderId);
          order.paymentStatus = 'Paid';
          order.paymentMethod = 'Bank Transfer';
          order.razorpayOrderId = razorpay_order_id;
          await order.save();

          res.status(200).json({ success: true, message: 'Payment successful' });
      } else {
          res.status(400).json({ success: false, message: 'Invalid signature' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
  }

  module.exports={
    confrom_order_razorPay,
    razorPay_verify_payment,
    confrom_order_wallet,
    repaymentRazorpay,
    verifyRepayment
  }