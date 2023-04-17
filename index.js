const HTTP_PORT = 7000;
const HTTPS_PORT = 7443;
var https = require("https");
var http = require("http");

const express = require("express");
const app = express();
const { Server } = require("socket.io");

const rtsp = require("./ffmpeg-lib");
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
app.use(
  express.static("public", {
    dotfiles: "allow",
  })
);

const HTTP_SERVER = http.createServer(app).listen(HTTP_PORT, function () {
  console.log(`Listening on localhost:${HTTP_PORT}`);
});
const HTTPS_SERVER = https
  .createServer(options, app)
  .listen(HTTPS_PORT, function () {
    console.log(`Listening on localhost:${HTTPS_PORT}`);
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
    quality: 1,
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

const CAM_HANDLER = {};

cams.forEach(function (camStream, i) {
  CAM_HANDLER[i] = io.of("/stream/" + camStream.camid);
  CAM_HANDLER[i].on("connection", function (wsocket) {
    CameraData[i].client++;

    console.log(
      new Date(Date.now()).toString() +
        ": Has " +
        CameraData[i].client +
        " client(s) connected to camera " +
        camStream.camid +
        " through http port"
    );

    const pipeStream = function (data) {
      wsocket.emit("data", data);
    };
    camStream.on("data", pipeStream);
    camStream.on("data error", function () {
      console.log(
        new Date(Date.now()).toString() +
          ": Đã có lỗi xảy ra khi kết nối với luồng stream!"
      );
    });

    wsocket.on("disconnect", function () {
      CameraData[i].client--;

      console.log(
        new Date(Date.now()).toString() +
          ": Has client disconnected from camera" +
          camStream.camid +
          " through http port. Total: " +
          CameraData[i].client +
          " client(s)"
      );
      camStream.removeListener("data", pipeStream);
    });
  });

  const camID = i + "HTTPS";
  CAM_HANDLER[camID] = iohttps.of("/stream/" + camStream.camid);
  CAM_HANDLER[camID].on("connection", function (wsocket) {
    CameraData[i].clients++;
    console.log(
      new Date(Date.now()).toString() +
        ": Has " +
        CameraData[i].clients +
        " client(s) connected to camera " +
        camStream.camid +
        " through https port"
    );
    var pipeStream = function (data) {
      wsocket.emit("data", data);
    };
    camStream.on("data", pipeStream);
    camStream.on("data error", function () {
      console.log(
        new Date(Date.now()).toString() +
          ": Đã có lỗi xảy ra khi kết nối với luồng stream!"
      );
    });

    wsocket.on("disconnect", function () {
      CameraData[i].clients--;
      console.log(
        new Date(Date.now()).toString() +
          ": Has client disconnected from camera" +
          camStream.camid +
          " through https port. Total: " +
          CameraData[i].clients +
          " client(s)"
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
