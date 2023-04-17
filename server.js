const HTTP_PORT = 80;
const HTTPS_PORT = 443;
var https = require("https");
var http = require("http");

const express = require("express");
const app = express();

const cors = require("cors");
const corsOptions = {
  origin: "*",
  methods: "GET,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(
  express.static("public", {
    dotfiles: "allow",
  })
);

const HTTP_SERVER = http.createServer(app).listen(HTTP_PORT, function () {
  console.log(`Listening on localhost:${HTTP_PORT}`);
});

app.get("/", function (req, res) {
  res.send("Hello world");
});
