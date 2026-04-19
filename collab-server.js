const { Server } = require("socket.io");

const io = new Server(3005, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory state for collaboration
const state = {
  kanban: {
    todo: [],
    doing: [],
    done: []
  },
  messages: [],
  squadFocus: {
    "ghost-1": { id: "Alex M.", score: 88, debt: 0, isFocusing: true, lastUpdate: Date.now() },
    "ghost-2": { id: "Sarah (Break)", score: 45, debt: 25, isFocusing: false, lastUpdate: Date.now() },
    "ghost-3": { id: "David_CS", score: 92, debt: 5, isFocusing: true, lastUpdate: Date.now() }
  }
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Add user to squad focus
  state.squadFocus[socket.id] = {
    id: `User ${socket.id.substring(0, 4)}`,
    status: "focusing",
    focusScore: Math.floor(Math.random() * 40) + 60
  };

  // Send initial state
  socket.emit("init", state);
  io.emit("squad-focus-update", state.squadFocus);

  // Whiteboard
  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });
  socket.on("clear-canvas", () => {
    io.emit("clear-canvas");
  });

  // Chat
  socket.on("message", (msg) => {
    state.messages.push(msg);
    if (state.messages.length > 50) state.messages.shift();
    io.emit("message", msg);
  });

  // Kanban
  socket.on("kanban-update", (newKanban) => {
    state.kanban = newKanban;
    io.emit("kanban-update", newKanban);
  });

  // Focus Tracker Sync
  socket.on("focus-update", (data) => {
    if (state.squadFocus[socket.id]) {
      state.squadFocus[socket.id] = {
        ...state.squadFocus[socket.id],
        score: data.score,
        debt: data.debt,
        isFocusing: data.isFocusing,
        lastUpdate: Date.now()
      };
      io.emit("squad-focus-update", state.squadFocus);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete state.squadFocus[socket.id];
    io.emit("squad-focus-update", state.squadFocus);
  });
});

console.log("📡 Collaboration Server running on http://localhost:3005");
