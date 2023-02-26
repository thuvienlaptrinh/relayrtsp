const express = require("express");
const fs = require("fs");
const app = express();

const { proxy, scriptUrl } = require("rtsp-relay")(app);

const handler = proxy({
  //url: `rtsp://admin:admin123@kimanhttd.quickddns.com:5555`,
  url: `rtsp://admin:202020@phongdt.dvrlists.com:554//Streaming/Channels/1`,
  // if your RTSP stream need credentials, include them in the URL as above
  verbose: true,
});
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
const camIpList = [
  {
    id: 0,
    url: "phongdt.dvrlists.com:554//Streaming/Channels/1",
    username: "admin",
    pwd: "202020",
  },
  {
    id: 1,
    url: "kimanhttd.quickddns.com:5555",
    username: "admin",
    pwd: "admin123",
  },
];
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
      },
      { additionalFlags: ["-q", "1"] }
    )(ws);
  } else {
    return {
      ret: false,
      msg: "Invalid camera id",
    };
  }
});

app.ws("/rtsp", handler);

// this is an example html page to view the stream
app.get("/:cameraID", (req, res) => {
  const cameraID = req.params.cameraID;
  try {
    const buffer = fs.readFileSync(__dirname + "/playerpage.html", "utf8");
    // use the toString() method to convert
    // Buffer into String
    const fileContent = buffer.toString();

    return res.send(
      fileContent
        .replace("RTSP_CHANNEL", cameraID)
        .replace("RTSP_CHANNEL", cameraID)
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
  .listen(7000, function () {
    console.log(`${currentTime}: Node map App listening at port 7000`);
    console.log(`${currentTime}: ${scriptUrl}`);
  })
  .on("error", function (err) {
    console.log(`${err}: Node map error`);
  });
