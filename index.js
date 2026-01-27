const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const HISTORY_FILE = "history.txt";
app.use("/stamps", express.static("stamps"));

if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, "");
}

app.get("/", (req, res) => {
res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>My Chat</title>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: #7ac7ff;
}

#header {
  position: fixed;
  top: 0;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg,#4facfe,#00f2fe);
  color: white;
  display: flex;
  justify-content: space-between;
  box-sizing: border-box;
  z-index: 10;
}

#container {
  padding: 80px 12px 90px;
}

#messages {
  display: none;
  background: #e5f2ff;
  padding: 10px;
  border-radius: 12px;
  min-height: 60vh;
}

.bubble {
  max-width: 70%;
  padding: 10px 14px;
  margin: 8px 0;
  border-radius: 18px;
}

.me { background: #9effa1; margin-left: auto; }
.other { background: white; }

.system {
  text-align: center;
  font-size: 13px;
  color: #555;
}

.chat-img {
  max-width: 180px;
  margin-top: 6px;
  border-radius: 10px;
}

#inputArea {
  position: fixed;
  bottom: 0;
  width: 100%;
  background: white;
  padding: 6px;
  display: none;
  gap: 6px;
  box-sizing: border-box;
  align-items: center;
}

#msg {
  flex: 1;
}

.stamp {
  width: 32px;
  cursor: pointer;
}

#imageInput {
  width: 120px;
}
</style>
</head>

<body>

<div id="header">
  <div>💬 My Chat</div>
  <div id="myNameView"></div>
</div>

<div id="container">
  <div id="nameArea">
    <input id="nameInput" placeholder="名前を入力">
    <button id="nameBtn">入室</button>
  </div>

  <div id="messages"></div>
</div>

<div id="inputArea">
  <img src="/stamps/stamp1.png" class="stamp" onclick="sendStamp('stamp1.png')">
  <input type="file" id="imageInput" accept="image/*">
  <input id="msg" placeholder="メッセージ">
  <button onclick="send()">送信</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();

const messages = document.getElementById("messages");
const nameArea = document.getElementById("nameArea");
const inputArea = document.getElementById("inputArea");
const nameInput = document.getElementById("nameInput");
const myNameView = document.getElementById("myNameView");
const msgInput = document.getElementById("msg");
const imageInput = document.getElementById("imageInput");

let myName = localStorage.getItem("chatName");

function addBubble(data, isMe) {
  const div = document.createElement("div");
  div.className = "bubble " + (isMe ? "me" : "other");

  const name = document.createElement("strong");
  name.textContent = data.name;
  div.appendChild(name);

  if (data.text) {
    const p = document.createElement("div");
    p.textContent = data.text;
    div.appendChild(p);
  }

  if (data.image) {
    const img = document.createElement("img");
    img.src = data.image;
    img.className = "chat-img";
    div.appendChild(img);
  }

  messages.appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
}

function addSystem(text) {
  const div = document.createElement("div");
  div.className = "system";
  div.textContent = text;
  messages.appendChild(div);
}

function enter(name) {
  myName = name;
  localStorage.setItem("chatName", myName);
  myNameView.textContent = "👤 " + myName;

  socket.emit("join", myName);
  nameArea.style.display = "none";
  messages.style.display = "block";
  inputArea.style.display = "flex";
}

if (myName) enter(myName);

document.getElementById("nameBtn").onclick = () => {
  if (!nameInput.value) return;
  enter(nameInput.value);
};

function send() {
  const text = msgInput.value;
  const file = imageInput.files[0];

  if (!text && !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("chat", {
      text: text,
      image: file ? reader.result : null
    });
    msgInput.value = "";
    imageInput.value = "";
  };

  if (file) reader.readAsDataURL(file);
  else reader.onload();
}

function sendStamp(file) {
  socket.emit("chat", { image: "/stamps/" + file });
}

msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

socket.on("history", d => addBubble(d, d.name === myName));
socket.on("chat", d => addBubble(d, d.name === myName));
socket.on("system", t => addSystem(t));
</script>

</body>
</html>
`);
});

io.on("connection", socket => {
  socket.on("join", name => {
    if (socket.username) return;
    socket.username = name;

    fs.readFileSync(HISTORY_FILE,"utf8")
      .split("\\n")
      .filter(Boolean)
      .forEach(l => socket.emit("history", JSON.parse(l)));

    io.emit("system", "🔔 " + name + " が入室しました");
  });

  socket.on("chat", data => {
    if (!socket.username) return;

    const msg = {
      name: socket.username,
      text: data.text || "",
      image: data.image || null
    };

    fs.appendFileSync(HISTORY_FILE, JSON.stringify(msg) + "\\n");
    io.emit("chat", msg);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      io.emit("system", "🚪 " + socket.username + " が退出しました");
    }
  });
});

server.listen(3000, () => console.log("Server started"));
