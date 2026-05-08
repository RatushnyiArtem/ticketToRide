export type GamePlayer = {
  id: string;
  name: string;
  score: number;
  train_cars_left: number;
  turn_order: number;
};

export type GameRoute = {
  id: number;
  city_a: string;
  city_b: string;
  length: number;
  points: number;
  claimed_by_player_id: string | null;
};

export type GameTurn = {
  id: number;
  player_id: string;
  action: string;
  payload: string;
  created_at: string;
};

export type GameState = {
  id: string;
  name: string;
  status: string;
  max_players: number;
  current_player_id: string | null;
  players: GamePlayer[];
  routes: GameRoute[];
  turns: GameTurn[];
};

export type CreateGamePayload = {
  name: string;
  host_name: string;
  max_players: number;
};

export type JoinGamePayload = {
  player_name: string;
};

export type StartGamePayload = {
  host_token: string;
};

export type ClaimRoutePayload = {
  player_token: string;
  route_id: number;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function buildApiUrl(path: string): string {
  const normalizedBase = API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "Request failed";
    throw new Error(detail);
  }

  return data as T;
}

export function getGameState(gameId: string) {
  return requestJson<GameState>(`/v1/games/${gameId}`, { method: "GET" });
}

export function startGame(gameId: string, payload: StartGamePayload) {
  return requestJson<void>(`/v1/games/${gameId}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function claimRoute(gameId: string, payload: ClaimRoutePayload) {
  return requestJson<void>(`/v1/games/${gameId}/claim-route`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

