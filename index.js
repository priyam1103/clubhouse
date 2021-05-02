const express = require("express");
var cors = require("cors");
var CronJob = require("cron").CronJob;
const app = express();
const http = require("http");

const User = require("./model/user");
const fileUpload = require("express-fileupload");
app.use(fileUpload());
const config = require("./service/config");
const { connectDb } = require("./service/db");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.use(cors());
const ChatRoom = require("./model/chatroom");
require("./service/routes")(app);
const server = http.createServer(app);
const io = require("socket.io")(server);
const { sendMail } = require("./helper/Mailer");

connectDb().then(() => {
  server.listen(config.PORT, () => {
    console.log(`Connected to port ${config.PORT}`);
  });
});

const jwt = require("jsonwebtoken");

function getIndex(arr, val) {
  var index;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === val.id) {
      index = i;
      break;
    }
  }
  return index;
}
function getIndexInThread(arr, val) {
  var index;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id === val) {
      index = i;
      break;
    }
  }
  return index;
}
var job = new CronJob(
  " */1 * * * *",
  async function () {
    console.log("cdkl");
    var date = new Date();
    console.log(date.toUTCString());
    const chatrooms = await ChatRoom.find();
    for (var i = 0; i < chatrooms.length; i++) {
      if (chatrooms[i].schedule_later) {
        if (Date.parse(date) > Date.parse(chatrooms[i].timing)) {
          await ChatRoom.findByIdAndUpdate(
            {
              _id: chatrooms[i]._id,
            },
            { $set: { schedule_later: false, islive: true } }
          );
        }
      }
    }
  },
  null,
  true,
  "Asia/Kolkata"
);
job.start();
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    const decoded = await jwt.verify(token, config.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });
    console.log(user);
    if (!user) {
    } else {
      socket.user = user;
      next();
    }
  } catch (err) {
    console.log(err);
  }
});

