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

function sendIfOpen(socket: WebSocket, payload: unknown): boolean {
  if (socket.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
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
  const wsUrl = buildWsUrl(gameId, token);
  console.log('Connecting to WebSocket:', wsUrl);

  const socket = new WebSocket(wsUrl);

  // Set longer timeouts for connection
  socket.onopen = () => {
    console.log('WebSocket connected');
    handlers.onOpen?.();
  };

  socket.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    handlers.onClose?.(event);
  };

  socket.onerror = (event) => {
    const errorMsg = event instanceof Event ? 'WebSocket connection error' : String(event);
    console.error('WebSocket error:', errorMsg, event);
    handlers.onError?.(errorMsg);
  };

  socket.onmessage = (event) => {
    try {
      handlers.onMessage?.(JSON.parse(event.data) as GameSocketEvent);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      handlers.onError?.("Invalid WebSocket message");
    }
  };

  return {
    socket,
    ping: () => sendIfOpen(socket, { type: "ping" }),
    requestState: () => sendIfOpen(socket, { type: "request_state" }),
    startGame: (hostToken: string) => sendIfOpen(socket, { type: "start_game", host_token: hostToken }),
    claimRoute: (playerToken: string, routeId: number, claimColor: string) =>
      sendIfOpen(socket, {
        type: "claim_route",
        player_token: playerToken,
        route_id: routeId,
        claim_color: claimColor,
      }),
    drawBlindCard: (playerToken: string) =>
      sendIfOpen(socket, {
        type: "draw_blind_card",
        player_token: playerToken,
      }),
    drawMarketCard: (playerToken: string, marketIndex: number) =>
      sendIfOpen(socket, {
        type: "draw_market_card",
        player_token: playerToken,
        market_index: marketIndex,
      }),
    endTurn: (playerToken: string) =>
      sendIfOpen(socket, {
        type: "end_turn",
        player_token: playerToken,
      }),
    close: () => socket.close(),
  };
}
