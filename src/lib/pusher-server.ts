import Pusher from "pusher";

// Lazy singleton — created on first use to avoid build-time env errors
let _pusher: Pusher | null = null;

export function getPusher(): Pusher {
  if (!_pusher) {
    _pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return _pusher;
}

// Convenience re-export — use getPusher() inside request handlers
export const pusher = new Proxy({} as Pusher, {
  get(_target, prop) {
    return (getPusher() as unknown as Record<string, unknown>)[prop as string];
  },
});

// Channel name for a room
export const roomChannel = (roomId: string) => `room-${roomId}`;

// Event names
export const EVENTS = {
  ROOM_UPDATED: "room-updated",
  PLAYER_JOINED: "player-joined",
  PLAYER_LEFT: "player-left",
} as const;
