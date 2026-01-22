import fs from "fs";
import dotenv from "dotenv";
import io from "socket.io-client";
import http from "http";
import path from "path";
import url from "url";
import { WebSocketServer } from "ws";

dotenv.config();

const API_BASE_URL = "https://openapi.chzzk.naver.com";

/* access token 가져오기 */
async function getAccessToken() {
  if (fs.existsSync("access_token.json")) {
    const data = JSON.parse(
      fs.readFileSync("access_token.json", "utf-8"),
    ).content;
    return data;
  }

  if (!fs.existsSync("auth_data.json")) {
    // If auth_data.json doesn't exist, guide user to the root page for authentication.
    throw new Error(
      "auth_data.json not found. Please go to http://localhost:3000/ to authenticate.",
    );
  }

  const authData = JSON.parse(fs.readFileSync("auth_data.json", "utf-8"));
  const { code, state } = authData;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const payload = {
    grantType: "authorization_code",
    clientId,
    clientSecret,
    code,
    state,
  };

  const res = await fetch(`${API_BASE_URL}/auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (res.ok) {
    fs.writeFileSync("access_token.json", JSON.stringify(json, null, 2));
  }

  return json.content;
}

let sessionKey = null;

export async function connectSession(wss) {
  const session = await createClientSession();
  const sessionURL = session.url;

  const token = await getAccessToken();

  const socketOption = {
    reconnection: false,
    "force new connection": true,
    "connect timeout": 3000,
    transports: ["websocket"],
  };

  const socket = io.connect(sessionURL, socketOption);

  socket.on("SYSTEM", (data) => {
    data = JSON.parse(data);

    if (data.type === "connected") {
      sessionKey = data.data.sessionKey;

      fetch(
        `${API_BASE_URL}/open/v1/sessions/events/subscribe/chat?sessionKey=${sessionKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.accessToken}`,
          },
        },
      ).catch((err) => {
        console.error("Error subscribing to chat events:", err);
      });
    }
  });

  socket.on("CHAT", (data) => {
    data = JSON.parse(data);
    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  });

  return socket;
}

async function createClientSession() {
  const url = `${API_BASE_URL}/open/v1/sessions/auth/client`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": process.env.CLIENT_ID,
      "Client-Secret": process.env.CLIENT_SECRET,
    },
  });
  const json = await res.json();
  return json.content;
}

/* 메인 */
async function main() {
  const host = "0.0.0.0";
  const port = 3000;

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === "/") {
      const clientId = encodeURIComponent(process.env.CLIENT_ID);
      const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
      const state = "0"; // As in server.py
      const chzzkAuthUrl = `https://chzzk.naver.com/account-interlock?clientId=${clientId}&redirectUri=${redirectUri}&state=${state}`;
      res.writeHead(302, { Location: chzzkAuthUrl });
      res.end();
      return;
    }

    if (pathname === "/auth/callback") {
      const { code, state } = parsedUrl.query;
      fs.writeFileSync(
        "auth_data.json",
        JSON.stringify({ code, state }, null, 2),
      );
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        "인증 데이터가 성공적으로 저장되었습니다. 프로그램을 다시 시작해주세요.",
      );
      return;
    }

    // Serve index.html on /app
    const filePath = pathname === "/app" ? "/index.html" : pathname;
    const ext = path.extname(filePath).toLowerCase();
    const physicalPath = `.${filePath}`;

    const contentType =
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
      }[ext] || "application/octet-stream";

    if (fs.existsSync(physicalPath)) {
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(physicalPath).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  const wss = new WebSocketServer({ server });

  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
  });

  // Delay connection until authentication is likely complete
  // Or connect and handle auth error gracefully
  connectSession(wss).catch((err) => {
    console.error(
      "Failed to connect Chzzk session. Please ensure you have authenticated.",
    );
    console.error(err.message);
  });
}

main().catch(console.error);
