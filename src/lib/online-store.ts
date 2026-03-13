import { create } from "zustand";
import Pusher, { Channel } from "pusher-js";
import type { OnlineRoom } from "./db";

export interface OnlineGameState {
  // Connection state
  roomId: string | null;
  playerId: string | null;
  room: OnlineRoom | null;
  isConnecting: boolean;
  error: string | null;

  // Pusher internals (not for UI use)
  _pusherClient: Pusher | null;
  _pusherChannel: Channel | null;

  // Actions
  createRoom: (hostName: string, maxRounds?: number) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  refreshRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  startGuessing: () => Promise<void>;
  setDialAngle: (angle: number) => Promise<void>;
  revealAndScore: () => Promise<void>;
  nextTurn: () => Promise<void>;
  resetGame: () => Promise<void>;
  clearError: () => void;
  _subscribeToRoom: (roomId: string) => void;
}

async function callAction(roomId: string, action: Record<string, unknown>) {
  const res = await fetch("/api/room/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, action }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Unknown error");
  }
  return res.json();
}

export const useOnlineStore = create<OnlineGameState>((set, get) => ({
  roomId: null,
  playerId: null,
  room: null,
  isConnecting: false,
  error: null,
  _pusherClient: null,
  _pusherChannel: null,

  createRoom: async (hostName, maxRounds = 8) => {
    set({ isConnecting: true, error: null });
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, maxRounds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }
      const { room, playerId } = await res.json();
      // Subscribe first, then update state so we don't miss any early events
      get()._subscribeToRoom(room.id);
      set({ room, roomId: room.id, playerId, isConnecting: false });
    } catch (err) {
      set({ error: (err as Error).message, isConnecting: false });
    }
  },

  joinRoom: async (roomId, playerName) => {
    set({ isConnecting: true, error: null });
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: roomId.toUpperCase().trim(), playerName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join room");
      }
      const { room, playerId } = await res.json();
      get()._subscribeToRoom(room.id);
      set({ room, roomId: room.id, playerId, isConnecting: false });
    } catch (err) {
      set({ error: (err as Error).message, isConnecting: false });
    }
  },

  leaveRoom: () => {
    const { _pusherChannel, _pusherClient } = get();
    if (_pusherChannel) {
      _pusherChannel.unbind_all();
      _pusherChannel.unsubscribe();
    }
    if (_pusherClient) {
      _pusherClient.disconnect();
    }
    set({
      roomId: null,
      playerId: null,
      room: null,
      _pusherClient: null,
      _pusherChannel: null,
      error: null,
    });
  },

  refreshRoom: async () => {
    const { roomId } = get();
    if (!roomId) return;
    try {
      const res = await fetch(`/api/room?roomId=${roomId}`);
      if (!res.ok) return;
      const { room } = await res.json();
      set({ room });
    } catch {
      // silently ignore — will retry on next event
    }
  },

  startGame: async () => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    set({ isConnecting: true });
    try {
      await callAction(roomId, { type: "start_game", playerId });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ isConnecting: false });
    }
  },

  startGuessing: async () => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    try {
      await callAction(roomId, { type: "start_guessing", playerId });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setDialAngle: async (angle: number) => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    // Optimistically update local state for smooth dragging
    set((s) => s.room ? { room: { ...s.room!, dialAngle: angle } } : {});
    try {
      await callAction(roomId, { type: "set_dial", playerId, angle });
    } catch {
      // silently ignore dial sync errors — next broadcast will correct it
    }
  },

  revealAndScore: async () => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    try {
      await callAction(roomId, { type: "reveal_and_score", playerId });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  nextTurn: async () => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    try {
      await callAction(roomId, { type: "next_turn", playerId });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  resetGame: async () => {
    const { roomId, playerId } = get();
    if (!roomId || !playerId) return;
    try {
      await callAction(roomId, { type: "reset_game", playerId });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearError: () => set({ error: null }),

  // Internal: subscribe to Pusher room channel
  _subscribeToRoom: (roomId: string) => {
    // Tear down any existing connection first
    const { _pusherChannel, _pusherClient } = get();
    if (_pusherChannel) {
      _pusherChannel.unbind_all();
      _pusherChannel.unsubscribe();
    }
    if (_pusherClient) {
      _pusherClient.disconnect();
    }

    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusherClient.subscribe(`room-${roomId}`);

    channel.bind("room-updated", (data: { room: OnlineRoom }) => {
      set({ room: data.room });
    });

    // Smooth dial sync — lightweight event, no full room update
    channel.bind("dial-moved", (data: { angle: number }) => {
      set((s) => s.room ? { room: { ...s.room!, dialAngle: data.angle } } : {});
    });

    // Re-fetch full room state on reconnect in case we missed events
    pusherClient.connection.bind("connected", () => {
      get().refreshRoom();
    });

    set({ _pusherClient: pusherClient, _pusherChannel: channel });
  },
}));
