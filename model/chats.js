const mongoose = require("mongoose");
const ChatSchema = new mongoose.Schema(
  {
        ofRoom: { type: String },
      
  },
  { timestamps: true }
);

const Chat = mongoose.model("ChatRoom", ChatSchema);
module.exports = Chat;
