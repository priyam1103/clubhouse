const express = require("express");
const route = express.Router();
const {
  getThread,
  createChatRoom,
  getChatRoom,
  mychatrooms,
  getUpcomingChatrooms,
  deleteThread,
} = require("../handlers/chats");
const auth = require("../middleware/auth");
route.get("/getthread/:tid", auth, getThread);
route.delete("/deletethread/:tid", auth, deleteThread);
route.post("/createchatroom", auth, createChatRoom);
route.get("/getchatrooms", auth, getChatRoom);
route.get("/mychatrooms", auth, mychatrooms);
route.get("/getupcomingchatrooms", auth, getUpcomingChatrooms);
module.exports = route;
