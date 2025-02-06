import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config(); 

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.MAILID,
    pass: process.env.PASSWORD, 
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  try {
    const mailOptions = {
      from: process.env.MAILID, 
      to,
      subject, 
      text, 
      html, 
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.response);
  } catch (error) {
    console.error("❌ Error while sending email:", error);
    throw new Error("Failed to send email");
  }
}

export { sendEmail };
