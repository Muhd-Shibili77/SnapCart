const Order = require("../../model/orderDB");
const moment = require("moment");
const path = require("path");
const { createReportPDF } = require("../../utilies/createReport");

const downloadReport = async (req, res) => {
  try {
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
      return res.status(404).json({
        success: false,
        error: "No orders found for the selected date range.",
      });
    }

    const totalPayableAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const reportFilePath = path.join(__dirname, "../../salesReport/salesReport.pdf");

    await createReportPDF(orders, totalPayableAmount, reportFilePath, res, startDate, endDate);
  } catch (error) {
    console.error("Error generating sales report:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while generating the sales report",
    });
  }
};

module.exports = {
  downloadReport
};