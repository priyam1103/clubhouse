const User = require("../model/user");
const { sendMail } = require("../helper/Mailer");

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
      sendMail(
        `You otp is ${user.verification.otp}`,
        user.emailId,
        "Email verification"
      );

      res.status(200).json({ newuser: false });
    } else {
      const user_ = new User({
        emailId: emailId,
        username: emailId.split("@")[0],
      });
      await user_.save();
      sendMail(
        `You otp is ${user.verification.otp}`,
        user_.emailId,
        "Email verification"
      );

      res.status(200).json({ newuser: true });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Please try again later" });
  }
};

exports.verifyUser = async function (req, res) {
  try {
    const { otp, emailId, avatar, newuser } = req.body;
    console.log(req.body);
    const user_ = await User.findOne({ emailId: emailId });
    if (user_) {
      if (user_.verification.otp == otp) {
        if (newuser) {
          user_.avatar = avatar;
          await user_.save();
        }
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

