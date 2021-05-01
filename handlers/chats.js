const User = require("../model/user");
const ChatRoom = require("../model/chatroom");

exports.createChatRoom = async function (req, res) {
  try {
    const id = res.locals._id;
    const user = await User.findById(id);
    if (user) {
      const chatroom = new ChatRoom({
        ...req.body,
        createdbyemail: user.emailId,
        createdbyid: user._id,
        islive: req.body.schedule_later ? false : true,
      });
      await chatroom.save();
      res.status(200).json({ chatroom });
    } else {
      res.status(401).json({ message: "No users" });
    }
  } catch (err) {}
};

exports.getThread = async function (req, res) {
  try {
    const tid = req.params.tid;
    const thread = await ChatRoom.findById(tid);
    if (thread) {
      res.status(200).json({ thread: thread });
    } else {
      res.status(400).json({ message: "Error" });
    }
  } catch (err) {
    res.status(400).json({ message: "Error" });
  }
};

exports.getChatRoom = async function (req, res) {
  try {
    const chatrooms = await ChatRoom.find();
    const upcomingchatrooms = await ChatRoom.find({ schedule_later: true });
    const savedchatrooms = await ChatRoom.find({ closed: true });
    const livechatrooms = await ChatRoom.find({ islive: true });

    res
      .status(200)
      .json({ chatrooms, upcomingchatrooms, savedchatrooms, livechatrooms });
  } catch (err) {}
};
exports.mychatrooms = async function (req, res) {
  try {
    const id = res.locals._id;
    const user = await User.findById(id);
    if (user) {
      const chatrooms = await ChatRoom.find({ createdbyid: id });
      res.status(200).json({ chatrooms });
    }
  } catch (err) {}
};

exports.getUpcomingChatrooms = async function (req, res) {
  try {
    const chatrooms = await ChatRoom.find({ schedule_later: true });
    res.status(200).json({ chatrooms });
  } catch (err) {}
};
exports.deleteThread = async function (req,res) {
  try {
    const id = res.locals._id;
    const user = await User.findById(id);
    const tid = req.params;
    console.log(tid)
    if (user) {
      await ChatRoom.findByIdAndDelete({ _id: tid.tid });

      const chatrooms = await ChatRoom.find({ createdbyid: id });
      res.status(200).json({ chatrooms });
    }

  } catch (err) {
    console.log(err)
  }
}