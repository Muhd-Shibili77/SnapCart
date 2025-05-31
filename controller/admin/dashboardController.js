const Order = require("../../model/orderDB");
const User = require("../../model/userdb");
const Product = require("../../model/productDB");
const Category = require("../../model/categoryDB");
const Brand = require("../../model/brandDB");
const moment = require("moment");

const admin_dashboard = async (req, res) => {
  try {
    if (req.session.user) {
      return res.redirect("/user/home");
    }

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
    const totalAmount = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfYear } } },
      { $group: { _id: null, totalPayableAmount: { $sum: "$payableAmount" } } },
    ]);
    const totalProfit =
      totalAmount.length > 0 ? totalAmount[0].totalPayableAmount : 0;

    const monthlyAmount = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } } },
      { $group: { _id: null, totalPayableAmount: { $sum: "$payableAmount" } } },
    ]);
    const monthlyProfit =
      monthlyAmount.length > 0 ? monthlyAmount[0].totalPayableAmount : 0;

    const recentTransaction = await Order.find(
      {},
      { _id: 0, payableAmount: 1, placeAt: 1, orderId: 1 }
    )
      .sort({ placeAt: -1 })
      .limit(6);

    const formattedTransactions = recentTransaction.map((transaction) => {
      const date = new Date(transaction.placeAt);
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0"); // Ensure two digits
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? String(hours).padStart(2, "0") : "12";
      const time = `${hours}:${minutes} ${ampm}`;
      return {
        orderId: transaction.orderId,
        payableAmount: transaction.payableAmount,
        time: time,
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
    const todayProfit =
      todayTotalEarnings.length > 0 ? todayTotalEarnings[0].totalEarnings : 0;
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalProducts = await Product.countDocuments();
    const orders = await Order.find().limit(6).sort({ createdAt: -1 });
    const bestSellingProduct = await Product.find()
      .sort({ saleCount: -1 })
      .limit(10);
    const bestSellingCategory = await Category.find()
      .sort({ saleCount: -1 })
      .limit(10);
    const bestSellingBrand = await Brand.find()
      .sort({ saleCount: -1 })
      .limit(10);

    //chart

    const chartSort = req.query.chartSort || "today";
    let data = {};
    const currentDate = new Date();

    switch (chartSort) {
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
          orders: yearlyOrders,
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
          orders: monthlyOrders,
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
          orders: weeklyOrders,
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
          orders: weeklyOrdersDe,
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
      todayProfit,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render("error", { message: "Dashboard loading failed" });
  }
};

module.exports = {
  admin_dashboard,
};
