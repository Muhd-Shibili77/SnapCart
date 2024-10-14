const bcrypt = require("bcrypt");
const User = require("../model/userdb");
const Category = require("../model/categoryDB");
const Brand = require("../model/brandDB");
const Product = require("../model/productDB");
const Order = require("../model/orderDB");
const Coupon = require("../model/couponDB");
const Wallet = require("../model/walletDB");
const moment = require("moment");
const pdf = require("html-pdf-node");
const fs = require('fs')
const admin_login = (req, res) => {
  if (req.session.isAdmin) {
    res.redirect("/admin/dashboard");
  } else {
    res.render("admin/adminLogin");
  }
};

const post_admin_login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const adminexist = await User.findOne({ email: email });

    if (adminexist) {
      if (adminexist.isAdmin) {
        const passwordmatch = await bcrypt.compare(
          password,
          adminexist.password
        );
        if (passwordmatch) {
          req.session.isAdmin = true;
          return res.json({ success: true, error: "Login successfull" });
        } else {
          return res.json({ success: false, error: "incorrect password" });
        }
      } else {
        return res.json({ success: false, error: "You are not admin" });
      }
    } else {
      return res.json({ success: false, error: "Email not found" });
    }
  } catch (err) {
    console.log("error in login ", err);
  }
};

const admin_dashboard = async (req, res) => {
  if (req.session.user) {
   return  res.redirect("/user/home");
  }
  if (req.session.isAdmin) {
    let query = {};
    const { sortStats, startDate, endDate } = req.query;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: moment(startDate).startOf("day").toDate(),
        $lte: moment(endDate).endOf("day").toDate(),
      };
    } else if (sortStats) {
      switch (sortStats.toLowerCase()) {
        case "week":
          query.createdAt = { $gte: moment().subtract(1, "week").toDate() };
          break;
        case "month":
          query.createdAt = { $gte: moment().subtract(1, "month").toDate() };
          break;
        case "day":
        default:
          query.createdAt = { $gte: moment().subtract(1, "day").toDate() };
          break;
      }
    }

    const order = await Order.find(query);
    const totalSales = order.reduce(
      (sum, amount) => sum + amount.payableAmount,
      0
    );
    const totalDiscount = order.reduce(
      (sum, amount) => sum + amount.discountAmount,
      0
    );

    

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1); 
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1); 
    const startOfYear = new Date(currentYear, 0, 1);
    const totalAmount  = await Order.aggregate([ { $match: {createdAt: { $gte: startOfYear } } },{  $group: {    _id: null,    totalPayableAmount: { $sum: "$payableAmount" }  }}]);
    const totalProfit = totalAmount.length > 0 ? totalAmount[0].totalPayableAmount : 0;
   
    const monthlyAmount  = await Order.aggregate([{$match: {createdAt: {$gte: startOfMonth,$lt: startOfNextMonth}} },{ $group: {  _id: null, totalPayableAmount: { $sum: "$payableAmount" } }}]);
    const monthlyProfit = monthlyAmount.length > 0 ? monthlyAmount[0].totalPayableAmount : 0;
    
    const recentTransaction = await Order.find({}, { _id: 0, payableAmount: 1, placeAt: 1, orderId: 1 })
    .sort({ placeAt: -1 })
    .limit(6);
    const formattedTransactions = recentTransaction.map(transaction => {
    const date = new Date(transaction.placeAt);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Ensure two digits
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? String(hours).padStart(2, '0') : '12';
    const time = `${hours}:${minutes} ${ampm}`; 
    return {
        orderId: transaction.orderId,
        payableAmount: transaction.payableAmount,
        time: time 
    };
});

const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0); 
const startOfTomorrow = new Date();
startOfTomorrow.setHours(0, 0, 0, 0); 
startOfTomorrow.setDate(startOfTomorrow.getDate() + 1); 


