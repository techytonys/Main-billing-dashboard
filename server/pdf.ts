import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { Invoice, InvoiceLineItem, Customer } from "@shared/schema";

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function drawRoundedRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, r: number) {
  doc.moveTo(x + r, y);
  doc.lineTo(x + w - r, y);
  doc.quadraticCurveTo(x + w, y, x + w, y + r);
  doc.lineTo(x + w, y + h - r);
  doc.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  doc.lineTo(x + r, y + h);
  doc.quadraticCurveTo(x, y + h, x, y + h - r);
  doc.lineTo(x, y + r);
  doc.quadraticCurveTo(x, y, x + r, y);
  doc.closePath();
}

export function generateInvoicePDF(
  invoice: Invoice,
  lineItems: InvoiceLineItem[],
  customer: Customer
) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const pw = 595;

  const brand = "#0f0f1a";
  const brandGrad = "#16162a";
  const accent = "#6366f1";
  const accentLight = "#818cf8";
  const darkText = "#0f172a";
  const bodyText = "#334155";
  const mutedText = "#64748b";
  const faintText = "#94a3b8";
  const lineColor = "#e2e8f0";
  const stripeBg = "#f8fafc";
  const cardBg = "#ffffff";
  const pageBg = "#f1f5f9";

  doc.rect(0, 0, pw, 842).fill(pageBg);

  doc.rect(0, 0, pw, 140).fill(brand);
  doc.rect(0, 138, pw, 4).fill(accent);

  const logoPath = path.resolve("client/public/images/logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 30, { width: 48, height: 48 });
  }

  doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold").text("AI Powered Sites", 108, 36);
  doc.fontSize(9).fillColor(faintText).font("Helvetica").text("hello@aipoweredsites.com", 108, 58);
  doc.fontSize(8).fillColor(faintText).text("aipoweredsites.com", 108, 72);

  doc.fontSize(28).fillColor("#ffffff").font("Helvetica-Bold").text("INVOICE", pw - 200, 32, { width: 150, align: "right" });
  doc.fontSize(11).fillColor(accentLight).font("Helvetica").text(invoice.invoiceNumber, pw - 200, 66, { width: 150, align: "right" });

  const statusText = (invoice.status || "draft").toUpperCase();
  const statusColors: Record<string, { bg: string; text: string }> = {
    paid: { bg: "#dcfce7", text: "#166534" },
    overdue: { bg: "#fee2e2", text: "#991b1b" },
    pending: { bg: "#fef3c7", text: "#92400e" },
    draft: { bg: "#e2e8f0", text: "#475569" },
  };
  const sc = statusColors[invoice.status || "draft"] || statusColors.draft;
  const statusWidth = doc.fontSize(8).font("Helvetica-Bold").widthOfString(statusText) + 20;
  const statusX = pw - 50 - statusWidth;
  drawRoundedRect(doc, statusX, 90, statusWidth, 20, 10);
  doc.fill(sc.bg);
  doc.fillColor(sc.text).fontSize(8).font("Helvetica-Bold").text(statusText, statusX, 96, { width: statusWidth, align: "center" });

  const cardTop = 162;
  const cardMargin = 40;
  const cardWidth = pw - cardMargin * 2;
  const cardBottom = 780;

  doc.save();
  drawRoundedRect(doc, cardMargin, cardTop, cardWidth, cardBottom - cardTop, 8);
  doc.fill(cardBg);
  doc.restore();

  doc.save();
  drawRoundedRect(doc, cardMargin, cardTop, cardWidth, cardBottom - cardTop, 8);
  doc.lineWidth(0.5).strokeColor("#d1d5db").stroke();
  doc.restore();

  const innerLeft = cardMargin + 30;
  const innerRight = cardMargin + cardWidth - 30;
  const contentWidth = innerRight - innerLeft;

  let cy = cardTop + 28;

  const metaBoxWidth = (contentWidth - 20) / 2;

  doc.save();
  drawRoundedRect(doc, innerLeft, cy, metaBoxWidth, 70, 6);
  doc.fill("#f8fafc");
  doc.restore();
  doc.save();
  drawRoundedRect(doc, innerLeft, cy, metaBoxWidth, 70, 6);
  doc.lineWidth(0.5).strokeColor(lineColor).stroke();
  doc.restore();

  doc.fontSize(7).fillColor(faintText).font("Helvetica-Bold").text("BILL TO", innerLeft + 14, cy + 10);
  doc.fontSize(12).fillColor(darkText).font("Helvetica-Bold").text(customer.name, innerLeft + 14, cy + 24, { width: metaBoxWidth - 28 });
  doc.font("Helvetica");
  let detailY = cy + 42;
  if (customer.company) {
    doc.fontSize(9).fillColor(mutedText).text(customer.company, innerLeft + 14, detailY, { width: metaBoxWidth - 28 });
    detailY += 13;
  }
  doc.fontSize(9).fillColor(mutedText).text(customer.email, innerLeft + 14, detailY, { width: metaBoxWidth - 28 });

  const rightBoxX = innerLeft + metaBoxWidth + 20;
  doc.save();
  drawRoundedRect(doc, rightBoxX, cy, metaBoxWidth, 70, 6);
  doc.fill("#f8fafc");
  doc.restore();
  doc.save();
  drawRoundedRect(doc, rightBoxX, cy, metaBoxWidth, 70, 6);
  doc.lineWidth(0.5).strokeColor(lineColor).stroke();
  doc.restore();

  doc.fontSize(7).fillColor(faintText).font("Helvetica-Bold").text("INVOICE DETAILS", rightBoxX + 14, cy + 10);

  const detailLabelX = rightBoxX + 14;
  const detailValX = rightBoxX + 80;
  doc.fontSize(9).fillColor(mutedText).font("Helvetica").text("Issued:", detailLabelX, cy + 26);
  doc.fillColor(darkText).font("Helvetica-Bold").text(formatDate(invoice.issuedAt), detailValX, cy + 26, { width: metaBoxWidth - 94 });

  doc.fontSize(9).fillColor(mutedText).font("Helvetica").text("Due:", detailLabelX, cy + 42);
  doc.fillColor(darkText).font("Helvetica-Bold").text(formatDate(invoice.dueDate), detailValX, cy + 42, { width: metaBoxWidth - 94 });

  if (customer.phone) {
    doc.fontSize(9).fillColor(mutedText).font("Helvetica").text("Phone:", detailLabelX, cy + 58);
    doc.fillColor(darkText).font("Helvetica-Bold").text(customer.phone, detailValX, cy + 58, { width: metaBoxWidth - 94 });
  }

  cy += 90;

  const col = {
    desc: innerLeft + 14,
    qty: innerLeft + contentWidth - 200,
    rate: innerLeft + contentWidth - 130,
    total: innerLeft + contentWidth - 14,
  };

  doc.save();
  drawRoundedRect(doc, innerLeft, cy, contentWidth, 28, 6);
  doc.fill(brand);
  doc.restore();

  doc.fontSize(7.5).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("DESCRIPTION", col.desc, cy + 10);
  doc.text("QTY", col.qty, cy + 10, { width: 50, align: "right" });
  doc.text("RATE", col.rate, cy + 10, { width: 60, align: "right" });
  doc.text("AMOUNT", col.total - 65, cy + 10, { width: 65, align: "right" });

  cy += 34;

  doc.font("Helvetica");
  for (let i = 0; i < lineItems.length; i++) {
    const item = lineItems[i];

    if (i % 2 === 0) {
      doc.rect(innerLeft + 2, cy - 2, contentWidth - 4, 26).fill(stripeBg);
    }

    doc.fontSize(9.5).fillColor(darkText).font("Helvetica").text(item.description, col.desc, cy + 5, { width: col.qty - col.desc - 10 });
    doc.fontSize(9).fillColor(mutedText).text(String(Number(item.quantity)), col.qty, cy + 5, { width: 50, align: "right" });
    doc.text(formatCurrency(item.unitPrice), col.rate, cy + 5, { width: 60, align: "right" });
    doc.fillColor(darkText).font("Helvetica-Bold").text(formatCurrency(item.totalCents), col.total - 65, cy + 5, { width: 65, align: "right" });
    doc.font("Helvetica");
    cy += 26;
  }

  cy += 8;
  doc.moveTo(innerLeft + contentWidth - 220, cy).lineTo(innerRight, cy).strokeColor(lineColor).lineWidth(0.5).stroke();
  cy += 12;

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  doc.fontSize(9).fillColor(mutedText).font("Helvetica").text("Subtotal", innerRight - 220, cy, { width: 140, align: "right" });
  doc.fillColor(bodyText).font("Helvetica-Bold").text(formatCurrency(subtotal), innerRight - 70, cy, { width: 70, align: "right" });
  cy += 20;

  doc.save();
  drawRoundedRect(doc, innerRight - 230, cy, 230, 36, 6);
  doc.fill(brand);
  doc.restore();

  doc.fontSize(11).fillColor("#ffffff").font("Helvetica-Bold").text("Total Due", innerRight - 220, cy + 12, { width: 120 });
  doc.fontSize(14).fillColor("#ffffff").font("Helvetica-Bold").text(formatCurrency(invoice.totalAmountCents), innerRight - 80, cy + 10, { width: 70, align: "right" });

  cy += 50;

  if (invoice.notes) {
    doc.save();
    drawRoundedRect(doc, innerLeft, cy, contentWidth, 60, 6);
    doc.fill("#faf5ff");
    doc.restore();
    doc.save();
    drawRoundedRect(doc, innerLeft, cy, contentWidth, 60, 6);
    doc.lineWidth(0.5).strokeColor("#e9d5ff").stroke();
    doc.restore();

    doc.rect(innerLeft, cy, 3, 60).fill(accent);

    doc.fontSize(7).fillColor(accent).font("Helvetica-Bold").text("NOTES", innerLeft + 14, cy + 10);
    doc.fontSize(9).fillColor(bodyText).font("Helvetica").text(invoice.notes, innerLeft + 14, cy + 24, { width: contentWidth - 28 });
  }

  const footerY = 800;
  doc.moveTo(cardMargin, footerY).lineTo(pw - cardMargin, footerY).strokeColor(lineColor).lineWidth(0.5).stroke();

  doc.fontSize(8).fillColor(faintText).font("Helvetica").text(
    "Thank you for choosing AI Powered Sites. We appreciate your business.",
    0, footerY + 10,
    { align: "center", width: pw }
  );
  doc.fontSize(7).fillColor(faintText).text(
    "hello@aipoweredsites.com  |  aipoweredsites.com",
    0, footerY + 24,
    { align: "center", width: pw }
  );

  return doc;
}
