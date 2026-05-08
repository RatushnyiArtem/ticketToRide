import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";
import Button from "../../components/Button";

interface LobbyPlayer {
  id?: string | number;
  user_id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  image?: string;
}

interface Game {
  id: string;
  name: string;
  max_players: number;
  current_players: number;
  status: "waiting" | "started" | "finished";
  created_at?: string;
  players?: LobbyPlayer[];
}

interface ChatMessage {
  id: number;
  time: string;
  user: string;
  text: string;
  isSystem?: boolean;
}

interface BoardLobbySnapshot {
  gameId: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: Game["status"];
  players: LobbyPlayer[];
  currentUserId?: string | number;
  currentUsername?: string;
  playerToken?: string;
  startedAt: string;
}

const ACTIVE_LOBBY_STORAGE_KEY = "ttr_current_lobby";

const getArrayFromApiResponse = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const response = data as Record<string, unknown>;

    if (Array.isArray(response.games)) return response.games;
    if (Array.isArray(response.lobbies)) return response.lobbies;
    if (Array.isArray(response.results)) return response.results;
    if (Array.isArray(response.data)) return response.data;
  }

  return [];
};

const normalizeGame = (rawGame: unknown): Game | null => {
  if (!rawGame || typeof rawGame !== "object") return null;

  const game = rawGame as Record<string, any>;
  const rawPlayers = Array.isArray(game.players)
    ? game.players
    : Array.isArray(game.users)
    ? game.users
    : Array.isArray(game.members)
    ? game.members
    : [];

  const id = game.id ?? game.game_id ?? game.lobby_id ?? game._id;
  if (id === undefined || id === null) return null;

  const maxPlayers = Number(
    game.max_players ?? game.maxPlayers ?? game.player_limit ?? game.capacity ?? 5,
  );

  const currentPlayers = Number(
    game.current_players ??
      game.currentPlayers ??
      game.players_count ??
      game.player_count ??
      game.users_count ??
      rawPlayers.length ??
      0,
  );

  const status: Game["status"] =
    game.status === "started" || game.status === "finished" ? game.status : "waiting";

  return {
    id: String(id),
    name: String(game.name ?? game.lobby_name ?? game.title ?? "Untitled Lobby"),
    max_players: Number.isFinite(maxPlayers) ? maxPlayers : 5,
    current_players: Number.isFinite(currentPlayers) ? currentPlayers : rawPlayers.length,
    status,
    created_at: game.created_at ?? game.createdAt,
    players: rawPlayers.map((player: any, index: number): LobbyPlayer => ({
      id: player.id ?? player.user_id ?? index,
      user_id: player.user_id,
      username: player.username ?? player.name ?? player.email ?? `Player ${index + 1}`,
      name: player.name ?? player.username ?? player.email,
      email: player.email,
      avatar: player.avatar ?? player.avatar_url ?? player.image,
      avatar_url: player.avatar_url,
      image: player.image,
    })),
  };
};

