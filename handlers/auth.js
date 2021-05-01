const User = require("../model/user");
const config = require("../service/config");
const { SMTPClient } = require("emailjs");
const AWS = require("aws-sdk");
const client = new SMTPClient({
  user: "priyampoddar89@gmail.com",
  password: "Dusky@7035",
  host: "smtp.gmail.com",
  ssl: true,
});
const s3 = new AWS.S3({
  accessKeyId: config.ACCESSKEY,
  secretAccessKey: config.SECRETACCESS,
  region: "us-east-2",
});
exports.me = async function (req, res) {
  try {
    const id = res.locals._id;
    const user_ = await User.findOne({ _id: id });
    if (!user_) {
      res.status(401).json({ message: "Invalid session " });
    } else {
      const token = await user_.generateAuthToken();
      res.status(200).json({ user_, token });
    }
  } catch (err) {}
};
exports.sendOtp = async function (req, res) {
  try {
    const { emailId } = req.body;

    console.log(emailId);
    const user = await User.findOne({ emailId: emailId });
    if (user) {
      client.send(
        {
          text: `You otp is ${user.verification.otp}`,
          from: "Mob chat",
          to: user.emailId,
          subject: "testing emailjs",
        },
        (err, message) => {
          console.log(err || message);
        }
      );
      res.status(200).json({});
    } else {
      console.log("cdmkl")
      const user_ = new User({
        emailId: emailId,
        username: emailId.split("@")[0],
      });
      await user_.save();
      client.send(
        {
          text: `You otp is ${user_.verification.otp}`,
          from: "Mob chat",
          to: user_.emailId,
          subject: "testing emailjs",
        },
        (err, message) => {
          console.log(err || message);
        }
      );
      res.status(200).json({});
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Please try again later" });
  }
};

exports.verifyUser = async function (req, res) {
  try {
    const { otp, emailId } = req.body;
    const user_ = await User.findOne({ emailId: emailId });
    if (user_) {
      if (user_.verification.otp == otp) {
        const token = await user_.generateAuthToken();
        res.status(200).json({ token, user_, message: "User verified" });
      } else {
        res.status(401).json({ message: "Invalid otp" });
      }
    } else {
      res.status(400).json({ message: "user does not exists" });
    }
  } catch (err) {}
};

exports.updateUserimage = async function (req, res) {
  try {
    const file = req.files;
    const id = res.locals._id;
    const user = await User.findOne({ _id: id });
    if (!user) {
      res.status(401).json({ message: "Invalid session " });
    } else {
      console.log(id)

      var params = {
        Bucket: "duskygram",
        Key: id + "-" + Math.random().toFixed(2) * 10000000,
        Body: file.file.data,
        ContentType: file.file.mimetype,
        ACL: "public-read",
      };
      s3.upload(params, async function (err, data) {
        if (err) {
          console.log(err);
        } else {
          user.image = data.Location;
          await user.save();
          res.status(200).json({ user });
        }
      });
    }
  } catch (err) {
    console.log(err)
  }
};
