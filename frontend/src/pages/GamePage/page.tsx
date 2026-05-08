import { useMemo, useState } from "react";
import europeMap from "./europe-map.jpg";

type PlayerColor = "red" | "blue" | "green" | "yellow" | "black";
type CardColor =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "black"
  | "white"
  | "orange"
  | "pink"
  | "wild";
type RouteColor = Exclude<CardColor, "wild"> | "gray";

type CityId =
  | "london"
  | "paris"
  | "amsterdam"
  | "berlin"
  | "frankfurt"
  | "zurich"
  | "marseille"
  | "barcelona"
  | "madrid"
  | "rome"
  | "venezia"
  | "munich"
  | "vienna"
  | "budapest"
  | "warsaw"
  | "kyiv"
  | "moscow"
  | "stockholm"
  | "copenhagen"
  | "riga"
  | "sofia"
  | "athens"
  | "constantinople"
  | "bucharest";

interface City {
  id: CityId;
  name: string;
  x: number;
  y: number;
}

interface Route {
  id: string;
  from: CityId;
  to: CityId;
  color: RouteColor;
  length: number;
  points: number;
  ownerId?: string;
}

interface Ticket {
  from: CityId;
  to: CityId;
  points: number;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  colorHex: string;
  score: number;
  trains: number;
  hand: Record<CardColor, number>;
  tickets: Ticket[];
  isHuman: boolean;
}

interface LogItem {
  id: number;
  text: string;
}

const CARD_COLORS: CardColor[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "orange",
  "pink",
  "wild",
];

const CARD_META: Record<CardColor, { label: string; className: string; symbol: string }> = {
  red: { label: "Red", className: "bg-red-500 text-white", symbol: "▰" },
  blue: { label: "Blue", className: "bg-blue-500 text-white", symbol: "▰" },
  green: { label: "Green", className: "bg-green-500 text-slate-950", symbol: "▰" },
  yellow: { label: "Yellow", className: "bg-yellow-400 text-slate-950", symbol: "▰" },
  black: { label: "Black", className: "bg-zinc-950 text-white", symbol: "▰" },
  white: { label: "White", className: "bg-slate-50 text-slate-950", symbol: "▰" },
  orange: { label: "Orange", className: "bg-orange-500 text-white", symbol: "▰" },
  pink: { label: "Pink", className: "bg-pink-500 text-white", symbol: "▰" },
  wild: {
    label: "Wild",
    className: "bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 text-white",
    symbol: "★",
  },
};

const ROUTE_META: Record<RouteColor, { hex: string; label: string }> = {
  red: { hex: "#ef4444", label: "Red" },
  blue: { hex: "#3b82f6", label: "Blue" },
  green: { hex: "#22c55e", label: "Green" },
  yellow: { hex: "#facc15", label: "Yellow" },
  black: { hex: "#18181b", label: "Black" },
  white: { hex: "#f8fafc", label: "White" },
  orange: { hex: "#f97316", label: "Orange" },
  pink: { hex: "#ec4899", label: "Pink" },
  gray: { hex: "#94a3b8", label: "Any" },
};

const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  black: "#3f3f46",
};

const cities: City[] = [
  { id: "london", name: "London", x: 18, y: 22 },
  { id: "paris", name: "Paris", x: 23, y: 33 },
  { id: "amsterdam", name: "Amsterdam", x: 29, y: 23 },
  { id: "berlin", name: "Berlin", x: 42, y: 24 },
  { id: "frankfurt", name: "Frankfurt", x: 36, y: 32 },
  { id: "zurich", name: "Zürich", x: 36, y: 42 },
  { id: "marseille", name: "Marseille", x: 30, y: 52 },
  { id: "barcelona", name: "Barcelona", x: 20, y: 57 },
  { id: "madrid", name: "Madrid", x: 12, y: 56 },
  { id: "rome", name: "Roma", x: 44, y: 58 },
  { id: "venezia", name: "Venezia", x: 43, y: 47 },
  { id: "munich", name: "München", x: 43, y: 37 },
  { id: "vienna", name: "Wien", x: 52, y: 38 },
  { id: "budapest", name: "Budapest", x: 58, y: 43 },
  { id: "warsaw", name: "Warszawa", x: 59, y: 27 },
  { id: "kyiv", name: "Kyiv", x: 71, y: 33 },
  { id: "moscow", name: "Moskva", x: 82, y: 22 },
  { id: "stockholm", name: "Stockholm", x: 54, y: 9 },
  { id: "copenhagen", name: "København", x: 45, y: 17 },
  { id: "riga", name: "Riga", x: 66, y: 15 },
  { id: "sofia", name: "Sofia", x: 63, y: 57 },
  { id: "athens", name: "Athina", x: 66, y: 68 },
  { id: "constantinople", name: "Constantinople", x: 77, y: 61 },
  { id: "bucharest", name: "București", x: 70, y: 51 },
];

