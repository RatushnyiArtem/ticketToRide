export type GameSocketEvent = {
  type: string;
  payload?: unknown;
};

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;

function buildWsUrl(gameId: string, token: string): string {
  if (WS_BASE_URL) {
    const normalizedBase = WS_BASE_URL.replace(/\/$/, "");
    return `${normalizedBase}/api/v1/realtime/games/${gameId}?token=${encodeURIComponent(token)}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/v1/realtime/games/${gameId}?token=${encodeURIComponent(token)}`;
}

export function connectGameSocket(
  gameId: string,
  token: string,
  handlers: {
    onOpen?: () => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (message: string) => void;
    onMessage?: (event: GameSocketEvent) => void;
  },
) {
  const socket = new WebSocket(buildWsUrl(gameId, token));

  socket.onopen = () => handlers.onOpen?.();
  socket.onclose = (event) => handlers.onClose?.(event);
  socket.onerror = () => handlers.onError?.("WebSocket connection error");
  socket.onmessage = (event) => {
    try {
      handlers.onMessage?.(JSON.parse(event.data) as GameSocketEvent);
    } catch {
      handlers.onError?.("Invalid WebSocket message");
    }
  };

  return {
    socket,
    ping: () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "ping" })),
    requestState: () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "request_state" })),
    startGame: (hostToken: string) =>
      socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "start_game", host_token: hostToken })),
    claimRoute: (playerToken: string, routeId: number) =>
      socket.readyState === WebSocket.OPEN &&
      socket.send(JSON.stringify({ type: "claim_route", player_token: playerToken, route_id: routeId })),
    close: () => socket.close(),
  };
}

