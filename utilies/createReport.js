const moment = require("moment");
const path = require("path");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const createReportPDF = async (orders, totalPayableAmount, reportPath, res, startDate, endDate) => {
  try {
    const reportDate = moment().format("YYYY/MM/DD");
    const startReportDate = moment(startDate).format("YYYY/MM/DD");
    const endReportDate = moment(endDate).format("YYYY/MM/DD");
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(reportPath);
    doc.pipe(writeStream);
    generateHeader(doc, reportDate, startReportDate, endReportDate);
    generateCustomerInformation(doc, startReportDate, endReportDate);
    generateTableHeader(doc);

    orders.forEach((order, index) => {
      generateOrderRow(doc, order, index);
    });

    generateFooter(doc, totalPayableAmount);

    doc.end();

    writeStream.on("finish", () => {
      res.setHeader("Content-Disposition", `attachment; filename=sales_report.pdf`);
      res.setHeader("Content-Type", "application/pdf");
      fs.createReadStream(reportPath).pipe(res);
    });
  } catch (error) {
    console.error("Error generating report PDF:", error);
    throw new Error("Failed to generate report PDF");
  }
};


function generateHeader(doc, reportDate, startReportDate, endReportDate) {
  doc
    .image("public/images/SnapCart.png", 50, 45, { width: 100 })
    .fillColor("#444444")
    .fontSize(20)
    .text("SnapCart Pvt. Ltd.", 200, 50, { align: "right" })
    .text("123 E-commerce Street", 200, 65, { align: "right" })
    .text("New York, NY, 10025", 200, 80, { align: "right" })
    .moveDown();

  doc
    .fillColor("#4CAF50")
    .fontSize(20)
    .text("Sales Report", { align: "center" })
    .moveDown()
    .fontSize(10)
    .fillColor("#555")
    .text(`Report Created On: ${reportDate}`, { align: "center" })
    .text(`Reporting Period: ${startReportDate} to ${endReportDate}`, { align: "center" })
    .moveDown(2);
}


function generateCustomerInformation(doc, startReportDate, endReportDate) {
  const infoTop = 160;
  doc
    .fillColor("#444444")
    .fontSize(12)
    .text("Reporting Period:", 50, infoTop)
    .font("Helvetica-Bold")
    .text(`${startReportDate} to ${endReportDate}`, 150, infoTop)
    .moveDown();

  generateHr(doc, infoTop + 20);
}


function generateTableHeader(doc) {
  const tableTop = 200;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    tableTop,
    "Order ID",
    "Date",
    "Total Amount",
    "Status",
    "User"
  );
  generateHr(doc, tableTop + 20);
  doc.font("Helvetica");
}


function generateOrderRow(doc, order, index) {
  const position = doc.y + 15;
  
  doc
    .fontSize(10)
    .fillColor("#000")
    .text(order.orderId, 50, position)
    .text(moment(order.createdAt).format("YYYY/MM/DD"), 150, position)
    .text(`INR ${order.totalAmount.toFixed(2)}`, 250, position)
    .text(order.paymentStatus, 350, position)
    .text(order.user ? order.user.name : "N/A", 450, position)
    .moveDown();

  
  order.items.forEach((item) => {
    const variant = item.product.variants.find((v) => v._id.toString() === item.variantId);
    const color = variant ? variant.color : "N/A";
    const netPrice = item.price * item.quantity;
    
    const itemPosition = doc.y + 10;
    doc
      .fontSize(9)
      .text(`- ${item.product.product_name} (${color})`, 60, itemPosition)
      .text(`${item.quantity}`, 250, itemPosition)
      .text(`INR ${item.price.toFixed(2)}`, 300, itemPosition)
      .text(`INR ${netPrice.toFixed(2)}`, 400, itemPosition);
    doc.moveDown();
  });

  generateHr(doc, doc.y + 10);
}


function generateFooter(doc, totalPayableAmount) {
  doc
    .fontSize(12)
    .fillColor("#4CAF50")
    .text(`Total Payable Amount: INR ${totalPayableAmount.toFixed(2)}`, { align: "right" })
    .moveDown(2);

  doc
    .fontSize(10)
    .text("Thank you for your business!", 50, 750, { align: "center", width: 500 });
}


function generateTableRow(doc, y, orderId, date, totalAmount, status, user) {
  doc
    .fontSize(10)
    .text(orderId, 50, y)
    .text(date, 150, y)
    .text(totalAmount, 250, y)
    .text(status, 350, y)
    .text(user, 450, y);
}


function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

module.exports = { createReportPDF };