const todayTotalEarnings = await Order.aggregate([
  {
    $match: {
      createdAt: {
        $gte: startOfToday, 
        $lt: startOfTomorrow, 
      },
    },
  },
  {
    $group: {
      _id: null,
      totalEarnings: { $sum: "$payableAmount" }, 
    },
  },
]);
const todayProfit = todayTotalEarnings.length > 0 ? todayTotalEarnings[0].totalEarnings : 0;
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalProducts = await Product.countDocuments();
    const orders = await Order.find().limit(6).sort({ createdAt: -1 });
    const bestSellingProduct = await Product.find().sort({saleCount:-1}).limit(10)
    const bestSellingCategory = await Category.find().sort({saleCount:-1}).limit(10)
    const bestSellingBrand = await Brand.find().sort({saleCount:-1}).limit(10)

   
    //chart 

    const chartSort = req.query.chartSort || "today";
    let data = {};
    const currentDate = new Date();
   
    switch(chartSort){

      case "year":


        filterStartDate = new Date(currentDate.getFullYear() - 4, 0, 1);
        filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1);

        

        const yearlyData = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: filterStartDate, $lt: filterEndDate },
            },
          },
          {
            $group: {
              _id: { $year: "$createdAt" },
              totalOrders: { $sum: 1 },
              totalAmount: { $sum: "$payableAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        
        let yearlyAmounts = new Array(5).fill(0);
        let yearlyOrders = new Array(5).fill(0);
       
        let yearLabels = [
          currentDate.getFullYear() - 4,
          currentDate.getFullYear() - 3,
          currentDate.getFullYear() - 2,
          currentDate.getFullYear() - 1,
          currentDate.getFullYear(),
        ];

        yearlyData.forEach((d) => {
          const index = yearLabels.indexOf(d._id);
          if (index !== -1) {
            yearlyAmounts[index] = d.totalAmount;
          }
        });

        yearlyData.forEach((d) => {
          const index = yearLabels.indexOf(d._id);
          if (index !== -1) {
            yearlyOrders[index] = d.totalOrders;
          }
        });

        const yearlyTotalPrice = yearlyData.reduce(
          (acc, curr) => acc + curr.totalAmount,
          0
        );
  
        data = {
          label: "Yearly",
          labels: yearLabels,
          values: yearlyAmounts,
          orders:yearlyOrders,
          totalPrice: yearlyTotalPrice,
        };
        


        break;

      case "month":
      filterStartDate = new Date(currentDate.getFullYear(), 0, 1);
      filterEndDate = new Date(currentDate.getFullYear() + 1, 0, 1);

      const monthlyData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: filterStartDate, $lt: filterEndDate },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$payableAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let monthlyAmounts = new Array(12).fill(0);
      let monthlyOrders = new Array(12).fill(0);
      monthlyData.forEach((d) => {
        monthlyAmounts[d._id - 1] = d.totalAmount;
      });
      monthlyData.forEach((d) => {
        monthlyOrders[d._id - 1] = d.totalOrders;
      });
      const monthlyTotalPrice = monthlyData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: [
          "JAN",
          "FEB",
          "MAR",
          "APR",
          "MAY",
          "JUN",
          "JUL",
          "AUG",
          "SEP",
          "OCT",
          "NOV",
          "DEC",
        ],
        label: "Monthly",
        values: monthlyAmounts,
        orders:monthlyOrders,
        totalPrice: monthlyTotalPrice,
      };
    
      break;


      case "week":
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weeklyData = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek, $lte: endOfWeek },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: "$payableAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      let weeklyAmounts = new Array(7).fill(0);
      let weeklyOrders = new Array(7).fill(0);

      weeklyData.forEach((d) => {
        weeklyAmounts[d._id - 1] = d.totalAmount; 
      });

      weeklyData.forEach((d) => {
        weeklyOrders[d._id - 1] = d.totalOrders; 
      });

      const weeklyTotalPrice = weeklyData.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
      );

      data = {
        labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        label: "Weekly",
        values: weeklyAmounts,
        orders:weeklyOrders,
        totalPrice: weeklyTotalPrice,
      };
     
      break;
      
     
      default:
        const startOfWeekDe = new Date(currentDate);
        startOfWeekDe.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeekDe.setHours(0, 0, 0, 0); 
  
        const endOfWeekDe = new Date(startOfWeekDe);
        endOfWeekDe.setDate(startOfWeekDe.getDate() + 6);
        endOfWeekDe.setHours(23, 59, 59, 999);
  
        const weeklyDataDe = await Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfWeekDe, $lte: endOfWeekDe },
            },
          },
          {
            $group: {
              _id: { $dayOfWeek: "$createdAt" },
              totalOrders: { $sum: 1 },
              totalAmount: { $sum: "$payableAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]);
     
  
        let weeklyAmountsDe = new Array(7).fill(0);
        let weeklyOrdersDe = new Array(7).fill(0);

        weeklyDataDe.forEach((d) => {
          weeklyAmountsDe[d._id - 1] = d.totalAmount;
        });
        weeklyDataDe.forEach((d) => {
          weeklyOrdersDe[d._id - 1] = d.totalOrders;
        });
  
        const weeklyTotalPriceDe = weeklyDataDe.reduce(
          (acc, curr) => acc + curr.totalAmount,
          0
        );
  
        data = {
          labels: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
          label: "Weekly",
          values: weeklyAmountsDe,
          orders:weeklyOrdersDe,
          totalPrice: weeklyTotalPriceDe,
        };
        break;
       

    }
    


    res.render("admin/adminDashboard", {
      data: JSON.stringify(data),
      totalUsers,
      totalProducts,
      totalOrders,
      totalSales,
      totalDiscount,
      orders,
      bestSellingProduct,
      bestSellingCategory,
      bestSellingBrand,
      totalProfit,
      monthlyProfit,
      formattedTransactions,
      todayProfit
    });
  } else {
    res.redirect("/admin/login");
  }
};

