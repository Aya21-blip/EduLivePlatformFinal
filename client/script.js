const socket = io();
const APP_ID = "4e6dbcc22be241aeb87015d12ad02996"; // ✨ غيّري هذا إلى App ID من Agora
const channelName = "OnlineClassroom2"; // اسم القناة
const uid = Math.floor(Math.random() * 100000); // معرف المستخدم العشوائي
let token = null;

let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTracks = { videoTrack: null, audioTrack: null };
let remoteUsers = {};

let videoContainer = document.getElementById("videoContainer");

async function getTokenAndJoin() {
  const response = await fetch(`/rtc-token?channel=${channelName}`);
  const data = await response.json();
  token = data.token;

  await client.join(APP_ID, channelName, token, uid);

  if (role === "teacher") {
    localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
    localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();

    const teacherDiv = document.createElement("div");
    teacherDiv.id = `video-${uid}`;
    teacherDiv.style.width = "100%";
    teacherDiv.style.height = "90vh";
    videoContainer.appendChild(teacherDiv);
    localTracks.videoTrack.play(teacherDiv);

    await client.publish([localTracks.videoTrack, localTracks.audioTrack]);

    socket.on("micRequested", ({ studentId, name }) => {
      const li = document.getElementById(studentId);
      if (li) li.innerText = `${name} 🔔 طلب المايك`;

      if (confirm(`${name} يطلب تفعيل المايك، هل توافق؟`)) {
        socket.emit("approveMic", { studentId });
        if (li) li.innerText = `${name} 🎤 المايك مفعل`;
      }
    });

    socket.on("studentListUpdate", ({ studentId, name }) => {
      if (!studentId) return document.getElementById("studentsList").innerHTML = ""; // مسح الكل عند تحديث
      const li = document.createElement("li");
      li.id = studentId;
      li.innerText = name;
      document.getElementById("studentsList").appendChild(li);
    });
  }

  if (role === "student") {
    socket.emit("join-student", { name: "طالب" });

    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        const remoteDiv = document.createElement("div");
        remoteDiv.id = `video-${user.uid}`;
        remoteDiv.style.width = "100%";
        remoteDiv.style.height = "90vh";
        videoContainer.innerHTML = "";
        videoContainer.appendChild(remoteDiv);
        user.videoTrack.play(remoteDiv);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    socket.on("micApproved", async () => {
      localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish([localTracks.audioTrack]);
    });
  }
}

getTokenAndJoin();

if (role === "teacher") {
  document.getElementById("startBtn").onclick = async () => {
    console.log("بدء البث...");
    // تم بالفعل عند الاتصال
  };

  document.getElementById("stopBtn").onclick = async () => {
    for (let trackName in localTracks) {
      let track = localTracks[trackName];
      if (track) {
        track.stop();
        track.close();
      }
    }
    await client.leave();
    videoContainer.innerHTML = "";
    console.log("تم إيقاف البث");
  };

  document.getElementById("shareScreenBtn").onclick = async () => {
    const screenTrack = await AgoraRTC.createScreenVideoTrack();
    await client.unpublish(localTracks.videoTrack);
    await client.publish(screenTrack);
    localTracks.videoTrack = screenTrack;
    const screenDiv = document.createElement("div");
    screenDiv.id = `video-${uid}`;
    screenDiv.style.width = "100%";
    screenDiv.style.height = "90vh";
    videoContainer.innerHTML = "";
    videoContainer.appendChild(screenDiv);
    screenTrack.play(screenDiv);
  };
}

if (role === "student") {
  document.getElementById("requestMicBtn").onclick = () => {
    socket.emit("requestMic", { channel: channelName, name: "طالب" });
  };
}
