const User = require("../model/userdb");
const Address = require("../model/AddressDB");
const Order = require("../model/orderDB");
const Product = require("../model/productDB");
const Cart = require("../model/cartDb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Coupon = require("../model/couponDB");
const Wallet = require("../model/walletDB");
const RazorPay = require("../config/razorPay");
const razorpay = require("../config/razorPay");
const crypto = require("crypto");
const pdf = require("html-pdf-node");
const fs = require('fs');



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
    if (req.session.email) {
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
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.error("error in ordering item", error);
    res
      .status(500)
      .json({ success: false, message: "an error occured,try again........" });
  }
};

const orderHistory = async (req, res) => {
  if (req.session.email) {
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
  } else {
    res.redirect("/user/login");
  }
};

const orderCancel = async (req, res) => {
  try {
    if (req.session.email) {
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
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.log("Error occurred while deleting cart items:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const orderDetails = async (req, res) => {
  if (req.session.email) {
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
  } else {
    res.redirect("/user/login");
  }
};

const orderReturn = async (req, res) => {
  try {
    if (req.session.email) {
      
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
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.error("Error occurred while processing return product POST", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while submitting your return request",
    });
  }
};


const confrom_order_razorPay = async (req, res) => {
  try{

  
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
    if (req.session.email) {
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
    } else {
      res.redirect("/user/login");
    }
  } catch (error) {
    console.error("error in ordering item", error);
    res
      .status(500)
      .json({ success: false, message: "an error occured,try again........" });
  }



}

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${randomNum}`;
}






  const downloadInvoice = async (req,res)=>{
    try{
      if(req.session.email){
        let orderItems = '';
        const {orderId} = req.body
        if(!orderId){
          return res.json({success:false,error:'order Id not found'})
        }

        const order = await Order.findOne({orderId:orderId})
        .populate("user", "name")
        .populate({
          path: "items.product",
          select: "product_name variants",
        })

        const address = order.address[0];
      
        const invoiceNumber = generateInvoiceNumber();
        

        order.items.forEach(item => {
          const product = item.product;
          const variant = product.variants.find(v => v._id.toString() === item.variantId);
         
       

          
          

          orderItems+= `
          <tr>
              <td>${product.product_name}</td>
              <td>Color: ${variant.color}<br>Storage: ${variant.size}</td>
              <td>${item.quantity}</td>
              <td>${item.price}</td>         
              <td>${item.price.toFixed(2)}</td>         
          </tr>
          `;
      });
        

        const html = `     
 <!DOCTYPE html>
<html>
<head>
  <title>Invoice</title>
  <style>
    /* Reset Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* Body Styles */
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #f0f8ff, #dff0ff);
      color: #333;
      padding: 20px;
    }

    /* Invoice Container */
    .invoice-container {
      max-width: 800px;
      margin: 40px auto;
      background-color: #fff;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      border-top: 8px solid #005b18;
    }

    /* Header Styles */
    .invoice-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .invoice-header img {
      max-width: 150px;
      margin-bottom: 20px;
    }

    .invoice-header h1 {
      font-size: 36px;
      color: #005b18;
      font-family: 'Georgia', serif;
      letter-spacing: 2px;
      text-shadow: 1px 1px 2px #ddd;
    }

    /* Details Section */
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f9f9f9;
    }

    .details-column {
      width: 48%;
    }

    .details-column h2 {
      font-size: 20px;
      color: #005b18;
      margin-bottom: 10px;
      border-bottom: 2px solid #005b18;
      display: inline-block;
    }

    .details-column p {
      margin-bottom: 8px;
      font-size: 14px;
      color: #555;
    }

    /* Table Styles */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .invoice-table th, .invoice-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .invoice-table th {
      background-color: #005b18;
      color: #fff;
      text-transform: uppercase;
      font-size: 14px;
      font-family: 'Lora', serif;
    }

    .invoice-table tr:nth-child(even) {
      background-color: #f4f9fd;
    }

    /* Totals Section */
    .totals {
      width: 100%;
      margin-top: 20px;
    }

    .totals table {
      width: 300px;
      margin-left: auto;
      border-collapse: collapse;
    }

    .totals td {
      padding: 10px;
      font-size: 16px;
    }

    .totals .totals-label {
      text-align: left;
      color: #555;
      font-family: 'Lora', serif;
    }

    .totals .totals-value {
      text-align: right;
      color: #333;
    }

    .totals .grand-total {
      font-weight: bold;
      border-top: 2px solid #005b18;
      font-size: 18px;
      color: #2c3e50;
    }

    /* Footer Styles */
    .invoice-footer {
      text-align: center;
      margin-top: 50px;
      font-size: 12px;
      color: #888;
      font-family: 'Georgia', serif;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Icons */
    .details-column h2::before {
      content: '📋';
      margin-right: 8px;
    }

    /* Responsive Design */
    @media (max-width: 600px) {
      .invoice-details {
        flex-direction: column;
      }
      .details-column {
        width: 100%;
        margin-bottom: 20px;
      }
      .totals table {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      
      <h1>Invoice</h1>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
      <!-- Billing Details -->
      <div class="details-column">
        <h2>Billing To</h2>
        <p><strong>${address.fullName}</strong></p>
        <p>${address.streetAddress}</p>
        <p>${address.city}, ${address.state}, ${address.pincode}</p>
        <p>${address.country}</p>
        <p>Phone: ${address.phone}</p>
      </div>

      <!-- Invoice Info -->
      <div class="details-column">
        <h2>Invoice Info</h2>
        <p>Invoice No: <strong>${invoiceNumber}</strong></p>
        <p>Order ID: ${order.orderId}</p>
        <p>Payment Status: ${order.paymentStatus}</p>
        <p>Payment Method: ${order.paymentMethod}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
      </div>
    </div>

    <!-- Order Details Table -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Variant</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <table>
        <tr>
          <td class="totals-label">Subtotal:</td>
          <td class="totals-value">${order.totalAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td class="totals-label">Discount:</td>
          <td class="totals-value">- ${order.discountAmount.toFixed(2)}</td>
        </tr>
        <tr class="grand-total">
          <td class="totals-label">Total Due:</td>
          <td class="totals-value">${order.payableAmount.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      <p>Thank you for your purchase!</p>
      
    </div>
  </div>
</body>
</html>




        ` 

        const options = {
          format: 'A4',
          margin: {
              top: '10mm',
              left: '10mm',
              right: '10mm'
          },
      };
      
      const file = { content: html };
      const pdfBuffer = await pdf.generatePdf(file, options);
      const pdfFilePath = `./invoices/invoice_${orderId}.pdf`;
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      fs.createReadStream(pdfFilePath).pipe(res);

      }else{
        res.redirect('/user/login')
      }
    }catch(error){
      console.error("Error generating invoice:", error);
      res.status(500).json({success:false, error: "An error occurred while generating the invoice" })
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



module.exports = {
  orderConfrom,
  orderHistory,
  orderCancel,
  orderDetails,
  orderReturn,
  confrom_order_razorPay,
  razorPay_verify_payment,
  confrom_order_wallet,
  downloadInvoice,
  repaymentRazorpay,
  verifyRepayment
};
