const bodyParser = require("body-parser");
module.exports = function (app) {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use("/api/user", require("../routes/auth"));
  app.use("/api/chat", require("../routes/chats"));
  app.use("/api/users", require("../routes/user"));

};
