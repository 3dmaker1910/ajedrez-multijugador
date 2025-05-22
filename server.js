const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

app.use(express.static("public"));

let waitingPlayer = null;
let boardState = {
  blocked: generateBlockedZones()
};

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  socket.on("find_match", ({ name }) => {
    if (waitingPlayer) {
      const opponentSocket = waitingPlayer.socket;
      const opponentName = waitingPlayer.name;
      const starter = Math.floor(Math.random() * 2);

      socket.emit("match_found", {
        opponentName: opponentName,
        yourTurn: starter === 0,
        playerId: socket.id,
        role: "player1"
      });

      opponentSocket.emit("match_found", {
        opponentName: name,
        yourTurn: starter === 1,
        playerId: opponentSocket.id,
        role: "player2"
      });

      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, name };
    }
  });

  socket.on("request_board", () => {
    socket.emit("init_board", { blocked: boardState.blocked });
  });

  socket.on("place_piece", ({ index, piece }) => {
    io.emit("piece_placed", {
      index,
      piece,
      player: socket.id
    });
  });

  socket.on("move_piece", ({ from, to }) => {
    console.log(`Movimiento desde ${from} a ${to} por ${socket.id}`);
    io.emit("piece_moved", {
      from,
      to,
      player: socket.id  // 🔥 CAMBIO CRUCIAL para que el cliente actualice correctamente
    });
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

function generateBlockedZones() {
  const boardSize = 12;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const blocked = new Set();

  function isValid(x, y) {
    return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
  }

  function index(x, y) {
    return y * boardSize + x;
  }

  function generateGroup(size) {
    let tries = 0;
    while (tries++ < 1000) {
      const startX = Math.floor(Math.random() * boardSize);
      const startY = Math.floor(Math.random() * boardSize);
      if (blocked.has(index(startX, startY))) continue;
      const group = [];
      const queue = [[startX, startY]];
      while (group.length < size && queue.length > 0) {
        const [x, y] = queue.shift();
        const i = index(x, y);
        if (blocked.has(i) || group.includes(i)) continue;
        group.push(i);
        for (let [dx, dy] of directions) {
          const nx = x + dx, ny = y + dy;
          if (isValid(nx, ny)) queue.push([nx, ny]);
        }
      }
      if (group.length === size) return group;
    }
    return [];
  }

  [5, 5, 4, 4, 4, 3, 3].forEach(size => {

    const group = generateGroup(size);
    group.forEach(i => blocked.add(i));
  });

  return Array.from(blocked);
}