io.on("connection", async (socket) => {
  const user = await User.findOneAndUpdate(
    { _id: socket.user._id },
    { $set: { socketId: socket.id } },
    { upsert: true }
  );
  socket.user = user;
  console.log("connected");

  socket.on("checkid", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom) {
        if (chatroom.chat_priv) {
          if (chatroom.priv_members.includes(socket.user.emailId)) {
            var people_in_thread = chatroom.people_in_thread;
            if (getIndexInThread(chatroom.people_in_thread, socket.user._id) != undefined) {
            } else {
              people_in_thread = chatroom.people_in_thread.concat({
                id: socket.user._id,
                name: socket.user.username,
                avatar: socket.user.avatar,
                typing: false,
                raisedhand: false,
              });
            }
              const thread = await ChatRoom.findByIdAndUpdate(
                {
                  _id: data.tid,
                },
                { people_in_thread: people_in_thread },
                { new: true }
              );
              await User.findOneAndUpdate(
                { _id: socket.user._id },
                { $set: { current_chatroom: data.tid } },
                { upsert: true }
              );
              callback({ auth: true, thread: thread, success: true });
              socket.join(data.tid);
              io.to(chatroom._id).emit(
                "message",
                `${socket.user.username} joined the thread`
              );

              io.to(chatroom._id).emit("threadupdate", { thread: thread });
            
          } else {
            callback({ auth: false });
          }
        } else {
          var people_in_thread = chatroom.people_in_thread;

          if (getIndexInThread(chatroom.people_in_thread, socket.user._id) != undefined) {
          } else {
            people_in_thread = chatroom.people_in_thread.concat({
              id: socket.user.id,
              name: socket.user.username,
              typing: false,
              raisedhand: false,
              avatar: socket.user.avatar,
            });
          }
            console.log(people_in_thread);
            const thread = await ChatRoom.findByIdAndUpdate(
              {
                _id: data.tid,
              },
              { people_in_thread: people_in_thread },
              { new: true }
            );
            await User.findOneAndUpdate(
              { _id: socket.user._id },
              { $set: { current_chatroom: data.tid } },
              { upsert: true }
            );
            socket.join(data.tid);
            callback({ auth: true, thread: thread });
            io.to(chatroom._id).emit(
              "message",
              `${socket.user.username} joined the thread`
            );

            io.to(chatroom._id).emit("threadupdate", { thread: thread });
          }
        
      } else {
        callback({ auth: false });
      }
    } catch (err) {
      callback({ auth: false });
    }
  });
  socket.on("raiseHand", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom) {
        const raised_hand = chatroom.raised_hand.concat({
          id: socket.user.id,
          name: socket.user.username,
        });

        const thread = await ChatRoom.findByIdAndUpdate(
          {
            _id: data.tid,
          },
          { raised_hand: raised_hand },
          { new: true }
        );
        callback({ thread: thread, success: true });
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
      callback({ error: true });
    } catch (err) {
      console.log(err);
      callback({ error: true });
    }
  });

  socket.on("allowtotext", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom) {
        await chatroom.raised_hand.splice(
          getIndex(chatroom.raised_hand, data.item),
          1
        );
        const s = chatroom.raised_hand;
        const allowed_to_chat = await chatroom.allowed_to_chat.concat({
          id: data.item.id,
          name: data.item.username,
        });
        const thread = await ChatRoom.findByIdAndUpdate(
          {
            _id: data.tid,
          },
          { $set: { allowed_to_chat: allowed_to_chat, raised_hand: s } },
          { new: true }
        );
        callback({ thread: thread, success: true });
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("sendmessage", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom) {
        if (data.type === "normal") {
          var chat = {
            type: data.type,
            body: data.body,
            username: socket.user.username,
            image: socket.user.avatar,
            timing: new Date(),
          };
        } else if (data.type === "reply") {
          var chat = {
            type: data.type,
            body: data.body,
            username: socket.user.username,
            image: socket.user.avatar,
            timing: new Date(),
            ofuser: data.ofuser,
            ofuserimage: data.ofuserimage,
            ofusercomment: data.ofusercomment,
            ofusertiming: data.timing,
          };
        }
        const chats = chatroom.chats.concat(chat);
        const thread = await ChatRoom.findByIdAndUpdate(
          {
            _id: data.tid,
          },
          { $set: { chats: chats } },
          { new: true }
        );
        callback({ success: true });
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
    } catch (err) {
      callback({ success: false });
    }
  });

  socket.on("addtohighlights", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      console.log(chatroom);
      const h = await chatroom.highlights.concat(data.comment);
      const hi = await chatroom.highlightindex.concat(data.index);
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            highlights: h,
            highlightindex: hi,
          },
        },
        { new: true }
      );
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("addmemberstoprivatechat", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });

      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            priv_members: chatroom.priv_members.concat(...data.members),
          },
        },
        { new: true }
      );
      for (var i = 0; i < data.members.length; i++) {
        sendMail(
          `Hi, ${socket.user.username} has invited you to join a thread having a topic ${chatroom.topic}
        Joining link - http://localhost:3000/thread/${chatroom._id}`,
          data.members[i],
          "Thread invitation"
        );
      }
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });

  socket.on("startedtyping", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const index = getIndexInThread(chatroom.people_in_thread, socket.user.id);
      var pit = chatroom.people_in_thread[index];
      pit.typing = true;
      chatroom.people_in_thread[index] = pit;
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            people_in_thread: chatroom.people_in_thread,
          },
        },
        { new: true }
      );
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("stoppedtyping", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const index = getIndexInThread(chatroom.people_in_thread, socket.user.id);
      var pit = chatroom.people_in_thread[index];
      pit.typing = false;
      chatroom.people_in_thread[index] = pit;
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            people_in_thread: chatroom.people_in_thread,
          },
        },
        { new: true }
      );
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });

  socket.on("makeadmin", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const user = await User.findOne({ _id: data.uid });
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            createdbyemail: user.emailId,
            createdbyid: user._id,
          },
        },
        { new: true }
      );
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("savethread", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            issave: true,
            isdelete: false,
          },
        },
        { new: true }
      );
      callback({ success: true });
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("savethreadandclose", async (data, callback) => {
    try {
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            issave: true,
            closed: true,
            islive: false,
          },
        },
        { new: true }
      );
      callback({ success: true });

      io.to(thread._id).emit("closethread", {
        message:
          "This thread is saved and closed by the admin and you will be redirected to home page in 5 seconds",
      });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("deletethreadandclose", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      await ChatRoom.findByIdAndDelete({
        _id: data.tid,
      });
      io.to(data.tid).emit("closethread", {
        message:
          "This thread is deleted and closed by the admin and you will be redirected to home page in 5 seconds",
      });
      callback({ success: true });
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("updatethreadsettings", async (data, callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom.text_priv !== data.text_priv) {
        if (!data.text_priv) {
          var thread = await ChatRoom.findOneAndUpdate(
            {
              _id: chatroom._id,
            },
            { $set: { text_priv: false, allowed_to_chat: [] } },
            { new: true }
          );
          io.to(chatroom._id).emit("threadupdate", { thread: thread });
          callback({ success: true });
        } else {
          console.log("cdk");
          var thread_ = await ChatRoom.findOneAndUpdate(
            {
              _id: chatroom._id,
            },
            { $set: { text_priv: true, allowed_to_chat: [], raised_hand: [] } },
            { new: true }
          );
          io.to(chatroom._id).emit("threadupdate", { thread: thread_ });
          callback({ success: true });
        }
      }
      if (chatroom.chat_priv !== data.chat_priv) {
        if (data.chat_priv) {
          var allowed = [];
          for (var i = 0; i < chatroom.people_in_thread.length; i++) {
            const user_ = await User.findById(chatroom.people_in_thread[i].id);
            allowed.push(user_.emailId);
          }
          var thread__ = await ChatRoom.findOneAndUpdate(
            {
              _id: chatroom._id,
            },
            { $set: { chat_priv: true, priv_members: allowed } },
            { new: true }
          );
          io.to(chatroom._id).emit("threadupdate", { thread: thread__ });
          callback({ success: true });
        } else {
          var thread___ = await ChatRoom.findOneAndUpdate(
            {
              _id: chatroom._id,
            },
            { $set: { chat_priv: false, priv_members: [] } },
            { new: true }
          );
          io.to(chatroom._id).emit("threadupdate", { thread: thread___ });
          callback({ success: true });
        }
      }
    } catch (err) {
      callback({ success: false });
    }
  });
  socket.on("disconnect", async (data) => {
    try {
      const user = await User.findOneAndUpdate(
        { _id: socket.user.id },
        { $set: { socketId: socket.id } },
        { upsert: true }
      );

      const chatroom = await ChatRoom.findOne({ _id: user.current_chatroom });

      socket.leave(user.current_chatroom);
      if (chatroom.people_in_thread) {
        await chatroom.people_in_thread.splice(
          getIndex(chatroom.people_in_thread, { id: socket.user.id }),
          1
        );
      }
      if (chatroom.createdbyid == user._id) {
        if (chatroom.people_in_thread.length > 0) {
          const toadmin = await User.findOne({
            _id: chatroom.people_in_thread[0].id,
          });
          if (toadmin) {
            const thread_ = await ChatRoom.findByIdAndUpdate(
              {
                _id: user.current_chatroom,
              },
              {
                $set: {
                  people_in_thread: chatroom.people_in_thread,
                  createdbyemail: toadmin.emailId,
                  createdbyid: toadmin._id,
                },
              },
              { new: true }
            );
            io.to(chatroom._id).emit("threadupdate", { thread: thread_ });
          }
        } else {
          if (!chatroom.issave) {
            await ChatRoom.findByIdAndDelete({
              _id: user.current_chatroom,
            });
            io.to(chatroom._id).emit("closeredirect");
          } else {
            const thread___ = await ChatRoom.findByIdAndUpdate(
              {
                _id: user.current_chatroom,
              },
              {
                $set: {
                  people_in_thread: chatroom.people_in_thread,
                  closed: true,
                  islive: false,
                },
              },
              { new: true }
            );
            io.to(chatroom._id).emit("threadupdate", { thread: thread___ });
          }
        }
      } else {
        const thread = await ChatRoom.findByIdAndUpdate(
          {
            _id: user.current_chatroom,
          },
          { $set: { people_in_thread: chatroom.people_in_thread } },
          { new: true }
        );
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
    } catch (err) {
      console.log(err);
    }
  });
});
