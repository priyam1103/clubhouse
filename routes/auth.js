const express = require("express");
const route = express.Router();
const { sendOtp, verifyUser, me } = require("../handlers/auth");
const auth = require("../middleware/auth");
route.post("/sendotp", sendOtp);
route.post("/verify", verifyUser);
route.get("/me", auth, me);
module.exports = route;
