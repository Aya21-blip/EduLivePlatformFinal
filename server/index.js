const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const { RtcTokenBuilder, RtcRole } = require("agora-token");

const APP_ID = "4e6dbcc22be241aeb87015d12ad02996";
const APP_CERTIFICATE = "f99e8e88f6034077881e4344db84d3db";
const PORT = 3000;

app.use(cors());
app.use(express.static(__dirname + '/../client'));

app.get("/rtc-token", (req, res) => {
  const channelName = req.query.channel;
  const uid = 0;
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600;
  const token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, expireTime);
  res.json({ token });
});

let students = [];

io.on("connection", (socket) => {
  socket.on("join-student", (data) => {
    students.push({ id: socket.id, name: data.name });
    io.emit("studentListUpdate", { studentId: socket.id, name: data.name });
  });

  socket.on("requestMic", (data) => {
    io.emit("micRequested", { studentId: socket.id, name: data.name });
  });

  socket.on("approveMic", (data) => {
    io.to(data.studentId).emit("micApproved");
  });

  socket.on("disconnect", () => {
    students = students.filter(s => s.id !== socket.id);
    io.emit("studentListUpdate", {}); // تحديث القائمة بعد مغادرة الطالب
  });
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
