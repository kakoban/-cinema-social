import { createServer } from "http";
import { Server, Socket } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  // path is "/" so Caddy can forward via XTransformPort
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

interface RoomMember {
  userId: string;
  username: string;
  socketId: string;
  isHost: boolean;
  hasVideo?: boolean;
  isMuted?: boolean;
}

interface RoomPlaybackState {
  currentTime: number;
  isPlaying: boolean;
  lastUpdate: number; // server ms when state was last set
  hostSocketId: string | null;
}

interface RoomState {
  id: string;
  members: Map<string, RoomMember>; // userId -> member
  playback: RoomPlaybackState;
}

const rooms = new Map<string, RoomState>();

function getOrCreateRoom(roomId: string): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      members: new Map(),
      playback: { currentTime: 0, isPlaying: false, lastUpdate: Date.now(), hostSocketId: null },
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastMembers(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  const members = Array.from(room.members.values());
  io.to(roomId).emit("room:members", { members });
}

function systemMessage(roomId: string, message: string, userId?: string) {
  const msg = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    userId: userId || null,
    username: "System",
    content: message,
    type: "SYSTEM",
    createdAt: new Date().toISOString(),
  };
  io.to(roomId).emit("chat:message", msg);
}

function computeEffectiveTime(playback: RoomPlaybackState): number {
  if (!playback.isPlaying) return playback.currentTime;
  const elapsed = (Date.now() - playback.lastUpdate) / 1000;
  return playback.currentTime + elapsed;
}

