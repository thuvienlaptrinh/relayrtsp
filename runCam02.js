const { exec } = require("child_process");
const command = "ffmpeg -i 'rtsp://admin:admin123456@thuyloiumt.kbvision.tv:5557/cam/realmonitor?channel=1&subtype=1' -r 25 -s '704x396' -crf 25 -preset faster -maxrate 500k -bufsize 1500k -c:v libx264 -hls_time 4 -hls_list_size 20 -start_number 1 -hls_flags delete_segments -hls_segment_filename public/cam02/file%03d.ts -y public/cam02/playlist.m3u8"

const fs = require("fs");
const path = require("path");

const directory = "public/cam02";

fs.readdir(directory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(directory, file), (err) => {
      if (err) throw err;
    });
  }
});


exec(command, (error, stdout, stderr) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: `);
});