const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const createInvoicePDF = async (order, invoiceNumber, invoicePath, res) => {
  try {
    const address = order.address[0]; 


    const doc = new PDFDocument({ size: "A4", margin: 50 });

   
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

  
    generateHeader(doc);
    generateCustomerInformation(doc, order, invoiceNumber);
    generateInvoiceTable(doc, order);
    generateFooter(doc);

    
    doc.end();

    
    writeStream.on('finish', () => {
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      fs.createReadStream(invoicePath).pipe(res);
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    throw new Error("Failed to generate invoice PDF");
  }
};



function generateHeader(doc) {
  doc
    .image("public/images/SnapCart.png", 50, 45, { width: 100 }) 
    .fillColor("#444444")
    .fontSize(20)
    .fontSize(10)
    .text("SnapCart Pvt. Ltd.", 200, 50, { align: "right" })
    .text("123 E-commerce Street", 200, 65, { align: "right" })
    .text("New York, NY, 10025", 200, 80, { align: "right" })
    .moveDown();
}

function generateCustomerInformation(doc, order, invoiceNumber) {
  const address = order.address[0];

  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Invoice", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .text("Invoice Number:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(invoiceNumber, 150, customerInformationTop)
    .font("Helvetica")
    .text("Invoice Date:", 50, customerInformationTop + 15)
    .text(formatDate(new Date()), 150, customerInformationTop + 15)
    .text("Order ID:", 50, customerInformationTop + 30)
    .text(order.orderId, 150, customerInformationTop + 30)
    .text("Payment Status:", 50, customerInformationTop + 45)
    .text(order.paymentStatus, 150, customerInformationTop + 45)
    .text("Payment Method:", 50, customerInformationTop + 60)
    .text(order.paymentMethod, 150, customerInformationTop + 60)

    .font("Helvetica-Bold")
    .text(`${address.fullName}`, 300, customerInformationTop)
    .font("Helvetica")
    .text(`${address.streetAddress}`, 300, customerInformationTop + 15)
    .text(
      `${address.city}, ${address.state}, ${address.country}, ${address.pincode}`,
      300,
      customerInformationTop + 30
    )
    .text(`Phone: ${address.phone}`, 300, customerInformationTop + 45)
    .moveDown();

  generateHr(doc, 280);
}

function generateInvoiceTable(doc, order) {
  let i;
  const invoiceTableTop = 360;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Product",
    "Variant",
    "Qty",
    "Price",
    "Total"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const product = item.product;
    const variant = product.variants.find(v => v._id.toString() === item.variantId);
    const position = invoiceTableTop + (i + 1) * 30;

    generateTableRow(
      doc,
      position,
      product.product_name,
      `Color: ${variant.color}, Storage: ${variant.size}`,
      item.quantity,
      `INR ${item.price.toFixed(2)}`,
      `INR ${(item.quantity * item.price).toFixed(2)}`
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30;
  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    `INR ${order.totalAmount.toFixed(2)}`
  );

  const discountPosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    discountPosition,
    "",
    "",
    "Discount",
    "",
    `- INR ${order.discountAmount.toFixed(2)}`
  );

  const totalPosition = discountPosition + 20;
  generateTableRow(
    doc,
    totalPosition,
    "",
    "",
    "Total Due",
    "",
    `INR ${order.payableAmount.toFixed(2)}`
  );
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text("Thank you for your purchase!", 50, 750, { align: "center", width: 500 });
}

function generateTableRow(doc, y, item, variant, qty, price, total) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(variant, 150, y)
    .text(qty, 280, y, { width: 90, align: "right" })
    .text(price, 370, y, { width: 90, align: "right" })
    .text(total, 0, y, { align: "right" });
}

function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${year}/${month}/${day}`;
}

module.exports = { createInvoicePDF };
