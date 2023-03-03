const https = require("https");
const express = require("express");
const app = express();
const { Server } = require("socket.io");

const rtsp = require("rtsp-ffmpeg");
const fs = require("fs");
const cors = require("cors");
const corsOptions = {
  origin: "*",
  methods: "GET,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(express.static("public"));

const key = fs.readFileSync("./key.pem", "utf8");
const cert = fs.readFileSync("./cert.pem", "utf8");
const server = https.createServer(
  { key, cert, requestCert: false, rejectUnauthorized: false },
  app
);

const io = new Server({
  cors: { origin: "*", methods: ["GET", "POST"] },
}).listen(server);

server.listen(443, function () {
  console.log("Listening on localhost:443");
});

const CameraData = JSON.parse(
  fs.readFileSync(__dirname + "/cameralist.json", "utf8")
);

var cams = CameraData.map(function (T, i) {
  var stream = new rtsp.FFMpeg({
    input: `rtsp://${T.username}:${T.pwd}@${T.url}/cam/realmonitor?channel=1&subtype=1`,
    resolution: "704x396",
    quality: 4,
    camid: T.id,
    rate: 4,
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
  var ns = io.of("/stream/" + camStream.camid);
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
