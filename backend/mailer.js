const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async ({ to, name, parkingName, vehicleNumber, inTime, outTime, duration, totalCost }) => {
  const mailOptions = {
    from: `"Smart Parking" <${process.env.EMAIL_USER}>`,
    to,
    subject: "🚗 Booking Confirmed — Smart Parking",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; background: #f0f4ff; padding: 32px; border-radius: 16px;">
        <h2 style="color: #2563eb;">Booking Confirmed! 🎉</h2>
        <p>Hi <strong>${name}</strong>, your parking slot has been booked successfully.</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding:8px; color:#64748b;">📍 Location</td><td style="padding:8px; font-weight:600;">${parkingName}</td></tr>
          <tr style="background:#e0e7ff"><td style="padding:8px; color:#64748b;">🚗 Vehicle</td><td style="padding:8px; font-weight:600;">${vehicleNumber}</td></tr>
          <tr><td style="padding:8px; color:#64748b;">🕐 In Time</td><td style="padding:8px;">${new Date(inTime).toLocaleString("en-IN")}</td></tr>
          <tr style="background:#e0e7ff"><td style="padding:8px; color:#64748b;">🕐 Out Time</td><td style="padding:8px;">${new Date(outTime).toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding:8px; color:#64748b;">⏱️ Duration</td><td style="padding:8px;">${duration} hour(s)</td></tr>
          <tr style="background:#dcfce7"><td style="padding:8px; color:#16a34a; font-weight:700;">💰 Total Cost</td><td style="padding:8px; font-weight:700; color:#16a34a;">₹${totalCost}</td></tr>
        </table>
        <p style="color:#64748b; font-size:0.85rem;">Thank you for using Smart Parking. Drive safe! 🚦</p>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("📧 Email send error:", err.message);
  }
};

/**
 * Send contact form acknowledgement
 */
const sendContactAck = async ({ to, name }) => {
  const mailOptions = {
    from: `"Smart Parking Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: "✅ We received your message — Smart Parking",
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width:600px; margin:auto; background:#f0f4ff; padding:32px; border-radius:16px;">
        <h2 style="color:#2563eb;">Thanks for reaching out, ${name}! 👋</h2>
        <p>We've received your message and our support team will get back to you within 24 hours.</p>
        <p style="color:#64748b; font-size:0.85rem;">— Smart Parking Support Team</p>
      </div>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("📧 Email send error:", err.message);
  }
};

module.exports = { sendBookingConfirmation, sendContactAck };
