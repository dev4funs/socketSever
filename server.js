require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};
const leaders = {};
const socketToRoom = {};

io.on("connection", (socket) => {
  socket.on("join room", (roomID) => {
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 10) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
      leaders[roomID] = socket.id;
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    console.log("join room", users, socketToRoom, roomID);
    socket.emit("all users", { usersInThisRoom, leader: leaders[roomID] });
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("declareLeader", () => {
    const roomID = socketToRoom[socket.id];
    leaders[roomID] = socket.id;
    console.log(socket.id, " is the new leader");
  });

  socket.on("destroy", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    console.log("destroy", socket.id, roomID, users);
    try {
      if (room) {
        const index = users[roomID].findIndex((item) => item === socket.id);
        if (index !== -1) {
          users[roomID].splice(index, 1);
        }
      }
    } catch (error) {
      console.log("destroy error", error);
    }
  });
});

server.listen(process.env.PORT || 8000, () =>
  console.log("server is running on port 8000")
);
