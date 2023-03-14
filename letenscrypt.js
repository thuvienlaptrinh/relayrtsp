const express = require("express");
const app = express();
app.use(express.static("public"), {
  dotfiles: "allow",
});
const HTTP_PORT = 80;

const HTTP_SERVER = http.createServer(app).listen(HTTP_PORT, function () {
  console.log(`Listening on localhost:${HTTP_PORT}`);
});
