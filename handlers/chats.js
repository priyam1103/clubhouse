const User = require("../model/user");
const ChatRoom = require("../model/chatroom");
const { sendMail } = require("../helper/Mailer");

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
      if (req.body.chat_priv) {
        for (var i = 0; i < req.body.priv_members.length; i++) {
          sendMail(
            `Hi, ${user.username} has invited you to join a thread having a topic ${req.body.topic}
          Joining link - https://threadchat.vercel.app/thread/${chatroom._id}`,
            req.body.priv_members[i],
            "Thread Invitation"
          );
        }
      }
      await chatroom.save();
      res.status(200).json({ chatroom });
    } else {
      res.status(401).json({ message: "No users" });
    }
  } catch (err) {
    res.status(400).json({ message: "error" });
  }
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
    const chatrooms = await ChatRoom.find({ chat_priv: false });
    const upcomingchatrooms = await ChatRoom.find({
      $and: [{ schedule_later: true }, { chat_priv: false }],
    });
    const savedchatrooms = await ChatRoom.find({
      $and: [{ closed: true }, { chat_priv: false }],
    });
    const livechatrooms = await ChatRoom.find({
      $and: [{ islive: true }, { chat_priv: false }],
    });

    res
      .status(200)
      .json({ chatrooms, upcomingchatrooms, savedchatrooms, livechatrooms });
  } catch (err) {
    res.status(400).json({ message: "error" });
  }
};
exports.mychatrooms = async function (req, res) {
  try {
    const id = res.locals._id;
    const user = await User.findById(id);
    if (user) {
      const chatrooms = await ChatRoom.find({ createdbyid: id });

      const upcomingchatrooms = await ChatRoom.find({
        $and: [{ schedule_later: true }, { createdbyid: id }],
      });
      const savedchatrooms = await ChatRoom.find({
        $and: [{ closed: true }, { createdbyid: id }],
      });
      const livechatrooms = await ChatRoom.find({
        $and: [{ islive: true }, { createdbyid: id }],
      });

      const priv_chats = await ChatRoom.find({ chat_priv: true });
      const privatechatrooms = [];
      for (var i = 0; i < priv_chats.length; i++) {
        if (priv_chats[i].priv_members.includes(user.emailId)) {
          privatechatrooms.push(priv_chats[i]);
        }
      }

      res.status(200).json({
        chatrooms,
        privatechatrooms,
        livechatrooms,
        upcomingchatrooms,
        savedchatrooms,
      });
    }
  } catch (err) {
    res.status(400).json({ message: "error" });
  }
};

exports.getUpcomingChatrooms = async function (req, res) {
  try {
    const chatrooms = await ChatRoom.find({ schedule_later: true });
    res.status(200).json({ chatrooms });
  } catch (err) {}
};
exports.deleteThread = async function (req, res) {
  try {
    const id = res.locals._id;
    const user = await User.findById(id);
    const tid = req.params;
    console.log(tid);
    if (user) {
      await ChatRoom.findByIdAndDelete({ _id: tid.tid });

      const chatrooms = await ChatRoom.find({ createdbyid: id });
      res.status(200).json({ chatrooms });
    }
  } catch (err) {
    res.status(400).json({ message: "error" });
  }
};
