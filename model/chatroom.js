const mongoose = require("mongoose");
const ChatRoomSchema = new mongoose.Schema(
  {
    createdbyemail: { type: String },
    createdbyid: { type: String },
    topic: { type: String },
    category: { type: String },
    description: { type: String },
    text_priv: { type: Boolean },
    chat_priv: { type: Boolean },
    islive: { type: Boolean, default: false },
    closed: { type: Boolean, default: false },
    priv_members: { type: Array },
    schedule_later: { type: Boolean },
    timing: { type: String },
    allowed_to_chat: { type: Array },
    raised_hand: { type: Array },
    people_in_thread: { type: Array },
    chats: { type: Array },
    highlights: { type: Array },
    highlightindex: { type: Array },
    issave: { type: Boolean, default: false },
    isdelete:{type:Boolean,default:true}
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);
module.exports = ChatRoom;
