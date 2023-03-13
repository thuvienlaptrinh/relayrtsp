var https = require("https");
var http = require("http");

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
const options = {
  key: fs.readFileSync("./key.pem", "utf8"),
  cert: fs.readFileSync("./cert.pem", "utf8"),
  requestCert: false,
  rejectUnauthorized: false,
};
app.use(cors(corsOptions));
app.use(express.static("public"));

const HTTP_SERVER = http.createServer(app).listen(7000, function () {
  console.log("Listening on localhost:7000");
});
const HTTPS_SERVER = https.createServer(options, app).listen(7443, function () {
  console.log("Listening on localhost:7443");
});

// const io = require("socket.io")(server);
const io = new Server({
  cors: { origin: "*", methods: ["GET", "POST"] },
}).listen(HTTP_SERVER);

const iohttps = new Server({
  cors: { origin: "*", methods: ["GET", "POST"] },
}).listen(HTTPS_SERVER);

const CameraData = JSON.parse(
  fs.readFileSync(__dirname + "/cameralist.json", "utf8")
);

var cams = CameraData.map(function (T, i) {
  var stream = new rtsp.FFMpeg({
    input: `rtsp://${T.username}:${T.pwd}@${T.url}/cam/realmonitor?channel=1&subtype=1`,
    resolution: "704x396",
    quality: 4,
    camid: T.id,
    rate: 5,
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
    console.log(
      new Date(Date.now()).toString() +
        ": connected to camera " +
        camStream.camid + " through http port"
    );
    var pipeStream = function (data) {
      wsocket.emit("data", data);
    };
    camStream.on("data", pipeStream);

    wsocket.on("disconnect", function () {
      console.log(
        new Date(Date.now()).toString() +
          ": disconnected from camera" +
          camStream.camid + " through http port"
      );
      camStream.removeListener("data", pipeStream);
    });
  });

  var ns_https = iohttps.of("/stream/" + camStream.camid);
  ns_https.on("connection", function (wsocket) {
    console.log(
      new Date(Date.now()).toString() +
        ": connected to camera " +
        camStream.camid + " through https port"
    );
    var pipeStream = function (data) {
      wsocket.emit("data", data);
    };
    camStream.on("data", pipeStream);

    wsocket.on("disconnect", function () {
      console.log(
        new Date(Date.now()).toString() +
          ": disconnected from camera" +
          camStream.camid + " through https port"
      );
      camStream.removeListener("data", pipeStream);
    });
  });
});

const socketHandler = (socket) => {
  socket.emit("start", cams.length);
};

io.on("connection", socketHandler);
iohttps.on("connection", socketHandler);



app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index-canvas.html");
});
