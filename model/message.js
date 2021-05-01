const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    message: [
      {
        message: String,
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        reciever: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
        time: { type: String },
        date: { type: String },
      },
    ],
  },
  { timestamp: true }
);

const Message = mongoose.model("mss", MessageSchema);
module.exports = Message;
