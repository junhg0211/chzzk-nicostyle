import fs from "fs";
import dotenv from "dotenv";
import io from "socket.io-client";
import http from "http";
import path from "path";

dotenv.config();

const API_BASE_URL = "https://openapi.chzzk.naver.com";

/* access token 가져오기 */
async function getAccessToken() {
  if (fs.existsSync("access_token.json")) {
    const data = JSON.parse(
      fs.readFileSync("access_token.json", "utf-8"),
    ).content;
    console.log("Access token loaded from file:", data);
    return data;
  }

  if (!fs.existsSync("auth_data.json")) {
    throw new Error("auth_data.json not found");
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
  console.log(json);

  if (res.ok) {
    fs.writeFileSync("access_token.json", JSON.stringify(json, null, 2));
    console.log('Access token saved to "access_token.json"');
  }

  return json.content;
}

let sessionKey = null;

export async function connectSession() {
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

  socket.on("connect", () => {
    console.log("WebSocket connected.");
  });

  socket.on("SYSTEM", (data) => {
    data = JSON.parse(data);

    if (data.type === "connected") {
      console.log("Session connected:", data);
      sessionKey = data.data.sessionKey;

      console.log("Subscribing to chat events...");
      console.log("Session Key:", sessionKey);
      console.log("body:", { sessionKey });

      fetch(
        `${API_BASE_URL}/open/v1/sessions/events/subscribe/chat?sessionKey=${sessionKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.accessToken}`,
          },
        },
      )
        .then((res) => res.json())
        .then((json) => {
          console.log("Subscribed to chat events:", json);
        })
        .catch((err) => {
          console.error("Error subscribing to chat events:", err);
        });
    }
  });

  socket.on("CHAT", (data) => {
    data = JSON.parse(data);
    console.log(data.content);
  });

  return socket;
}

/* 메인 */
async function main() {
  const host = "0.0.0.0";
  const port = 8080;

  const server = http.createServer((req, res) => {
    const filePath = req.url === "/" ? "/index.html" : req.url;
    const ext = path.extname(filePath).toLowerCase();

    const contentType =
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
      }[ext] || "application/octet-stream";

    if (fs.existsSync(`.${filePath}`)) {
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(`.${filePath}`).pipe(res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });
  server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
  });
}

main().catch(console.error);
