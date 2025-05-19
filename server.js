const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("find_match", ({ name }) => {
    if (waitingPlayer) {
      const opponentSocket = waitingPlayer.socket;
      const opponentName = waitingPlayer.name;

      const players = [
        { id: socket.id, name },
        { id: opponentSocket.id, name: opponentName }
      ];

      const starter = Math.floor(Math.random() * 2);

      socket.emit("match_found", {
        opponent: opponentName,
        yourTurn: starter === 0
      });

      opponentSocket.emit("match_found", {
        opponent: name,
        yourTurn: starter === 1
      });

      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, name };
    }
  });

  socket.on("disconnect", () => {
    if (waitingPlayer?.socket.id === socket.id) {
      waitingPlayer = null;
    }
    console.log("Jugador desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});
