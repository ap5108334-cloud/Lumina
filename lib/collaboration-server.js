const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '.lumina-data');
const DATA_FILE = path.join(DATA_DIR, 'collaboration.json');

// Ensure data file exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    messages: [],
    kanban: { todo: [], doing: [], done: [] },
    whiteboard: []
  }));
}

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
let squadFocus = {}; // Tracks live focus levels: { socketId: { id: string, score: number, debt: number, isFocusing: boolean } }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Sync initial state
  socket.emit('init', { ...state, squadFocus });

  // Message Handling
  socket.on('message', (msg) => {
    state.messages.push(msg);
    if (state.messages.length > 100) state.messages.shift();
    io.emit('message', msg);
    saveState();
  });

  // Whiteboard Handling
  socket.on('draw', (data) => {
    socket.broadcast.emit('draw', data);
  });

  socket.on('clear-canvas', () => {
    io.emit('clear-canvas');
  });

  // Kanban Handling
  socket.on('kanban-update', (newKanban) => {
    state.kanban = newKanban;
    socket.broadcast.emit('kanban-update', newKanban);
    saveState();
  });

  // Study Squad Focus Handling
  socket.on('focus-update', (data) => {
    // Generate a consistent anonymized ID for the session based on socketId
    const anonymizedId = "Member " + socket.id.substring(0, 4).toUpperCase();
    squadFocus[socket.id] = {
      id: anonymizedId,
      score: data.score,
      debt: data.debt,
      isFocusing: data.isFocusing,
      lastUpdate: Date.now()
    };
    io.emit('squad-focus-update', squadFocus);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete squadFocus[socket.id];
    io.emit('squad-focus-update', squadFocus);
  });
});

// Periodic cleanup of stale focus sessions
setInterval(() => {
  const now = Date.now();
  let changed = false;
  Object.keys(squadFocus).forEach(sid => {
    if (now - squadFocus[sid].lastUpdate > 15000) { // 15 seconds stale
      delete squadFocus[sid];
      changed = true;
    }
  });
  if (changed) io.emit('squad-focus-update', squadFocus);
}, 10000);

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving collaboration state:', err);
  }
}

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`Collaboration Socket Server running on port ${PORT}`);
});
