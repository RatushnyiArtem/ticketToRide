import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../../context/UserContext";
import Button from "../../components/Button";

interface Game {
  id: string;
  name: string;
  max_players: number;
  current_players: number;
  status: "waiting" | "started" | "finished";
  created_at: string;
}

interface ChatMessage {
  id: number;
  time: string;
  user: string;
  text: string;
  isSystem?: boolean;
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useUser();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [createError, setCreateError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, time: "15:31", user: "system", text: `${user?.username} joined the lobby`, isSystem: true },
  ]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Fetch user profile from API
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

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch("/api/v1/games", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    
    if (!newGameName.trim()) {
      setCreateError("Please enter a game name");
      return;
    }

    setIsCreatingGame(true);
    const gameName = newGameName;

    try {
      const token = localStorage.getItem("ttr_auth_token");
      const response = await fetch("/api/v1/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: gameName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create game");
      }

      const newGame = await response.json();
      setNewGameName("");
      setShowCreateGame(false);
      setCreateError("");
      
      // Add to games list immediately
      setGames((prev) => [newGame, ...prev]);
      addSystemMessage(`✨ ${user?.username} created game: ${gameName}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create game";
      setCreateError(errorMsg);
      addSystemMessage(`❌ Failed to create game: ${errorMsg}`);
      console.error("Failed to create game:", error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleJoinGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const sendMessage = (e: React.FormEvent) => {
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

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f3f5] text-slate-700">
      {/* Header */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <div className="font-bold text-xl tracking-wider flex items-center gap-2">
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
          {/* User Profile Card */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-2xl font-semibold text-slate-600">Your Profile</h2>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold">USERNAME</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{user.username}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-xs text-green-600 font-semibold">EMAIL</p>
                <p className="text-sm font-bold text-green-900 mt-1 break-all">{user.email}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
                <p className="text-xs text-yellow-600 font-semibold">WINS</p>
                <p className="text-lg font-bold text-yellow-900 mt-1">{user.wins || 0}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 border border-purple-200">
                <p className="text-xs text-purple-600 font-semibold">RANK</p>
                <p className="text-lg font-bold text-purple-900 mt-1">#{user.rank || "—"}</p>
              </div>
            </div>
          </div>

          {/* Chat */}
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

          {/* Available Games */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-600">Available Games</h2>
                <p className="mt-1 text-sm text-slate-400">Select a game or create new one</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowCreateGame(!showCreateGame)}
                className="px-4"
              >
                + Create Game
              </Button>
            </div>

            {showCreateGame && (
              <div className="border-b border-slate-100 px-6 py-5 bg-slate-50">
                {createError && (
                  <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">❌ {createError}</p>
                )}
                <form onSubmit={handleCreateGame} className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    placeholder="Enter game name..."
                    disabled={isCreatingGame}
                    className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4bbda6] disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <div className="flex gap-3">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="px-6 flex-1"
                      disabled={isCreatingGame}
                    >
                      {isCreatingGame ? "Creating..." : "Create Game"}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setShowCreateGame(false);
                        setCreateError("");
                        setNewGameName("");
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
              <div className="text-center py-12">
                <p className="text-gray-600">Loading games...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-gray-600 text-lg mb-4">No games available yet</p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateGame(true)}
                  className="px-8"
                >
                  Create the First Game
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="grid grid-cols-1 gap-4 px-6 py-5 hover:bg-slate-50 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-700">{game.name}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            game.status === "waiting"
                              ? "bg-emerald-100 text-emerald-700"
                              : game.status === "started"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {game.status === "waiting"
                            ? "Waiting"
                            : game.status === "started"
                            ? "Playing"
                            : "Finished"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">
                        👥 {game.current_players}/{game.max_players} players · Created{" "}
                        {new Date(game.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {game.status === "waiting" && game.current_players < game.max_players ? (
                        <Button
                          variant="primary"
                          onClick={() => handleJoinGame(game.id)}
                          className="px-4"
                        >
                          Join Game
                        </Button>
                      ) : game.status === "started" ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleJoinGame(game.id)}
                          className="px-4"
                        >
                          Watch
                        </Button>
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500 font-semibold rounded-md bg-gray-100">
                          Full
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="grid gap-7 lg:content-start">
          {/* Current User Profile */}
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

          {/* Stats */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Games</span>
                <span className="font-bold text-slate-700">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Wins</span>
                <span className="font-bold text-emerald-600">{user.wins || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Win Rate</span>
                <span className="font-bold text-slate-700">—%</span>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-700 mb-3">About the Game</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ticket to Ride is a thrilling railway-themed board game where players compete to claim routes and
              complete destination tickets. Strategy, planning, and a bit of luck determine the winner!
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

