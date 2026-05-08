import React, { useMemo, useState } from "react";

type LobbyStatus = "waiting" | "almost" | "playing";

interface ChatMessage {
  id: number;
  time: string;
  user: string;
  text: string;
  isSystem?: boolean;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "in-game" | "away";
}

interface Lobby {
  id: string;
  title: string;
  host: string;
  mode: string;
  players: number;
  maxPlayers: number;
  status: LobbyStatus;
}

const initialMessages: ChatMessage[] = [
  { id: 1, time: "15:31", user: "ratushnyi", text: "хто хоче зіграти?" },
  { id: 2, time: "15:32", user: "goodcoach87", text: "я можу, тільки на 4 гравці" },
  { id: 3, time: "15:33", user: "Zemel9", text: "створюйте лобі" },
  { id: 4, time: "15:34", user: "system", text: "Хлеп joined the lobby menu", isSystem: true },
];

const friends: Friend[] = [
  { id: "f1", name: "ratushnyi", avatar: "🧑‍💻", status: "online" },
  { id: "f2", name: "goodcoach87", avatar: "🚴", status: "in-game" },
  { id: "f3", name: "Zemel9", avatar: "🦉", status: "online" },
  { id: "f4", name: "Булат", avatar: "😎", status: "away" },
  { id: "f5", name: "Dima", avatar: "🐺", status: "online" },
];

const lobbies: Lobby[] = [
  {
    id: "l1",
    title: "Europe Classic",
    host: "ratushnyi",
    mode: "Standard rules",
    players: 2,
    maxPlayers: 5,
    status: "waiting",
  },
  {
    id: "l2",
    title: "Fast Match",
    host: "goodcoach87",
    mode: "Quick game",
    players: 4,
    maxPlayers: 5,
    status: "almost",
  },
  {
    id: "l3",
    title: "Private Room",
    host: "Zemel9",
    mode: "Friends only",
    players: 5,
    maxPlayers: 5,
    status: "playing",
  },
];

function getStatusLabel(status: LobbyStatus) {
  if (status === "waiting") return "Waiting";
  if (status === "almost") return "Almost full";
  return "Playing";
}

function getStatusClass(status: LobbyStatus) {
  if (status === "waiting") return "bg-emerald-100 text-emerald-700";
  if (status === "almost") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export default function LobbyPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [messageText, setMessageText] = useState("");
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(lobbies[0]?.id ?? null);

  const selectedLobby = useMemo(() => {
    return lobbies.find((lobby) => lobby.id === selectedLobbyId) ?? lobbies[0];
  }, [selectedLobbyId]);

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = messageText.trim();
    if (!trimmed) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        time,
        user: "Хлеп",
        text: trimmed,
      },
    ]);
    setMessageText("");
  }

  function createLobby() {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "system",
        text: "New lobby creation will be connected to backend later.",
        isSystem: true,
      },
    ]);
  }

  function startGame() {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        user: "system",
        text: selectedLobby
          ? `Starting game from lobby: ${selectedLobby.title}`
          : "Choose or create a lobby first.",
        isSystem: true,
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-[#f3f3f5] text-slate-700">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-4">≠
            <div className="font-bold text-xl tracking-wider flex items-center gap-2">
              <span className="text-2xl">🚂</span> TICKET TO RIDE
            </div>
          </div>

          <button
            type="button"
            onClick={createLobby}
            className="rounded-lg bg-[#83c34a] px-8 py-4 text-sm font-black uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#74b33d]"
          >
            Создать игру
          </button>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid min-w-0 gap-7">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h1 className="text-2xl font-semibold text-slate-600">Чат лобби</h1>
                <p className="mt-1 text-sm text-slate-400">1482 сейчас онлайн</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                Public room
              </div>
            </div>

            <div className="h-[360px] space-y-3 overflow-y-auto px-6 py-5">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3 text-base">
                  <span className="w-12 shrink-0 text-right text-slate-400">{message.time}</span>
                  <div className="min-w-0 flex-1">
                    {message.isSystem ? (
                      <p className="rounded-lg bg-sky-50 px-3 py-2 text-sky-700">
                        {message.text}
                      </p>
                    ) : (
                      <p className="text-slate-600">
                        <span className="mr-2 rounded-md bg-orange-400 px-2 py-1 text-sm font-black text-white">
                          ★ {message.user}
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
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Введите сообщение и нажмите Enter"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[#83c34a] focus:ring-4 focus:ring-[#83c34a]/10"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-700 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-600">Доступные лобби</h2>
                <p className="mt-1 text-sm text-slate-400">Выберите комнату или создайте новую игру</p>
              </div>
              <button
                type="button"
                onClick={createLobby}
                className="rounded-lg bg-[#ff996d] px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#fb8758]"
              >
                Создать игру
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {lobbies.map((lobby) => {
                const selected = selectedLobbyId === lobby.id;
                return (
                  <button
                    key={lobby.id}
                    type="button"
                    onClick={() => setSelectedLobbyId(lobby.id)}
                    className={`grid w-full grid-cols-1 gap-4 px-6 py-5 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_auto] ${
                      selected ? "bg-emerald-50/70" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-xl text-white">
                        🎲
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-700">{lobby.title}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(lobby.status)}`}>
                            {getStatusLabel(lobby.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          Host: {lobby.host} · {lobby.mode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:justify-end">
                      <span className="text-sm font-bold text-slate-500">
                        {lobby.players}/{lobby.maxPlayers}
                      </span>
                      <span className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-[#83c34a]"
                          style={{ width: `${(lobby.players / lobby.maxPlayers) * 100}%` }}
                        />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-600">Начать игру</h2>
                <p className="mt-1 text-slate-400">
                  {selectedLobby
                    ? `Выбрано лобби: ${selectedLobby.title}`
                    : "Выберите доступное лобби или создайте свое."}
                </p>
              </div>
              <button
                type="button"
                onClick={startGame}
                className="rounded-xl bg-[#83c34a] px-10 py-4 text-base font-black uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#74b33d]"
              >
                Начать игру
              </button>
            </div>
          </div>
        </section>

        <aside className="grid gap-7 lg:content-start">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-3xl shadow-lg">
                  🐱
                </div>
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-700">Хлеп</h2>
                <p className="text-sm text-slate-400">Online · ready to play</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-600">Друзья онлайн</h2>
              <p className="mt-1 text-sm text-slate-400">Пригласите друга в игру</p>
            </div>

            <div className="divide-y divide-slate-100">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-xl">
                      {friend.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-700">{friend.name}</p>
                      <p className="text-sm capitalize text-slate-400">{friend.status}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-500 transition hover:border-[#83c34a] hover:text-[#83c34a]"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
