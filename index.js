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
  "* * * * * *",
  async function () {
    console.log("cdkl");
    var date = new Date();
    console.log(date.toUTCString())
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
  "America/Los_Angeles"
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
            const people_in_thread = chatroom.people_in_thread.concat({
              id: socket.user.id,
              name: socket.user.username,
            });
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
            callback({ auth: true, thread: thread });
            socket.join(data.tid);
            io.to(chatroom._id).emit("threadupdate", { thread: thread });
          } else {
            callback({ auth: false });
          }
        } else {
          const people_in_thread = chatroom.people_in_thread.concat({
            id: socket.user.id,
            name: socket.user.username,
            typing: false,
            raisedhand: false,
          });
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
          callback({ auth: true, thread: thread });
          socket.join(data.tid);
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
        callback({ thread: thread });
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
        callback({ thread: thread });
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("sendmessage", async (data) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      if (chatroom) {
        if (data.type === "normal") {
          var chat = {
            type: data.type,
            body: data.body,
            username: socket.user.username,
            image: socket.user.image,
            emojies: [],
          };
        } else if (data.type === "reply") {
          var chat = {
            type: data.type,
            body: data.body,
            username: socket.user.username,
            image: socket.user.image,
            emojies: [],
            ofuser: data.ofuser,
            ofuserimage: data.ofuserimage,
            ofusercomment: data.ofusercomment,
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
        io.to(chatroom._id).emit("threadupdate", { thread: thread });
      }
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("addemoji", async (data) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const chats = chatroom.chats;
      console.log(data);
      if (chatroom) {
        var chat = chats[data.index];
        console.log(chat);
        var i = false;
        for (var w = 0; w < chat.emojies.length; w++) {
          if (chat.emojies[w].unified === data.emoji.unified) {
            i = true;
            chat.emojies[w].count = chat.emojies[w].count + 1;
            break;
          }
        }
        if (!i) {
          var em = {
            ...data.emoji,
            count: 1,
          };
          console.log(em, "cdnkdj");
          var emc = chat.emoji.concat(em);
          chat.emoji = emc;
          console.log(chat);
        }
        console.log(chat);
        chats[data.index] = chat;
      }
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        { $set: { chats: chats } },
        { new: true }
      );
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("addtohighlights", async (data) => {
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("addmemberstoprivatechat", async (data) => {
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("startedtyping", async (data) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      const index = getIndexInThread(chatroom.people_in_thread, socket.user.id);
      console.log(index);
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("stoppedtyping", async (data) => {
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("makeadmin", async (data) => {
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("savethread", async (data) => {
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
      io.to(chatroom._id).emit("threadupdate", { thread: thread });
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("savethreadandclose", async (data,callback) => {
    try {
      const thread = await ChatRoom.findByIdAndUpdate(
        {
          _id: data.tid,
        },
        {
          $set: {
            issave: true,
            closed: true,
            islive:false
          },
        },
        { new: true }
      );
      
      io.to(thread._id).emit("closethread");
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("deletethreadandclose", async (data,callback) => {
    try {
      const chatroom = await ChatRoom.findOne({ _id: data.tid });
      await ChatRoom.findByIdAndDelete({
        _id: data.tid,
      });
      io.to(chatroom._id).emit("closethread");
    } catch (err) {
      console.log(err);
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

      await chatroom.people_in_thread.splice(
        getIndex(chatroom.people_in_thread, { id: socket.user.id }),
        1
      );
      if (chatroom.createdbyid == user._id) {
        if (chatroom.people_in_thread.length > 0) {
          const toadmin = await User.findOne({
            _id: chatroom.people_in_thread[0].id,
          });
          console.log(toadmin.emailId, "todadmin");
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
            //  console.log(thread_, "vjkfbdjb")

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
                  islive:false
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
