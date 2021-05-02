const config = require("../service/config");
const { SMTPClient } = require("emailjs");

const client = new SMTPClient({
  user: config.EMAILID,
  password: config.PASS,
  host: "smtp.gmail.com",
  ssl: true,
});

exports.sendMail = async function (body, to, subject) {
  client.send(
    {
      text: body,
      from: "Clubhouse",
      to: to,
      subject: subject,
    },
    (err, message) => {
      console.log(err || message);
    }
  );
};
