const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static("public"));

const FILE = "messages.json";

// 履歴読み込み
let messages = [];
if (fs.existsSync(FILE)) {
  messages = JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveMessages() {
  fs.writeFileSync(FILE, JSON.stringify(messages, null, 2));
}

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>チャット</title>
  <style>
    body { font-family: sans-serif; }
    ul { list-style: none; padding: 0; }

    li {
      margin: 6px 0;
      padding: 6px 10px;
      max-width: 70%;
      border-radius: 8px;
    }

    .mine {
      background: #aee1ff;
      margin-left: auto;
      text-align: right;
    }

    .other {
      background: #eee;
      margin-right: auto;
    }

    .system {
      background: none;
      color: gray;
      text-align: center;
      font-style: italic;
      margin: 10px auto;
    }
  </style>
</head>
<body>
  <h1>💬 右寄せチャット</h1>

  <input id="name" placeholder="名前">
  <br><br>

  <input id="message" placeholder="メッセージ">
  <input type="image" src="/images/send-button.png" onclick="send()" style="width: 80px; vertical-align: middle; cursor: pointer;">

  <ul id="messages"></ul>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    let myName = "";

    function addMessage(data) {
      const li = document.createElement("li");

      if (data.type === "system") {
        li.textContent = data.text;
        li.className = "system";
      } else {
        li.textContent = data.name + "： " + data.text;
        li.className = (data.name === myName) ? "mine" : "other";
      }

      document.getElementById("messages").appendChild(li);
    }

    socket.on("history", (history) => {
      history.forEach(addMessage);
    });

    function send() {
      const nameInput = document.getElementById("name");
      const msgInput = document.getElementById("message");

      if (!myName) {
        myName = nameInput.value;
        if (!myName) return;
        socket.emit("join", myName);
        nameInput.disabled = true;
      }

      if (!msgInput.value) return;

      socket.emit("chat message", {
        type: "chat",
        name: myName,
        text: msgInput.value
      });

      msgInput.value = "";
    }

    socket.on("chat message", addMessage);
  </script>
</body>
</html>
  `);
});

io.on("connection", (socket) => {
  socket.emit("history", messages);

  socket.on("join", (name) => {
    const msg = {
      type: "system",
      text: "📢 " + name + " さんが参加しました"
    };
    messages.push(msg);
    saveMessages();
    io.emit("chat message", msg);
  });

  socket.on("chat message", (data) => {
    messages.push(data);
    saveMessages();
    io.emit("chat message", data);
  });
});

server.listen(5000, "0.0.0.0", () => {
  console.log("Server started on port 5000");
});
