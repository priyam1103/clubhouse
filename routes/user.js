const express = require("express");
const route = express.Router();
const { getUsers } = require("../handlers/users");
const auth = require("../middleware/auth");

route.get("/getUser", auth, getUsers);

module.exports = route;
