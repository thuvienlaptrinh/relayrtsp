const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");

const server = https.createServer({ key, cert }, app);

const io = require("socket.io")(server);
const rtsp = require("rtsp-ffmpeg");


app.use(express.static("public"));
server.listen(443, function () {
  console.log("Listening https on port:443");
});

const CameraData = JSON.parse(
  fs.readFileSync(__dirname + "/cameralist.json", "utf8")
);

var cams = CameraData.map(function (T, i) {
  var stream = new rtsp.FFMpeg({
    input: `rtsp://${T.username}:${T.pwd}@${T.url}`,
    resolution: "1280x720",
    quality: 4,
    camid: T.id,
    rate: 5
  });
  stream.camid = T.id;
  stream.on("start", function () {
    console.log(
      new Date(Date.now()).toString() + ": Stream from " + T.id + " started"
    );
  });
  stream.on("stop", function () {
    console.log(
      new Date(Date.now()).toString() + ": Stream from " + T.id + " stopped"
    );
  });
  return stream;
});

cams.forEach(function (camStream, i) {
  var ns = io.of("/cam" + i);
  ns.on("connection", function (wsocket) {
    console.log("connected to camera " + camStream.camid);
    var pipeStream = function (data) {
      wsocket.emit("data", data);
    };
    camStream.on("data", pipeStream);

    wsocket.on("disconnect", function () {
      console.log("disconnected from camera" + camStream.camid);
      camStream.removeListener("data", pipeStream);
    });
  });
});

io.on("connection", function (socket) {
  socket.emit("start", cams.length);
});

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index-canvas.html");
});
