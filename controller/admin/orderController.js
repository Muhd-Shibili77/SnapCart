const Order = require("../../model/orderDB");
const Product = require("../../model/productDB");
const Brand = require("../../model/brandDB");
const Category = require("../../model/categoryDB");
const User = require("../../model/userdb");
const Wallet = require("../../model/walletDB");
const orders = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const searchCriteria = {  
      orderId: { $regex: searchQuery, $options: 'i' } 
    };

    const totalOrders = await Order.countDocuments(searchCriteria);
    const totalPage = Math.ceil(totalOrders / limit);

    const orders = await Order.find(searchCriteria)
      .populate("items.product")
      .populate("user")
      .sort({ orderId: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminOrders", { 
      order: orders, 
      totalPage, 
      currentPage: page 
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).render("error", { message: "Failed to load orders" });
  }
};

const update_orderStatus = async (req, res) => {
  try {
    const { status, orderId } = req.body;
    const orderInfo = await Order.findById(orderId);

    if (!orderInfo) {
      return res.status(400).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    if(status === "Cancelled"){
      
      for (let item of orderInfo.items){
        const product = await Product.findById(item.product)
    
      

      const variant = product.variants.find(
        (a) => a._id.toString() === item.variantId
      );
      product.saleCount -= item.quantity;
      variant.stock += item.quantity;
      const brand = await Brand.findById(product.brand_id)
      const category = await Category.findById(product.category_id)
      category.saleCount -=item.quantity;
      brand.saleCount -=item.quantity;
      await brand.save();
      await category.save();
      await product.save();
    }


    if (orderInfo.paymentStatus === "Paid") {
      const user = await User.findOne({_id:orderInfo.user})
      const refund = orderInfo.payableAmount;
      let wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        wallet = new Wallet({
          user: orderInfo.user,
          balanceAmount: 0,
          wallet_history: [],
        });
      }

      wallet.balanceAmount += refund;
      wallet.wallet_history.push({
        date: new Date(),
        amount: refund,
        description: `Refund for cancelled item (Order ID: ${orderInfo.orderId})`,
        transactionType: "credited",
      });
      await wallet.save();
    }

    }

    await Order.findByIdAndUpdate(orderId, { orderStatus: status });
    
    if (status === "Delivered") {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "Paid" });
    }

    res.status(200).json({ 
      success: true, 
      message: "Order status updated successfully" 
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update order status" 
    });
  }
};

const acceptReturn = async (req, res) => {
  
    const { orderId, itemId } = req.body;

    if (!orderId) {
      return res.json({ success: false, error: "orderId is empty" });
    }
    if (!itemId) {
      return res.json({ success: false, error: "itemId is empty" });
    }
    const order = await Order.findOne({ _id: orderId });
    const item = order.items.find((item) => item._id.toString() === itemId);

    const product = await Product.findById(item.product)
    
    const brand = await Brand.findById(product.brand_id)
    const category = await Category.findById(product.category_id)
    brand.saleCount -=item.quantity;
    category.saleCount -=item.quantity;
    await category.save();
    await brand.save();

    const variant = product.variants.find(
      (a) => a._id.toString() === item.variantId
    );
    
    variant.stock += item.quantity;
    product.saleCount -= item.quantity;
    
    await product.save();




    if (!order) {
      return res.json({ success: false, error: "order not found" });
    }
    if (!item) {
      return res.json({
        success: false,
        error: "item not found in this order",
      });
    }

    if (!item.isReturnRequested) {
      return res.json({
        success: false,
        message: "Return request has not been made for this item",
      });
    }

    item.isAdminAcceptedReturn = "Accepted";
    const refundAmount = order.payableAmount;

    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({
        user: order.user,
        balanceAmount: 0,
        wallet_history: [],
      });
    }
    wallet.balanceAmount += refundAmount;
    wallet.wallet_history.push({
      date: new Date(),
      amount: refundAmount,
      description: `Refund for returned item on an item on ${order.orderId}`,
      transactionType: "credited",
    });

    await wallet.save();
    await order.save();

    res.json({ success: true, message: "Return request Accepted" });
  
};

const rejectReturn = async (req, res) => {
 
    const { orderId, itemId } = req.body;
    if (!orderId) {
      return res.json({ success: false, error: "orderId is empty" });
    }
    if (!itemId) {
      return res.json({ success: false, error: "itemId is empty" });
    }
    const order = await Order.findOne({ _id: orderId });
    const item = order.items.find((item) => item._id.toString() === itemId);
    if (!order) {
      return res.json({ success: false, error: "order not found" });
    }
    if (!item) {
      return res.json({
        success: false,
        error: "item not found in this order",
      });
    }
    if (!item.isReturnRequested) {
      return res.json({
        success: false,
        message: "Return request has not been made for this item",
      });
    }

    item.isAdminAcceptedReturn = "Rejected";

    await order.save();

    res.json({ success: true, message: "Return request rejected" });
  
};


module.exports = {
  orders,
  update_orderStatus,
  acceptReturn,
  rejectReturn
};