const initialRoutes: Route[] = [
  { id: "london-paris", from: "london", to: "paris", color: "gray", length: 2, points: 2 },
  { id: "london-amsterdam", from: "london", to: "amsterdam", color: "orange", length: 2, points: 2 },
  { id: "paris-amsterdam", from: "paris", to: "amsterdam", color: "yellow", length: 3, points: 4 },
  { id: "paris-frankfurt", from: "paris", to: "frankfurt", color: "white", length: 3, points: 4 },
  { id: "amsterdam-berlin", from: "amsterdam", to: "berlin", color: "blue", length: 3, points: 4 },
  { id: "berlin-warsaw", from: "berlin", to: "warsaw", color: "pink", length: 4, points: 7 },
  { id: "berlin-frankfurt", from: "berlin", to: "frankfurt", color: "black", length: 3, points: 4 },
  { id: "frankfurt-munich", from: "frankfurt", to: "munich", color: "red", length: 2, points: 2 },
  { id: "munich-vienna", from: "munich", to: "vienna", color: "orange", length: 3, points: 4 },
  { id: "vienna-budapest", from: "vienna", to: "budapest", color: "red", length: 1, points: 1 },
  { id: "budapest-bucharest", from: "budapest", to: "bucharest", color: "white", length: 4, points: 7 },
  { id: "bucharest-constantinople", from: "bucharest", to: "constantinople", color: "yellow", length: 3, points: 4 },
  { id: "constantinople-athens", from: "constantinople", to: "athens", color: "black", length: 2, points: 2 },
  { id: "sofia-athens", from: "sofia", to: "athens", color: "green", length: 3, points: 4 },
  { id: "budapest-sofia", from: "budapest", to: "sofia", color: "pink", length: 4, points: 7 },
  { id: "venezia-vienna", from: "venezia", to: "vienna", color: "green", length: 2, points: 2 },
  { id: "venezia-rome", from: "venezia", to: "rome", color: "gray", length: 2, points: 2 },
  { id: "marseille-rome", from: "marseille", to: "rome", color: "red", length: 4, points: 7 },
  { id: "zurich-marseille", from: "zurich", to: "marseille", color: "orange", length: 2, points: 2 },
  { id: "zurich-venezia", from: "zurich", to: "venezia", color: "pink", length: 2, points: 2 },
  { id: "frankfurt-zurich", from: "frankfurt", to: "zurich", color: "green", length: 2, points: 2 },
  { id: "marseille-barcelona", from: "marseille", to: "barcelona", color: "yellow", length: 4, points: 7 },
  { id: "barcelona-madrid", from: "barcelona", to: "madrid", color: "blue", length: 3, points: 4 },
  { id: "madrid-paris", from: "madrid", to: "paris", color: "black", length: 4, points: 7 },
  { id: "warsaw-kyiv", from: "warsaw", to: "kyiv", color: "gray", length: 4, points: 7 },
  { id: "kyiv-moscow", from: "kyiv", to: "moscow", color: "red", length: 4, points: 7 },
  { id: "stockholm-copenhagen", from: "stockholm", to: "copenhagen", color: "yellow", length: 3, points: 4 },
  { id: "copenhagen-berlin", from: "copenhagen", to: "berlin", color: "white", length: 3, points: 4 },
  { id: "stockholm-riga", from: "stockholm", to: "riga", color: "green", length: 4, points: 7 },
  { id: "riga-warsaw", from: "riga", to: "warsaw", color: "gray", length: 4, points: 7 },
  { id: "riga-moscow", from: "riga", to: "moscow", color: "blue", length: 5, points: 10 },
];

