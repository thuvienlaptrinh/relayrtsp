const rtspRelay = require("rtsp-relay");
const express = require("express");
const fs = require("fs");

const https = require("https");

const key = fs.readFileSync("./privatekey.pem", "utf8");
const cert = fs.readFileSync("./fullchain.pem", "utf8");
const ca = fs.readFileSync("./chain.pem", "utf8"); // required for iOS 15+

const app = express();
const server = https.createServer({ key, cert, ca }, app);
const { proxy, scriptUrl } = rtspRelay(app, server);

let date_ob = new Date();

// current date
// adjust 0 before single digit date
let date = ("0" + date_ob.getDate()).slice(-2);

// current month
let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

// current year
let year = date_ob.getFullYear();

// current hours
let hours = date_ob.getHours();

// current minutes
let minutes = date_ob.getMinutes();

// current seconds
let seconds = date_ob.getSeconds();

let currentTime =
  year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

const CameraData = JSON.parse(
  fs.readFileSync(__dirname + "/cameralist.json", "utf8")
);
// console.log(CameraData);

let selectedCam = null;
// the endpoint our RTSP uses

app.ws("/api/stream/:cameraID", (ws, req) => {
  let found = false;
  CameraData.forEach((item) => {
    if (item.id == req.params.cameraID) {
      found = true;
      selectedCam = item;
    }
  });
  if (found) {
    console.log(`Client đang xem kênh ${selectedCam.url}`);
    return proxy(
      {
        url: `rtsp://${selectedCam.username}:${selectedCam.pwd}@${selectedCam.url}`,
        verbose: true,
      },
      { additionalFlags: ["-q", "1"] },
      { transport: "tcp" }
    )(ws);
  } else {
    return {
      ret: false,
      msg: "Invalid camera id",
    };
  }
});

// this is an example html page to view the stream
app.get("/:cameraID", (req, res) => {
  const cameraID = req.params.cameraID;
  try {
    const buffer = fs.readFileSync(__dirname + "/playerpage.html", "utf8");
    // use the toString() method to convert
    // Buffer into String
    const fileContent = buffer.toString();
    let CAMERA_TITLE = "bên trong trạm bơm";
    switch (cameraID) {
      case "UMT-CA-01":
        CAMERA_TITLE = "bên trong trạm bơm";
        break;
      case "UMT-CA-02":
        CAMERA_TITLE = "theo dõi trạm quan trắc";
        break;
      case "UMT-CA-03":
        CAMERA_TITLE = "trạm xử lý nước";
        break;
      default:
        break;
    }
    return res.send(
      fileContent
        .replace("RTSP_CHANNEL", cameraID)
        .replace("RTSP_CHANNEL", cameraID)
        .replace("CAMERA_TITLE", CAMERA_TITLE)
    );
  } catch (err) {
    console.error(err);
    return {
      ret: false,
      msg: "Invalid camera id",
    };
  }

  // return res.sendFile(__dirname + "/homepage.html");
});

//Homepage handler
app.get("/", (req, res) => {
  return res.sendFile(__dirname + "/homepage.html");
});

app
  .listen(443, function () {
    console.log(`${currentTime}: Node map App listening at port 443`);
    console.log(`${currentTime}: ${scriptUrl}`);
  })
  .on("error", function (err) {
    console.log(`${err}: Node map error`);
  });