const normalizeGames = (data: unknown): Game[] => {
  return getArrayFromApiResponse(data)
    .map(normalizeGame)
    .filter((game): game is Game => Boolean(game));
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function LobbyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useUser();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [startingGameId, setStartingGameId] = useState<string | null>(null);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [createError, setCreateError] = useState("");
  const [listError, setListError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      time: "15:31",
      user: "system",
      text: `${user?.username || "Player"} joined the lobby`,
      isSystem: true,
    },
  ]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("ttr_auth_token");
        const response = await fetch("/api/v1/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            user_id: userData.user_id,
            username: userData.username,
            email: userData.email,
            wins: userData.wins || 0,
            rank: userData.rank,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchUserProfile();
    fetchGames();
  }, [isAuthenticated, navigate, setUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(() => {
      fetchGames();
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated]);

  const fetchGames = async () => {
    setIsLoading(true);
    setListError("");

    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch("/api/v1/games", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load available lobbies");
      }

      const data = await response.json();
      setGames(normalizeGames(data));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to load available lobbies";
      setListError(errorMsg);
      console.error("Failed to fetch games:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addSystemMessage = (text: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        time,
        user: "system",
        text,
        isSystem: true,
      },
    ]);
  };

  const isGameFull = (game: Game) => game.current_players >= game.max_players;

  const saveLobbySnapshotForBoard = (game: Game, playerToken?: string) => {
    const fallbackPlayers: LobbyPlayer[] = game.players?.length
      ? game.players
      : Array.from({ length: game.current_players }, (_, index) => ({
          id: index === 0 ? user?.user_id ?? `player-${index + 1}` : `player-${index + 1}`,
          username: index === 0 ? user?.username ?? "You" : `Player ${index + 1}`,
        }));

    const snapshot: BoardLobbySnapshot = {
      gameId: game.id,
      name: game.name,
      maxPlayers: game.max_players,
      currentPlayers: game.current_players,
      status: game.status,
      players: fallbackPlayers,
      currentUserId: user?.user_id,
      currentUsername: user?.username,
      playerToken,
      startedAt: new Date().toISOString(),
    };

    localStorage.setItem(ACTIVE_LOBBY_STORAGE_KEY, JSON.stringify(snapshot));
  };

  const openBoard = (game: Game, playerToken?: string) => {
    saveLobbySnapshotForBoard(game, playerToken);
    navigate(`/game/${game.id}`);
  };

  const handleCreateGame = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!newGameName.trim()) {
      setCreateError("Please enter a lobby name");
      return;
    }

    setIsCreatingGame(true);
    const gameName = newGameName.trim();

    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch("/api/v1/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: gameName,
          host_name: user?.username || "Host",
          max_players: maxPlayers,
        }),
      });

      const createdGame = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(createdGame?.detail || "Failed to create lobby");
      }

      setNewGameName("");
      setMaxPlayers(5);
      setShowCreateGame(false);
      setCreateError("");

      await fetchGames();

      const normalizedCreatedGame = normalizeGame({
        ...createdGame,
        name: createdGame?.name ?? createdGame?.lobby_name ?? gameName,
        max_players: createdGame?.max_players ?? maxPlayers,
        current_players: createdGame?.current_players ?? 1,
        status: createdGame?.status ?? "waiting",
        players: createdGame?.players ?? [{ id: user?.user_id, username: user?.username || "Host" }],
      });

      if (normalizedCreatedGame) {
        setGames((prev) => {
          const alreadyExists = prev.some((game) => game.id === normalizedCreatedGame.id);
          return alreadyExists ? prev : [normalizedCreatedGame, ...prev];
        });
      }

      addSystemMessage(`✨ ${user?.username} created lobby: ${gameName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create lobby";
      setCreateError(errorMsg);
      addSystemMessage(`❌ Failed to create lobby: ${errorMsg}`);
      console.error("Failed to create game:", error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    setJoiningGameId(gameId);

    const currentGame = games.find((game) => game.id === gameId);

    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch(`/api/v1/games/${gameId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          player_name: user?.username || "Player",
        }),
      });

      if (response.status === 404 || response.status === 405) {
        if (currentGame) openBoard(currentGame);
        else navigate(`/game/${gameId}`);
        return;
      }

      const joinData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(joinData?.detail || "Failed to join lobby");
      }

      const playerToken = joinData?.player_token;
      if (playerToken) {
        localStorage.setItem(`ttr_player_token_${gameId}`, playerToken);
      }

      const updatedGame = normalizeGame({
        ...currentGame,
        ...joinData,
        id: joinData?.game_id ?? currentGame?.id ?? gameId,
        name: joinData?.name ?? currentGame?.name ?? "Lobby",
        max_players: joinData?.max_players ?? currentGame?.max_players ?? 5,
        current_players:
          joinData?.current_players ??
          joinData?.players_count ??
          Math.min((currentGame?.current_players ?? 0) + 1, currentGame?.max_players ?? 5),
        status: joinData?.status ?? currentGame?.status ?? "waiting",
        players:
          joinData?.players ??
          currentGame?.players ??
          [{ id: user?.user_id, username: user?.username || "Player" }],
      });

      if (updatedGame && (isGameFull(updatedGame) || updatedGame.status === "started")) {
        openBoard(updatedGame, playerToken);
        return;
      }

      await fetchGames();
      addSystemMessage(`✅ ${user?.username} joined lobby. Waiting for more players...`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to join lobby";
      addSystemMessage(`❌ ${errorMsg}`);
      console.error("Failed to join game:", error);
    } finally {
      setJoiningGameId(null);
    }
  };

  const handleStartGame = async (game: Game) => {
    setStartingGameId(game.id);

    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch(`/api/v1/games/${game.id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 404 || response.status === 405) {
        openBoard({ ...game, status: "started" });
        return;
      }

      const startData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(startData?.detail || "Failed to start game");
      }

      const startedGame = normalizeGame({
        ...game,
        ...startData,
        id: startData?.game_id ?? game.id,
        status: startData?.status ?? "started",
        players: startData?.players ?? game.players,
      });

      openBoard(startedGame ?? { ...game, status: "started" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start game";
      addSystemMessage(`❌ ${errorMsg}`);
      console.error("Failed to start game:", error);
    } finally {
      setStartingGameId(null);
    }
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        time,
        user: user?.username || "Unknown",
        text: trimmed,
      },
    ]);

    setMessageText("");
  };

  const renderLobbyAvatars = (game: Game) => {
    const realPlayers: LobbyPlayer[] = game.players ?? [];

    const playersToRender: LobbyPlayer[] = realPlayers.length
      ? realPlayers
      : Array.from(
          { length: game.current_players },
          (_, index): LobbyPlayer => ({
            id: `filled-${index}`,
            username: index === 0 ? "Host" : `P${index + 1}`,
          }),
        );

    const freeSlots = Math.max(game.max_players - playersToRender.length, 0);

    return (
      <div className="mt-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          {playersToRender.slice(0, game.max_players).map((player, index) => {
            const playerName = player.username ?? player.name ?? `P${index + 1}`;
            const avatarUrl = player.avatar ?? player.avatar_url ?? player.image;

            return (
              <div
                key={player.id ?? index}
                title={playerName}
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-[#4bbda6] to-[#2a8b7d] text-xs font-black text-white shadow-sm"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={playerName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  getInitials(playerName)
                )}
              </div>
            );
          })}

          {Array.from({ length: freeSlots }).map((_, index) => (
            <div
              key={`empty-${index}`}
              title="Empty slot"
              className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-slate-100 text-xs font-black text-slate-400 shadow-sm"
            >
              +
            </div>
          ))}
        </div>

        <span className="text-sm font-semibold text-slate-500">
          {game.current_players}/{game.max_players} players
        </span>
      </div>
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa]">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f3f5] text-slate-700">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xl font-bold tracking-wider">
              <span className="text-2xl">🚂</span> TICKET TO RIDE
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-slate-500">Welcome,</p>
              <p className="font-bold text-slate-700">{user.username}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                localStorage.removeItem("ttr_auth_token");
                localStorage.removeItem(ACTIVE_LOBBY_STORAGE_KEY);
                navigate("/login");
              }}
              className="px-4"
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid min-w-0 gap-7">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-600">Your Profile</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">USERNAME</p>
                <p className="mt-1 text-lg font-bold text-blue-900">{user.username}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-600">EMAIL</p>
                <p className="mt-1 break-all text-sm font-bold text-green-900">{user.email}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-xs font-semibold text-yellow-600">WINS</p>
                <p className="mt-1 text-lg font-bold text-yellow-900">{user.wins || 0}</p>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <p className="text-xs font-semibold text-purple-600">RANK</p>
                <p className="mt-1 text-lg font-bold text-purple-900">#{user.rank || "—"}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h1 className="text-2xl font-semibold text-slate-600">Lobby Chat</h1>
                <p className="mt-1 text-sm text-slate-400">Join the conversation</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                Public room
              </div>
            </div>

            <div className="h-[320px] space-y-3 overflow-y-auto px-6 py-5">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3 text-sm">
                  <span className="w-12 shrink-0 text-right text-slate-400">{message.time}</span>
                  <div className="min-w-0 flex-1">
                    {message.isSystem ? (
                      <p className="rounded-lg bg-sky-50 px-3 py-2 text-sky-700">{message.text}</p>
                    ) : (
                      <p className="text-slate-600">
                        <span className="mr-2 rounded-md bg-[#4bbda6] px-2 py-1 text-xs font-bold text-white">
                          {message.user}
                        </span>
                        <span>{message.text}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="border-t border-slate-100 p-5">
              <div className="flex gap-3">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enter message..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#4bbda6] focus:ring-2 focus:ring-[#4bbda6]/20"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-4 py-3 font-bold text-white transition hover:bg-slate-800"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-600">Available Lobbies</h2>
                <p className="mt-1 text-sm text-slate-400">When lobby is full, start the game and choose hidden tickets</p>
              </div>
              <Button variant="primary" onClick={() => setShowCreateGame(!showCreateGame)} className="px-4">
                + Create Lobby
              </Button>
            </div>

            {showCreateGame && (
              <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                {createError && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">❌ {createError}</p>}

                <form onSubmit={handleCreateGame} className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Lobby Name</label>
                    <input
                      type="text"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      placeholder="Enter lobby name..."
                      disabled={isCreatingGame}
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4bbda6] disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Max Players</label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      disabled={isCreatingGame}
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#4bbda6] disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value={2}>2 Players</option>
                      <option value={3}>3 Players</option>
                      <option value={4}>4 Players</option>
                      <option value={5}>5 Players</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="primary" type="submit" className="flex-1 px-6" disabled={isCreatingGame}>
                      {isCreatingGame ? "Creating..." : "Create Lobby"}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setShowCreateGame(false);
                        setCreateError("");
                        setNewGameName("");
                        setMaxPlayers(5);
                      }}
                      className="px-6"
                      disabled={isCreatingGame}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {isLoading ? (
              <div className="py-12 text-center">
                <p className="text-gray-600">Loading lobbies...</p>
              </div>
            ) : listError ? (
              <div className="px-6 py-10 text-center">
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">❌ {listError}</p>
                <Button variant="secondary" onClick={fetchGames} className="px-8">
                  Try Again
                </Button>
              </div>
            ) : games.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="mb-4 text-lg text-gray-600">No lobbies available yet</p>
                <Button variant="primary" onClick={() => setShowCreateGame(true)} className="px-8">
                  Create the First Lobby
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 p-6">
                {games.map((game) => {
                  const full = isGameFull(game);
                  const isJoinable = game.status === "waiting" && !full;
                  const canOpenBoard = game.status === "started" || full;

                  return (
                    <div
                      key={game.id}
                      className="grid grid-cols-1 items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#4bbda6]/40 hover:shadow-md md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="truncate text-xl font-black text-slate-700">{game.name}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              game.status === "started" || full
                                ? "bg-amber-100 text-amber-700"
                                : game.status === "waiting"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {game.status === "started" ? "Started" : full ? "Full" : game.status === "waiting" ? "Waiting" : "Finished"}
                          </span>
                        </div>

                        {renderLobbyAvatars(game)}
                      </div>

                      <div className="flex justify-end">
                        {isJoinable ? (
                          <Button
                            variant="primary"
                            onClick={() => handleJoinGame(game.id)}
                            className="min-w-32 px-6"
                            disabled={joiningGameId === game.id}
                          >
                            {joiningGameId === game.id ? "Joining..." : "Join"}
                          </Button>
                        ) : canOpenBoard ? (
                          <Button
                            variant="primary"
                            onClick={() => handleStartGame(game)}
                            className="min-w-32 px-6"
                            disabled={startingGameId === game.id}
                          >
                            {startingGameId === game.id ? "Starting..." : game.status === "started" ? "Open Game" : "Start Game"}
                          </Button>
                        ) : (
                          <div className="min-w-32 rounded-md bg-gray-100 px-6 py-2 text-center text-sm font-semibold text-gray-500">
                            Finished
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="grid gap-7 lg:content-start">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#4bbda6] to-[#2a8b7d] text-3xl shadow-lg">
                  👤
                </div>
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-700">{user.username}</h2>
                <p className="text-sm text-slate-400">Online · ready to play</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-700">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Games</span>
                <span className="font-bold text-slate-700">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Wins</span>
                <span className="font-bold text-emerald-600">{user.wins || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Win Rate</span>
                <span className="font-bold text-slate-700">—%</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}