const initialTickets: Ticket[] = [
  { from: "london", to: "rome", points: 10 },
  { from: "paris", to: "moscow", points: 18 },
  { from: "madrid", to: "constantinople", points: 16 },
  { from: "stockholm", to: "athens", points: 21 },
  { from: "berlin", to: "kyiv", points: 8 },
  { from: "amsterdam", to: "bucharest", points: 13 },
  { from: "barcelona", to: "vienna", points: 9 },
  { from: "copenhagen", to: "sofia", points: 12 },
  { from: "zurich", to: "warsaw", points: 7 },
  { from: "marseille", to: "budapest", points: 8 },
];

function emptyHand(): Record<CardColor, number> {
  return {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    black: 0,
    white: 0,
    orange: 0,
    pink: 0,
    wild: 0,
  };
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeDeck(): CardColor[] {
  const deck: CardColor[] = [];

  CARD_COLORS.forEach((color) => {
    const amount = color === "wild" ? 14 : 12;
    for (let i = 0; i < amount; i += 1) {
      deck.push(color);
    }
  });

  return shuffle(deck);
}

function drawOne(deck: CardColor[]): { card?: CardColor; deck: CardColor[] } {
  if (deck.length === 0) {
    return { deck };
  }

  const [card, ...rest] = deck;
  return { card, deck: rest };
}

function cityName(id: CityId): string {
  return cities.find((city) => city.id === id)?.name ?? id;
}

function createPlayers(deckStart: CardColor[]): { players: Player[]; deck: CardColor[] } {
  let deck = [...deckStart];
  const ticketDeck = shuffle(initialTickets);

  const rawPlayers = [
    { id: "p1", name: "Хлеп", avatar: "🐱", color: "red" as PlayerColor, isHuman: true },
    { id: "p2", name: "ratushnyi", avatar: "🧑‍💻", color: "blue" as PlayerColor, isHuman: false },
    { id: "p3", name: "goodcoach87", avatar: "🚴", color: "green" as PlayerColor, isHuman: false },
    { id: "p4", name: "Zemel9", avatar: "🦉", color: "yellow" as PlayerColor, isHuman: false },
    { id: "p5", name: "Булат", avatar: "😎", color: "black" as PlayerColor, isHuman: false },
  ];

  const players: Player[] = rawPlayers.map((player, index) => {
    const hand = emptyHand();

    for (let i = 0; i < 4; i += 1) {
      const next = drawOne(deck);
      deck = next.deck;

      if (next.card) {
        hand[next.card] += 1;
      }
    }

    return {
      ...player,
      colorHex: PLAYER_COLORS[player.color],
      score: 0,
      trains: 45,
      hand,
      tickets: [ticketDeck[index], ticketDeck[index + 5]].filter(Boolean),
    };
  });

  return { players, deck };
}

function refillMarket(deckInput: CardColor[], marketInput: CardColor[]): { deck: CardColor[]; market: CardColor[] } {
  let deck = [...deckInput];
  const market = [...marketInput];

  while (market.length < 5 && deck.length > 0) {
    const next = drawOne(deck);
    deck = next.deck;

    if (next.card) {
      market.push(next.card);
    }
  }

  return { deck, market };
}

function canClaimRoute(player: Player, route: Route, selectedColor: CardColor): boolean {
  if (route.ownerId) return false;
  if (player.trains < route.length) return false;
  if (selectedColor === "wild") return player.hand.wild >= route.length;
  if (route.color !== "gray" && route.color !== selectedColor) return false;

  return player.hand[selectedColor] + player.hand.wild >= route.length;
}

function spendCards(hand: Record<CardColor, number>, color: CardColor, amount: number): Record<CardColor, number> {
  const newHand = { ...hand };
  const colorUsed = Math.min(newHand[color], amount);
  const wildUsed = amount - colorUsed;

  newHand[color] -= colorUsed;
  newHand.wild -= wildUsed;

  return newHand;
}

function hasPath(playerId: string, from: CityId, to: CityId, routes: Route[]): boolean {
  const graph = new Map<CityId, CityId[]>();

  routes
    .filter((route) => route.ownerId === playerId)
    .forEach((route) => {
      graph.set(route.from, [...(graph.get(route.from) ?? []), route.to]);
      graph.set(route.to, [...(graph.get(route.to) ?? []), route.from]);
    });

  const queue: CityId[] = [from];
  const visited = new Set<CityId>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) break;
    if (current === to) return true;

    visited.add(current);

    (graph.get(current) ?? []).forEach((next) => {
      if (!visited.has(next)) {
        queue.push(next);
      }
    });
  }

  return false;
}