io.on("connection", (socket: Socket) => {
  console.log(`[realtime] connected: ${socket.id}`);

  // Track which rooms this socket is in (for cleanup)
  const socketRooms = new Set<string>();
  const socketUser = new Map<string, { userId: string; username: string }>();

  socket.on("join:room", (data: { roomId: string; userId: string; username: string; isHost?: boolean }) => {
    const { roomId, userId, username, isHost } = data;
    if (!roomId || !userId || !username) return;

    const room = getOrCreateRoom(roomId);
    // enforce 50 max
    if (!room.members.has(userId) && room.members.size >= 50) {
      socket.emit("room:full", { roomId });
      return;
    }

    socket.join(roomId);
    socketRooms.add(roomId);
    socketUser.set(roomId, { userId, username });

    const wasHost = isHost || room.members.size === 0;
    const member: RoomMember = {
      userId,
      username,
      socketId: socket.id,
      isHost: wasHost,
      hasVideo: false,
      isMuted: false,
    };
    const isNew = !room.members.has(userId);
    room.members.set(userId, member);

    if (wasHost) {
      room.playback.hostSocketId = socket.id;
    }

    if (isNew) {
      systemMessage(roomId, `${username} joined`, userId);
    }

    broadcastMembers(roomId);

    // Late joiner: request immediate sync from host, or send our state
    if (room.playback.hostSocketId && room.playback.hostSocketId !== socket.id) {
      io.to(room.playback.hostSocketId).emit("playback:request-sync", { roomId, targetSocketId: socket.id });
    } else {
      // we are host or no host yet — send current state
      const effective = computeEffectiveTime(room.playback);
      socket.emit("playback:sync", {
        roomId,
        currentTime: effective,
        isPlaying: room.playback.isPlaying,
        serverTimestamp: Date.now(),
      });
    }
  });

  socket.on("chat:message", (data: { roomId: string; userId: string; username: string; content: string }) => {
    const { roomId, userId, username, content } = data;
    if (!roomId || !content) return;
    const msg = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      userId,
      username,
      content: content.slice(0, 1000),
      type: "TEXT",
      createdAt: new Date().toISOString(),
    };
    io.to(roomId).emit("chat:message", msg);
  });

  socket.on("chat:typing", (data: { roomId: string; userId: string; username: string }) => {
    socket.to(data.roomId).emit("chat:typing", { userId: data.userId, username: data.username });
  });

  socket.on("CMD:joinVideo", (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    const member = room.members.get(data.userId);
    if (member) {
      member.hasVideo = true;
      broadcastMembers(data.roomId);
    }
  });

  socket.on("CMD:leaveVideo", (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    const member = room.members.get(data.userId);
    if (member) {
      member.hasVideo = false;
      broadcastMembers(data.roomId);
    }
  });

  socket.on("CMD:userMute", (data: { roomId: string; userId: string; isMuted: boolean }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    const member = room.members.get(data.userId);
    if (member) {
      member.isMuted = data.isMuted;
      broadcastMembers(data.roomId);
    }
  });

  socket.on("signal", (data: { to: string; from: string; msg: unknown }) => {
    // Forward the WebRTC signal to the target socket
    io.to(data.to).emit("signal", { from: data.from, msg: data.msg });
  });

  // Host -> server -> broadcast (with server timestamp for drift compensation)
  socket.on("playback:sync", (data: { roomId: string; currentTime: number; isPlaying: boolean }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    // only host controls playback
    if (room.playback.hostSocketId !== socket.id) return;
    room.playback = {
      currentTime: data.currentTime,
      isPlaying: data.isPlaying,
      lastUpdate: Date.now(),
      hostSocketId: socket.id,
    };
    io.to(data.roomId).emit("playback:sync", {
      roomId: data.roomId,
      currentTime: data.currentTime,
      isPlaying: data.isPlaying,
      serverTimestamp: Date.now(),
    });
  });

  socket.on("playback:seek", (data: { roomId: string; currentTime: number }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    if (room.playback.hostSocketId !== socket.id) return;
    room.playback.currentTime = data.currentTime;
    room.playback.lastUpdate = Date.now();
    io.to(data.roomId).emit("playback:sync", {
      roomId: data.roomId,
      currentTime: data.currentTime,
      isPlaying: room.playback.isPlaying,
      serverTimestamp: Date.now(),
    });
  });

  const handleDisconnect = () => {
    for (const roomId of socketRooms) {
      const room = rooms.get(roomId);
      if (!room) continue;
      const userInfo = socketUser.get(roomId);
      if (!userInfo) continue;
      const member = room.members.get(userInfo.userId);
      const wasHost = member?.isHost;
      room.members.delete(userInfo.userId);
      systemMessage(roomId, `${userInfo.username} left`, userInfo.userId);

      if (wasHost) {
        // host left: freeze playback for everyone
        room.playback.isPlaying = false;
        room.playback.lastUpdate = Date.now();
        room.playback.hostSocketId = null;
        io.to(roomId).emit("playback:sync", {
          roomId,
          currentTime: computeEffectiveTime(room.playback),
          isPlaying: false,
          serverTimestamp: Date.now(),
        });
        systemMessage(roomId, "Host disconnected — playback paused");
      }

      broadcastMembers(roomId);

      // auto-delete empty room from memory
      if (room.members.size === 0) {
        rooms.delete(roomId);
      }
    }
    socketRooms.clear();
    socketUser.clear();
  };

  socket.on("leave:room", (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (room) {
      const member = room.members.get(data.userId);
      const wasHost = member?.isHost;
      room.members.delete(data.userId);
      if (member) systemMessage(data.roomId, `${member.username} left`, data.userId);
      if (wasHost) {
        room.playback.isPlaying = false;
        room.playback.lastUpdate = Date.now();
        room.playback.hostSocketId = null;
        io.to(data.roomId).emit("playback:sync", {
          roomId: data.roomId,
          currentTime: computeEffectiveTime(room.playback),
          isPlaying: false,
          serverTimestamp: Date.now(),
        });
      }
    }
    socket.leave(data.roomId);
    socketRooms.delete(data.roomId);
    socketUser.delete(data.roomId);
    broadcastMembers(data.roomId);
    if (room && room.members.size === 0) rooms.delete(data.roomId);
  });

  socket.on("disconnect", () => {
    console.log(`[realtime] disconnected: ${socket.id}`);
    handleDisconnect();
  });

  socket.on("error", (err: unknown) => {
    console.error(`[realtime] socket error (${socket.id}):`, err);
  });
});

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[realtime] Cinema Social realtime service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
