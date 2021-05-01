const User = require("../model/user");

exports.getUsers = async function (req, res) {
  try {
    const user = res.locals._id;
    const users = await User.find({ _id: { $ne: user } });
    if (users) {
      res.status(200).json({ users });
    } else {
      res.status(401).json({ message: "No users" });
    }
  } catch (err) {
    res.status(400).json({ message: "Please try again later" });
  }
};