function completedTickets(player: Player, routes: Route[]): number {
  return player.tickets.reduce((sum, ticket) => {
    const completed = hasPath(player.id, ticket.from, ticket.to, routes);
    return completed ? sum + ticket.points : sum;
  }, 0);
}

function handCount(hand: Record<CardColor, number>): number {
  return CARD_COLORS.reduce((sum, color) => sum + hand[color], 0);
}

export default function GameBoard() {
  const initialDeck = useMemo(() => makeDeck(), []);
  const prepared = useMemo(() => createPlayers(initialDeck), [initialDeck]);
  const preparedMarket = useMemo(() => refillMarket(prepared.deck, []), [prepared.deck]);

  const [players, setPlayers] = useState<Player[]>(prepared.players);
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [deck, setDeck] = useState<CardColor[]>(preparedMarket.deck);
  const [market, setMarket] = useState<CardColor[]>(preparedMarket.market);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<CardColor>("red");
  const [log, setLog] = useState<LogItem[]>([
    { id: Date.now(), text: "Game started. Claim routes, draw train cards, and connect your tickets." },
  ]);

  const activePlayer = players[activePlayerIndex];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), []);
  const currentCanClaim = selectedRoute ? canClaimRoute(activePlayer, selectedRoute, selectedColor) : false;

  const rankedPlayers = [...players].sort((a, b) => {
    const aScore = a.score + completedTickets(a, routes);
    const bScore = b.score + completedTickets(b, routes);
    return bScore - aScore;
  });

  function addLog(text: string) {
    setLog((items) => [{ id: Date.now() + Math.random(), text }, ...items].slice(0, 8));
  }

  function nextTurn() {
    setActivePlayerIndex((index) => (index + 1) % players.length);
  }

  function drawBlindCard() {
    if (deck.length === 0) {
      addLog("Deck is empty.");
      return;
    }

    const next = drawOne(deck);
    const drawnCard = next.card;

    if (!drawnCard) return;

    setDeck(next.deck);
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex
          ? { ...player, hand: { ...player.hand, [drawnCard]: player.hand[drawnCard] + 1 } }
          : player,
      ),
    );

    addLog(`${activePlayer.name} drew a blind train card.`);
    nextTurn();
  }

  function drawMarketCard(card: CardColor, cardIndex: number) {
    const nextMarket = market.filter((_, index) => index !== cardIndex);
    const refilled = refillMarket(deck, nextMarket);

    setDeck(refilled.deck);
    setMarket(refilled.market);
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex ? { ...player, hand: { ...player.hand, [card]: player.hand[card] + 1 } } : player,
      ),
    );

    addLog(`${activePlayer.name} drew ${CARD_META[card].label}.`);
    nextTurn();
  }

  function claimSelectedRoute() {
    if (!selectedRoute) {
      addLog("Select a route on the map first.");
      return;
    }

    if (!currentCanClaim) {
      addLog(`${activePlayer.name} cannot claim this route with selected cards.`);
      return;
    }

    setRoutes((currentRoutes) =>
      currentRoutes.map((route) => (route.id === selectedRoute.id ? { ...route, ownerId: activePlayer.id } : route)),
    );

    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex
          ? {
              ...player,
              score: player.score + selectedRoute.points,
              trains: player.trains - selectedRoute.length,
              hand: spendCards(player.hand, selectedColor, selectedRoute.length),
            }
          : player,
      ),
    );

    addLog(
      `${activePlayer.name} claimed ${cityName(selectedRoute.from)} → ${cityName(selectedRoute.to)} for ${selectedRoute.points} points.`,
    );
    setSelectedRouteId(null);
    nextTurn();
  }

  function botMove() {
    const player = players[activePlayerIndex];
    const possibleRoutes = routes.filter((route) => {
      const colorOptions = route.color === "gray" ? CARD_COLORS : [route.color as CardColor];
      return colorOptions.some((color) => canClaimRoute(player, route, color));
    });

    if (possibleRoutes.length > 0) {
      const route = shuffle(possibleRoutes)[0];
      const colorOptions = route.color === "gray" ? CARD_COLORS : [route.color as CardColor];
      const usableColor = colorOptions.find((color) => canClaimRoute(player, route, color)) ?? "wild";

      setRoutes((currentRoutes) =>
        currentRoutes.map((item) => (item.id === route.id ? { ...item, ownerId: player.id } : item)),
      );

      setPlayers((currentPlayers) =>
        currentPlayers.map((item, index) =>
          index === activePlayerIndex
            ? {
                ...item,
                score: item.score + route.points,
                trains: item.trains - route.length,
                hand: spendCards(item.hand, usableColor, route.length),
              }
            : item,
        ),
      );

      addLog(`${player.name} claimed ${cityName(route.from)} → ${cityName(route.to)}.`);
      nextTurn();
      return;
    }

    const next = drawOne(deck);
    const drawnCard = next.card;

    if (!drawnCard) {
      addLog(`${player.name} skipped because the deck is empty.`);
      nextTurn();
      return;
    }

    setDeck(next.deck);
    setPlayers((currentPlayers) =>
      currentPlayers.map((item, index) =>
        index === activePlayerIndex ? { ...item, hand: { ...item.hand, [drawnCard]: item.hand[drawnCard] + 1 } } : item,
      ),
    );

    addLog(`${player.name} drew a card.`);
    nextTurn();
  }

  function resetGame() {
    const newDeck = makeDeck();
    const newPrepared = createPlayers(newDeck);
    const newMarket = refillMarket(newPrepared.deck, []);

    setPlayers(newPrepared.players);
    setRoutes(initialRoutes);
    setDeck(newMarket.deck);
    setMarket(newMarket.market);
    setActivePlayerIndex(0);
    setSelectedRouteId(null);
    setSelectedColor("red");
    setLog([{ id: Date.now(), text: "New game started." }]);
  }

  return (
    <main className="min-h-screen bg-[#20262b] bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.14),transparent_32%)] p-3 text-slate-50 md:p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-1 gap-4 xl:grid-cols-[230px_minmax(680px,1fr)_330px]">
        <aside className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-red-500 to-orange-500 p-5 shadow-2xl">
            <div>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/70">Ticket Online</p>
              <h1 className="text-2xl font-black leading-tight">Europe Board</h1>
            </div>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/30"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {players.map((player, index) => {
              const totalScore = player.score + completedTickets(player, routes);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setActivePlayerIndex(index)}
                  className={`rounded-3xl border p-4 text-left shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 ${
                    index === activePlayerIndex
                      ? "border-white/25 bg-slate-800/95 ring-2 ring-white/15"
                      : "border-white/10 bg-slate-950/75 hover:bg-slate-800/90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-full border-[3px] bg-white text-2xl"
                      style={{ borderColor: player.colorHex }}
                    >
                      {player.avatar}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-base font-black text-slate-50">{player.name}</strong>
                      <span className="text-sm font-semibold text-slate-400">{player.isHuman ? "You" : "Bot"}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-400">
                    <span className="col-span-2 text-2xl font-light text-slate-50">${totalScore.toLocaleString()}k</span>
                    <span>{player.trains} trains</span>
                    <span>{handCount(player.hand)} cards</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid min-w-0 grid-rows-[auto_1fr] gap-4">
          <header className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center">
            <div>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Current turn</p>
              <h2 className="flex items-center gap-3 text-2xl font-black">
                <span
                  className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.10)]"
                  style={{ backgroundColor: activePlayer.colorHex }}
                />
                {activePlayer.name}
              </h2>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
              {market.map((card, index) => (
                <button
                  key={`${card}-${index}`}
                  type="button"
                  onClick={() => drawMarketCard(card, index)}
                  className={`h-14 min-w-[74px] rounded-2xl px-3 py-2 text-xs font-black shadow-xl shadow-black/20 transition hover:-translate-y-0.5 ${CARD_META[card].className}`}
                >
                  <span className="block text-base leading-none">{CARD_META[card].symbol}</span>
                  {CARD_META[card].label}
                </button>
              ))}

              <button
                type="button"
                onClick={drawBlindCard}
                className="h-14 min-w-[74px] rounded-2xl bg-gradient-to-br from-slate-700 to-slate-950 px-3 py-2 text-xs font-black text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5"
              >
                Deck
                <small className="block text-sm text-slate-300">{deck.length}</small>
              </button>
            </div>
          </header>

          <div className="relative min-h-[460px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl md:min-h-[620px]">
            <img
              src={europeMap}
              alt="Europe railway map"
              className="absolute inset-0 h-full w-full object-cover opacity-90 contrast-[1.03] saturate-[1.04]"
            />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 76" preserveAspectRatio="none">
              {routes.map((route) => {
                const from = cityById.get(route.from);
                const to = cityById.get(route.to);
                const owner = players.find((player) => player.id === route.ownerId);

                if (!from || !to) return null;

                const selected = selectedRouteId === route.id;
                const routeColor = owner ? owner.colorHex : ROUTE_META[route.color].hex;

                return (
                  <g key={route.id} className="cursor-pointer transition hover:opacity-75" onClick={() => setSelectedRouteId(route.id)}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="transparent"
                      strokeWidth="4.8"
                      strokeLinecap="round"
                    />
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={routeColor}
                      strokeWidth={selected ? 1.45 : 1.15}
                      strokeLinecap="round"
                      strokeDasharray={owner ? "0" : "1.6 1.1"}
                      opacity={owner ? 0.96 : 0.82}
                    />
                    <circle
                      cx={(from.x + to.x) / 2}
                      cy={(from.y + to.y) / 2}
                      r={selected ? 1.5 : 1.1}
                      fill={owner ? owner.colorHex : "#f8fafc"}
                      stroke="#111827"
                      strokeWidth="0.25"
                    />
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 + 0.35}
                      textAnchor="middle"
                      fontSize="1.65"
                      fontWeight="900"
                      fill={owner ? "#ffffff" : "#111827"}
                    >
                      {route.length}
                    </text>
                  </g>
                );
              })}

              {cities.map((city) => (
                <g key={city.id} className="pointer-events-none">
                  <circle cx={city.x} cy={city.y} r="1.25" fill="#f59e0b" stroke="#421407" strokeWidth="0.35" />
                  <circle cx={city.x} cy={city.y} r="0.45" fill="#fff7ed" />
                  <text
                    x={city.x + 1.5}
                    y={city.y - 0.8}
                    fontSize="1.55"
                    fontWeight="900"
                    fill="#111827"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="0.3"
                  >
                    {city.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>

        <aside className="grid min-w-0 gap-3 md:grid-cols-2 xl:flex xl:flex-col">
          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Selected route</p>
            {selectedRoute ? (
              <>
                <h3 className="text-xl font-black">
                  {cityName(selectedRoute.from)} → {cityName(selectedRoute.to)}
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">Length: {selectedRoute.length}</span>
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">Points: {selectedRoute.points}</span>
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">
                    Color: {ROUTE_META[selectedRoute.color].label}
                  </span>
                </div>
                {selectedRoute.ownerId && (
                  <p className="mt-3 text-sm font-bold text-red-200">
                    Already claimed by {players.find((player) => player.id === selectedRoute.ownerId)?.name}.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm leading-6 text-slate-400">Click any route line on the map.</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Current player's cards</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {CARD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`min-h-16 rounded-2xl p-2 text-center text-xs font-black shadow-lg shadow-black/20 transition hover:-translate-y-0.5 ${CARD_META[color].className} ${
                    selectedColor === color ? "ring-4 ring-white" : ""
                  }`}
                >
                  <strong className="block text-xl leading-tight">{activePlayer.hand[color]}</strong>
                  <span>{CARD_META[color].label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!selectedRoute || !currentCanClaim}
              onClick={claimSelectedRoute}
              className="mb-2 w-full rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Claim selected route
            </button>

            <button
              type="button"
              onClick={activePlayer.isHuman ? nextTurn : botMove}
              className="w-full rounded-2xl bg-white/10 px-4 py-3 font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              {activePlayer.isHuman ? "Skip / next turn" : "Run bot move"}
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Destination tickets</p>
            <div className="grid gap-2">
              {activePlayer.tickets.map((ticket) => {
                const done = hasPath(activePlayer.id, ticket.from, ticket.to, routes);

                return (
                  <div
                    key={`${ticket.from}-${ticket.to}`}
                    className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-sm font-bold ${
                      done ? "bg-green-500/20 text-green-200" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    <span>
                      {cityName(ticket.from)} → {cityName(ticket.to)}
                    </span>
                    <strong>{done ? "+" : ""}{ticket.points}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Leaderboard</p>
            <div className="grid gap-2">
              {rankedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl bg-white/10 p-3 text-sm font-bold text-slate-300">
                  <span>
                    #{index + 1} {player.name}
                  </span>
                  <strong className="text-slate-50">{player.score + completedTickets(player, routes)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl md:col-span-2 xl:col-span-1">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Game log</p>
            <div className="grid gap-2">
              {log.map((item) => (
                <p key={item.id} className="rounded-2xl bg-white/5 p-3 text-sm leading-6 text-slate-400">
                  {item.text}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
