const nodemailer = require("nodemailer");
const { EmailService, senderEmail, senderPassword } = require("../../../config/vars");

const transport = nodemailer.createTransport({
  service: EmailService,
  auth: {
    user: senderEmail,
    pass: senderPassword,
  },
});

exports.sendEmail = async (email = "", subject = "", msgHeading = '', content = null) => {
  try {
    if (email !== "") {
      transport.sendMail({
        // from: {
        //   name: "Party Lux",   // Sender name
        //   address: senderEmail, // Sender email address
        // },
        from : "Party Lux",
        to: email, // Recipient's email address
        subject: subject,
        html: `
        <h2>${msgHeading}</h2>
        <p>Your verification code</p>
        <h2 style="background: #00466a;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;"> ${content?.otp}</h2>
        <p>The verification code will be valid for 30 minutes. Please do not share this code with anyone.</p>
        <i>This is an automated message, please do not reply.</i>
         <p style="font-size:0.9em;">Regards,<br /> <b>Party Lux</b></p>
        <hr style="border:none;border-top:1px solid #eee"/>
      `
        // html: `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2"><div style="margin:50px auto;width:70%;padding:20px 0"><div style="border-bottom:1px solid #eee"><a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">Party Lux</a></div><p style="font-size:1.1em">Hi,</p><p>
        // ${bodyMsg}<br>
        // </p><h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;"> ${content?.otp}</h2><p style="font-size:0.9em;">Regards,<br />Party Lux</p><hr style="border:none;border-top:1px solid #eee" /></div></div>`
      }).then(info => {
        console.log('Email sent:', info.response);
      }).catch(error => {
        console.error('Error sending email:', error);
      });
    }
  } catch (e) {
    console.error('Error:', e);
  }
};
