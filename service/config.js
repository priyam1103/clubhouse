const dotenv = require("dotenv").config();

const { parsed } = dotenv;

const {
  MONGODB_URI,
  PORT,
  JWT_SECRET,
  EMAIL,
  PASS,
  ACCESSKEY,
  SECRETACCESS
} = process.env;

const config = {
  MONGODB_URI: MONGODB_URI,
  PORT: PORT,
  JWT_SECRET: JWT_SECRET,
  ACCESSKEY:ACCESSKEY,
  SECRETACCESS: SECRETACCESS,
  EMAILID: EMAIL,
  PASS: PASS,
};
module.exports = config;
