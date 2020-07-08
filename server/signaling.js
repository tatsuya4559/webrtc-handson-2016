"use strict";

const WebSocketServer = require("ws").Server;
const port = 3001;
const wsServer = new WebSocketServer({ port: port });

wsServer.on("connection", (ws) => {
  console.log("--- websocket connected ---");
  ws.on("message", (message) => {
    wsServer.clients.forEach((client) => {
      if (isSame(ws, client)) {
        console.log("skip sender");
      } else {
        client.send(message);
      }
    });
  });
});

function isSame(ws1, ws2) {
  return ws1 === ws2;
}

console.log(`websocket server started on port: ${port}`);

