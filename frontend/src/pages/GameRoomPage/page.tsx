import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Button from "../../components/Button";
import { getAuthToken } from "../../lib/authApi";
import { getGameState, type GameState } from "../../lib/gameApi";
import { connectGameSocket, type GameSocketEvent } from "../../lib/gameSocket";

const playerTokenKey = (gameId: string) => `ttr_player_token_${gameId}`;
const playerIdKey = (gameId: string) => `ttr_player_id_${gameId}`;

export default function GameRoomPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "closed" | "error">("connecting");
  const [error, setError] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const socketRef = useRef<ReturnType<typeof connectGameSocket> | null>(null);
  const pendingActionRef = useRef<"start" | "claim" | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const token = useMemo(() => (gameId ? localStorage.getItem(playerTokenKey(gameId)) ?? "" : ""), [gameId]);
  const playerId = useMemo(() => (gameId ? localStorage.getItem(playerIdKey(gameId)) ?? "" : ""), [gameId]);
  const isMyTurn = Boolean(game?.current_player_id && playerId && game.current_player_id === playerId);

  useEffect(() => {
    if (!gameId) {
      navigate("/lobby");
      return;
    }

    if (!getAuthToken()) {
      navigate("/login");
      return;
    }

    if (!token) {
      setError("Missing game token. Join or create the game from lobby again.");
      return;
    }

    let alive = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const loadState = async () => {
      try {
        const state = await getGameState(gameId);
        if (alive) {
          setGame(state);
          setError("");
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Failed to load game state");
      }
    };

    const connectSocket = () => {
      clearReconnectTimer();
      shouldReconnectRef.current = true;
      socketRef.current = connectGameSocket(gameId, token, {
        onOpen: () => {
          if (!alive) return;
          setConnectionStatus("connected");
          setError("");
          reconnectAttemptsRef.current = 0;
          void socketRef.current?.requestState();
        },
        onClose: (event) => {
          if (!alive) return;

          const wasIntentional = !shouldReconnectRef.current;
          if (!wasIntentional) {
            const closeReason = event.reason ? `${event.code}: ${event.reason}` : `code ${event.code}`;
            setConnectionStatus("closed");
            setError(`WS closed (${closeReason}). Reconnecting...`);

            if (reconnectAttemptsRef.current < 5) {
              reconnectAttemptsRef.current += 1;
              const delay = Math.min(5000, reconnectAttemptsRef.current * 1000);
              reconnectTimerRef.current = window.setTimeout(connectSocket, delay);
            }
          }
        },
        onError: (message) => alive && setError(message),
        onMessage: (event: GameSocketEvent) => {
          if (!alive) return;

          if (event.type === "game_state") {
            setGame(event.payload as GameState);
            setError("");
            if (pendingActionRef.current) {
              pendingActionRef.current = null;
              setSelectedRouteId(null);
              setActionLoading(false);
            }
          }

          if (event.type === "presence") {
            const connected = Number((event.payload as { connected?: number } | undefined)?.connected ?? 0);
            setConnectedPeers(Number.isFinite(connected) ? connected : 0);
          }

          if (event.type === "error") {
            const detail = (event.payload as { detail?: string } | undefined)?.detail;
            setError(detail || "WebSocket action failed");
            pendingActionRef.current = null;
            setActionLoading(false);
          }
        },
      });
    };

    void loadState();
    connectSocket();
    setConnectionStatus("connecting");

    return () => {
      alive = false;
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [gameId, navigate, token]);

  const handleStart = async () => {
    if (!gameId || !token) return;
    setActionLoading(true);
    setError("");
    const socket = socketRef.current;
    const usingSocket = socket?.socket.readyState === WebSocket.OPEN;
    try {
      if (usingSocket) {
        pendingActionRef.current = "start";
        socket.startGame(token);
      } else {
        const response = await fetch(`/api/v1/games/${gameId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host_token: token }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Failed to start game");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      pendingActionRef.current = null;
    } finally {
      if (!usingSocket) setActionLoading(false);
    }
  };

  const handleClaim = async (routeId: number) => {
    if (!gameId || !token) return;
    setActionLoading(true);
    setError("");
    const socket = socketRef.current;
    const usingSocket = socket?.socket.readyState === WebSocket.OPEN;
    try {
      if (usingSocket) {
        pendingActionRef.current = "claim";
        socket.claimRoute(token, routeId);
      } else {
        const response = await fetch(`/api/v1/games/${gameId}/claim-route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_token: token, route_id: routeId }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail || "Failed to claim route");
        setSelectedRouteId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim route");
      pendingActionRef.current = null;
    } finally {
      if (!usingSocket) setActionLoading(false);
    }
  };

  if (!gameId) return null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Online game room</p>
              <h1 className="mt-1 text-3xl font-black">{game?.name ?? `Game ${gameId}`}</h1>
              <p className="mt-2 text-sm text-slate-400">Game ID: {gameId}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
                WS: {connectionStatus}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
                Connected: {connectedPeers}
              </span>
              <Button variant="secondary" onClick={() => navigate("/lobby")}>Back to lobby</Button>
              {game?.status === "waiting" && (
                <Button variant="primary" onClick={handleStart} disabled={actionLoading}>
                  Start game
                </Button>
              )}
              <Button variant="secondary" onClick={() => socketRef.current?.requestState()}>
                Refresh via WS
              </Button>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">{error}</p> : null}
          {!token ? <p className="mt-4 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-100">No player token found for this lobby.</p> : null}
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">Players</h2>
                <p className="text-sm text-slate-400">Turn order and live updates are broadcast over WebSocket.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
                {game?.status ?? "loading"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(game?.players ?? []).map((player) => {
                const active = game?.current_player_id === player.id;
                const mine = player.id === playerId;

                return (
                  <div
                    key={player.id}
                    className={`rounded-2xl border p-4 ${active ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/5"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{player.name}</p>
                        <p className="text-sm text-slate-400">Turn #{player.turn_order}</p>
                      </div>
                      <div className="text-right text-sm font-bold text-slate-200">
                        <div>{player.score} pts</div>
                        <div>{player.train_cars_left} trains</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
                      {active && <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">Current turn</span>}
                      {mine && <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-cyan-200">You</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
              <h2 className="text-2xl font-black">Routes</h2>
              <p className="mt-1 text-sm text-slate-400">Click a free route to claim it. The backend will broadcast the result to all players.</p>

              <div className="mt-5 grid gap-2 max-h-[29rem] overflow-auto pr-1">
                {(game?.routes ?? []).map((route) => {
                  const claimed = Boolean(route.claimed_by_player_id);
                  const selected = selectedRouteId === route.id;

                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`rounded-2xl border p-3 text-left transition ${selected ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">{route.city_a} → {route.city_b}</p>
                          <p className="text-sm text-slate-400">Length {route.length} · {route.points} pts</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${claimed ? "bg-red-500/20 text-red-200" : "bg-emerald-400/20 text-emerald-200"}`}>
                          {claimed ? "Claimed" : "Free"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!selectedRouteId || !isMyTurn || actionLoading}
                  onClick={() => selectedRouteId && handleClaim(selectedRouteId)}
                >
                  Claim selected route
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-xl font-black">Turn / status</h3>
              <p className="mt-2 text-sm text-slate-400">
                {isMyTurn ? "Your turn" : "Waiting for other player"}
              </p>
              <p className="mt-3 text-sm text-slate-300">
                Current player id: <span className="font-bold">{game?.current_player_id ?? "—"}</span>
              </p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-xl">
              <h3 className="text-xl font-black">Latest turns</h3>
              <div className="mt-4 space-y-2">
                {(game?.turns ?? []).slice(-6).reverse().map((turn) => (
                  <div key={turn.id} className="rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
                    <div className="font-bold text-slate-100">{turn.action}</div>
                    <div className="text-slate-400">Player: {turn.player_id}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}




