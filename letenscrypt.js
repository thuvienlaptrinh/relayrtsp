const express = require("express");
var http = require("http");
const app = express();
app.use(
  express.static("public", {
    dotfiles: "allow",
  })
);
const HTTP_PORT = 80;

const HTTP_SERVER = http.createServer(app).listen(HTTP_PORT, function () {
  console.log(`Listening on localhost:${HTTP_PORT}`);
});

app.get("/*", function (req, res) {
  res.send("Xin Chao tu server");
});
