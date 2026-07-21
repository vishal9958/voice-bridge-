const nodemailer = require("nodemailer");
const ErrorResponse = require("../utils/errorResponse");

const sendEmail = async (options) => {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secureConnection: false,
    secure: false,
    requireTLS: true,
    //secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      //rejectUnauthorized: false,
      ciphers: "SSLv3",
    },
  });

  // send mail with defined transport object
  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    cc: options.cc,
    subject: options.subject,
    html: options.message,
    attachments: options.attachments,
  };

  const info = await transporter.sendMail(message);

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
};

module.exports = sendEmail;
