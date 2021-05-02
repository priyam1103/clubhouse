const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("../service/config");
const UserSchema = new mongoose.Schema(
  {
    emailId: {
      type: String,
      required: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    verification: {
      otp: {
        type: String,
        default: () => Math.floor(100000 + Math.random() * 900000),
      },
    },
    username: {
      type: String,
    },

    socketId: {
      type: String,
      default: null,
    },
    current_chatroom: {
      type:String
    }
  },
  { timestamps: true }
);

UserSchema.method("generateAuthToken", async function () {
  const user = this;
  const token = jwt.sign(
    { id: user._id, username: user.username },
    config.JWT_SECRET
  );
  return token;
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