const admin_users = async (req, res) => {
  if (req.session.isAdmin) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const totalProducts = await User.find({ isAdmin: false }).countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const users = await User.find({ isAdmin: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminUsers", { users, totalPage, currentPage: page });
  } else {
    res.redirect("/admin/login");
  }
};

//blocking the user

const block_users = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { userId } = req.body;
      await User.findByIdAndUpdate(userId, { isBlock: true });
      console.log("user blocked successfully");
      res.status(200).json({ message: "User blocked successfully" });
    } catch (error) {
      console.log("something went wrong while blocking the user");
      res
        .status(500)
        .json({ error: "Something went wrong in blocking the user" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

//unblocking the user

const unblock_users = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { userId } = req.body;
      await User.findByIdAndUpdate(userId, { isBlock: false });
      console.log("user unblocked successfully");
      res.status(200).json({ message: "User unblocked successfully" });
    } catch (err) {
      console.log("something went wrong while unblocking the user");
      res.status(500).json({ err: "something went wrong in unblocking user" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const admin_category = async (req, res) => {
  if (req.session.isAdmin) {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await Category.countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const cat = await Category.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminCategries", { cat, totalPage, currentPage: page });
  } else {
    res.redirect("/admin/login");
  }
};

const add_category = async (req, res) => {
  try {
    const categoryName = req.body.categoryName;
    const existCat = await Category.findOne({ category_name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
    const cat = await Category.find();

    if (existCat) {
      return res.json({
        success: false,
        error: "this category is already exist",
      });
    }
    const newCategory = new Category({
      category_name: categoryName,
    });

    await newCategory.save();

    res.json({ success: true, message: "category added successfully" });
  } catch (error) {
    console.log("something went wrong while adding new category");
    return res.json({
      success: false,
      error: "something went wrong while adding new category",
    });
  }
};

const delete_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: true });

      await Product.updateMany(
        { category_id: catId },
        { $set: { isDelete: true } }
      );

      console.log("category deleted successfully");
      res
        .status(200)
        .json({
          message: "category and related products are deleted successfully",
        });
    } catch (err) {
      console.log("something went wrong while deleting the category");
      res
        .status(500)
        .json({ err: "something went wrong while deleting the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const restore_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { catId } = req.body;
      await Category.findByIdAndUpdate(catId, { isDeleted: false });

      await Product.updateMany(
        { category_id: catId },
        { $set: { isDelete: false } }
      );

      res
        .status(200)
        .json({
          message: "category and related products are restored successfully",
        });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const edit_category = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { categoryId, categoryName } = req.body;
      const catExit = await Category.findOne({ category_name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
      if (catExit) {
        return res.status(400).json({ error: "Category already exists" });
      }
      await Category.findByIdAndUpdate(categoryId, {
        category_name: categoryName,
      });
      res.status(200).json({ message: "category updated successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ err: "something went wrong while updating the category" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const admin_brand = async (req, res) => {
  if (req.session.isAdmin) {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await Brand.countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const brand = await Brand.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminBrands", { brand, totalPage, currentPage: page });
  } else {
    res.redirect("/admin/login");
  }
};

const add_brand = async (req, res) => {
  try {
    const brandName = req.body.brandName;

    const existbrand = await Brand.findOne({ brand_name: { $regex: new RegExp(`^${brandName}$`,'i')} });
    const brand = await Brand.find();

    if (existbrand) {
      return res.json({
        success: false,
        error: "This category is already exist",
      });
    }
    const newbrand = new Brand({
      brand_name: brandName,
    });

    await newbrand.save();
    res.json({ success: true, message: "brand added successfully" });
  } catch (error) {
    return res.json({
      success: false,
      error: "something went wrong while adding new brand",
    });
  }
};

const delete_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: true });
      await Product.updateMany(
        { brand_id: brandId },
        { $set: { isDelete: true } }
      );

      res.status(200).json({ message: "brand deleted successfully" });
    } catch (err) {
      console.log("something went wrong while deleting the brand");
      res
        .status(500)
        .json({ err: "something went wrong while deleting the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const restore_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { brandId } = req.body;
      await Brand.findByIdAndUpdate(brandId, { isDeleted: false });
      await Product.updateMany(
        { brand_id: brandId },
        { $set: { isDelete: false } }
      );
      res.status(200).json({ message: "brand restored successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while restoring the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const edit_brand = async (req, res) => {
  if (req.session.isAdmin) {
    try {
      const { brandId, brandName } = req.body;

      const brandExit = await Brand.findOne({ brand_name: { $regex: new RegExp(`^${brandName}$`,'i')} });

      if (brandExit) {
        return res.status(400).json({ error: "brand already exists" });
      }
      await Brand.findByIdAndUpdate(brandId, { brand_name: brandName });
      res.status(200).json({ message: "brand updated successfully" });
    } catch (err) {
      res
        .status(500)
        .json({ err: "something went wrong while updating the brand" });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const orders = async (req, res) => {
  if (req.session.isAdmin) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalProducts = await Order.countDocuments();
    const totalPage = Math.ceil(totalProducts / limit);

    const order = await Order.find()
      .populate("items.product")
      .populate("user")
      .sort({ orderId: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/adminOrders", { order, totalPage, currentPage: page });
  } else {
    res.redirect("/admin/login");
  }
};

const update_orderStatus = async (req, res) => {
  if (req.session.isAdmin) {
    const { status, orderId } = req.body;
    const orderInfo = await Order.findById(orderId);

    if (!orderInfo) {
      return res
        .status(400)
        .json({ success: false, message: "order is not found " });
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
    }
   

    await Order.findByIdAndUpdate(orderId, { orderStatus: status });
    if (status === "Delivered") {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "Paid" });
    }
    res
      .status(200)
      .json({ success: true, message: "orderStatus successfully updated" });
  } else {
    res.redirect("/admin/login");
  }
};

const acceptReturn = async (req, res) => {
  if (req.session.isAdmin) {
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
    const refundAmount = item.price;

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
  } else {
    res.redirect("/admin/login");
  }
};

const rejectReturn = async (req, res) => {
  if (req.session.isAdmin) {
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
  } else {
    res.redirect("/admin/login");
  }
};

const downloadReport = async (req, res) => {
  try{


  const { startDate, endDate } = req.body;
 

 
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = moment(startDate).startOf("day").toDate();
    }
    if (endDate) {
      query.createdAt.$lte = moment(endDate).endOf("day").toDate();
    }
  }

  const orders = await Order.find(query)
    .populate("user", "name")
    .populate({
        path: "items.product",
        select: "product_name variants",
    })
    .exec();
    


     if (!orders || orders.length === 0) {
      console.log("No orders found for the specified date range.");
     return res.status(404).json({ success:false,error: "No orders found for the selected date range." });
     }

     let totalPayableAmount = 0;

      
      const reportDate = moment().format("MMMM Do YYYY");
      const startReportDate = moment(startDate).format("MMMM Do YYYY");
      const endReportDate = moment(endDate).format("MMMM Do YYYY");
      
      
      const html = `
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body {
              font-family: 'Arial', sans-serif; 
              font-size: 12px; 
              color: #333; 
              margin: 20px;
              background-color: #f9f9f9;
            }
            h1 {
              text-align: center;
              font-size: 24px;
              color: #4CAF50;
              margin-bottom: 10px;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            }
            h5 {
              text-align: center;
              font-size: 14px;
              color: #555;
            }
            p {
              text-align: center;
              font-size: 12px; 
              color: #777; 
            }
            table {
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
              background-color: #fff;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            th, td {
              border: 1px solid #ddd; 
              padding: 10px; 
              text-align: left; 
            }
            th {
              background-color: #4CAF50; 
              color: white; 
              font-weight: bold; 
              font-size: 14px;
            }
            td {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) td {
              background-color: #e9e9e9;
            }
            .nested-table {
              margin: 10px 0;
              width: 95%;
              border: none;
              background-color: #f9f9f9;
            }
            .nested-table th, .nested-table td {
              border: 1px solid #ddd; 
              padding: 4px; 
            }
            .footer {
              margin-top: 20px;
              font-size: 14px;
              font-weight: bold;
              text-align: right;
              color: #4CAF50;
            }
            .date-range {
              font-size: 12px; 
              text-align: center;
              margin-bottom: 20px;
            }
            @media print {
              body {
                margin: 0;
              }
              table {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <h5 class="date-range">Report Created On: ${reportDate}</h5>
          <p class="date-range">Reporting Period: ${startReportDate} to ${endReportDate}</p>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => {
                  totalPayableAmount += order.payableAmount || 0;
                  return `
                    <tr>
                      <td>${order.orderId}</td>
                      <td>${new Date(order.placeAt).toLocaleDateString()}</td>
                      <td>₹${order.totalAmount.toFixed(2)}</td>
                      <td>${order.paymentStatus}</td>
                      <td>${order.user ? order.user.name : "N/A"}</td>
                    </tr>
                    <tr>
                      <td colspan="5">
                        <table class="nested-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Variant</th>
                              <th>Quantity</th>
                              <th>Price</th>
                              <th>Net Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${order.items.map(item => {
                                const netPrice = item.price * item.quantity;
                                const variant = item.product.variants.find(v => v._id.toString() === item.variantId);
                                const color = variant ? variant.color : "N/A";
      
                                return `
                                  <tr>
                                    <td>${item.product.product_name}</td>
                                    <td>${color}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${item.price.toFixed(2)}</td>
                                    <td>₹${netPrice.toFixed(2)}</td>
                                  </tr>
                                `;
                            }).join("")}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  `;
              }).join("")}
            </tbody>
          </table>
          <div class="footer">Total Payable Amount: ₹${totalPayableAmount.toFixed(2)}</div>
        </body>
      </html>
      `;
      
      const options = {
        format: "A4",
        orientation: "portrait",
        border: {
          top: "0.3in",
          right: "0.3in",
          bottom: "0.3in",
          left: "0.3in",
        },
      };
      const file = { content: html };
      const pdfBuffer = await pdf.generatePdf(file, options);
      const pdfFilePath = `./salesReport/salesReport.pdf`;
      fs.writeFileSync(pdfFilePath, pdfBuffer);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");
      fs.createReadStream(pdfFilePath).pipe(res);

    }catch(error){
      console.error("Error generating sales report:", error);
      res.status(500).json({success:false, error: "An error occurred while generating the sales report" })
    }
};

const admin_logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/admin/login");
    }
  });
};
module.exports = {
  admin_login,
  post_admin_login,
  admin_dashboard,
  admin_users,
  admin_logout,
  block_users,
  unblock_users,
  admin_category,
  add_category,
  restore_category,
  delete_category,
  edit_category,
  admin_brand,
  add_brand,
  delete_brand,
  restore_brand,
  edit_brand,
  orders,
  update_orderStatus,
  rejectReturn,
  acceptReturn,
  downloadReport,
};
