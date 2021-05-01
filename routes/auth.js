const express = require("express");
const route = express.Router();
const {
  sendOtp,
  verifyUser,
  me,
  updateUserimage,
} = require("../handlers/auth");
const auth = require("../middleware/auth");
route.post("/sendotp", sendOtp);
route.post("/verify", verifyUser);
route.get("/me", auth, me);
route.post("/updateimage", auth, updateUserimage);
module.exports = route;
