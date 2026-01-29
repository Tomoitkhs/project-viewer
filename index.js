const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");

// ===== DB設定 =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 起動時テーブル作成
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      text TEXT,
      image TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("DB ready");
})();

// ===== サーバー =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use("/stamps", express.static("stamps"));

// ===== HTML =====
app.get("/", (req, res) => {
res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Project Viewer</title>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  background: #7ac7ff;
}

#header {
  position: fixed;
  top: 0; left: 0;
  width: 100%;
  height: 56px;
  padding: 0 16px;
  background: linear-gradient(135deg,#4facfe,#00f2fe);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  z-index: 10;
}

#container {
  padding: 70px 12px 90px;
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
  word-break: break-word;
}

.me { background: #9effa1; margin-left: auto; }
.other { background: white; }

.system {
  text-align: center;
  font-size: 13px;
  color: #555;
  margin: 6px 0;
}

.chat-img {
  max-width: 180px;
  margin-top: 6px;
  border-radius: 10px;
}

#inputArea {
  position: fixed;
  bottom: 0; left: 0;
  width: 100%;
  background: white;
  padding: 6px;
  display: none;
  gap: 6px;
  box-sizing: border-box;
  align-items: center;
}

#msg { flex: 1; height: 36px; }
#imageInput { width: 120px; }
.stamp { width: 32px; cursor: pointer; }
</style>
</head>

<body>

<div id="header">
  <div>📘 Project Viewer</div>
  <div>
    <span id="myNameView"></span>
    <span id="onlineCount" style="margin-left:10px;">🟢 Online: 0</span>
    <button id="adminClearBtn" style="display:none;">
      🗑 履歴削除
    </button>
  </div>
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
  <input id="msg" placeholder="メッセージ（Enter送信 / Shift+Enter改行）">
  <button id="sendBtn">送信</button>
  <button onclick="localStorage.clear(); location.reload();">localStorage削除</button>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
window.onload = () => {

const socket = io(location.origin);

const messages = document.getElementById("messages");
const nameArea = document.getElementById("nameArea");
const inputArea = document.getElementById("inputArea");
const nameInput = document.getElementById("nameInput");
const myNameView = document.getElementById("myNameView");
const msgInput = document.getElementById("msg");
const imageInput = document.getElementById("imageInput");
const onlineCount = document.getElementById("onlineCount");

socket.on("online-count", count => {
  onlineCount.textContent = "🟢 Online: " + count;
});


let myName = localStorage.getItem("chatName");

const adminBtn = document.getElementById("adminClearBtn");

// 管理者パスワード入力
const adminPassword = prompt("管理者ですか？（違ったらキャンセル）");

if (adminPassword) {
  socket.emit("admin-check", adminPassword);
}

// 管理者OKが返ってきたらボタン表示
socket.on("admin-ok", () => {
  adminBtn.style.display = "inline-block";
});

adminBtn.onclick = () => {
  if (!confirm("履歴をすべて削除します。よろしいですか？")) return;
  socket.emit("admin-clear");
};


function addBubble(data) {
  const div = document.createElement("div");
  div.className = "bubble " + (data.name === myName ? "me" : "other");

  div.innerHTML = "<strong>" + data.name + "</strong>";
  if (data.text) div.innerHTML += "<div>" + data.text + "</div>";
  if (data.image) div.innerHTML += '<img src="' + data.image + '" class="chat-img">';

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

  nameArea.style.display = "none";
  messages.style.display = "block";
  inputArea.style.display = "flex";

  socket.emit("join", myName);
}

if (myName) enter(myName);

document.getElementById("nameBtn").onclick = () => {
  if (!nameInput.value.trim()) return;
  enter(nameInput.value.trim());
};

function send() {
  const text = msgInput.value.trim();
  const file = imageInput.files[0];
  if (!text && !file) return;

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("chat", { text, image: reader.result });
    };
    reader.readAsDataURL(file);
  } else {
    socket.emit("chat", { text, image: null });
  }

  msgInput.value = "";
  imageInput.value = "";
}

function sendStamp(file) {
  socket.emit("chat", { text: "", image: "/stamps/" + file });
}

document.getElementById("sendBtn").onclick = send;

msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

socket.on("history", addBubble);
socket.on("chat", addBubble);
socket.on("system", addSystem);
socket.on("clear-screen", () => {
  messages.innerHTML = "";
  window.scrollTo(0, 0);
});


};
</script>

</body>
</html>`);
});

// ===== Socket.io =====
let onlineUsers = 0;

io.on("connection", socket => {
  onlineUsers++;
  io.emit("online-count", onlineUsers);
  socket.on("join", async name => {
    if (socket.username) return;
    socket.username = name;

    const r = await pool.query(
      "SELECT name,text,image FROM messages ORDER BY id ASC LIMIT 100"
    );
    r.rows.forEach(row => socket.emit("history", row));

    io.emit("system", "🔔 " + name + " が入室しました");
  });

  socket.on("chat", async data => {
    if (!socket.username) return;

    const msg = {
      name: socket.username,
      text: data.text || "",
      image: data.image || null
    };

    await pool.query(
      "INSERT INTO messages (name,text,image) VALUES ($1,$2,$3)",
      [msg.name, msg.text, msg.image]
    );

    io.emit("chat", msg);
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    if (onlineUsers < 0) onlineUsers = 0;
    io.emit("online-count", onlineUsers);
    if (socket.username) {
      io.emit("system", "🚪 " + socket.username + " が退出しました");
    }
  });
  
  socket.on("admin-check", password => {
    if (password === process.env.ADMIN_PASSWORD) {
      socket.isAdmin = true;
      socket.emit("admin-ok");
    }
  });
  
  socket.on("admin-clear", async () => {
    if (!socket.isAdmin) return;

    await pool.query("DELETE FROM messages");

    // 全員の画面を即クリアさせる
    io.emit("clear-screen");

    io.emit("system", "🧹 管理者により履歴が削除されました");
  });



  
});

// ===== 起動 =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
