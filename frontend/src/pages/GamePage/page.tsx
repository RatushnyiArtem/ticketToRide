import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { claimRoute as claimRouteOnServer, endTurn as endTurnOnServer, getGameState, type GameRoute as ServerGameRoute, type GameState } from "../../lib/gameApi";
import { connectGameSocket } from "../../lib/gameSocket";

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
type RouteType = "normal" | "ferry" | "tunnel";

type CityId =
  | "edinburgh"
  | "london"
  | "amsterdam"
  | "bruxelles"
  | "dieppe"
  | "brest"
  | "paris"
  | "pamplona"
  | "madrid"
  | "lisboa"
  | "cadiz"
  | "barcelona"
  | "marseille"
  | "zurich"
  | "frankfurt"
  | "essen"
  | "berlin"
  | "copenhagen"
  | "stockholm"
  | "danzig"
  | "riga"
  | "petrograd"
  | "moscow"
  | "warsaw"
  | "wilno"
  | "smolensk"
  | "kyiv"
  | "kharkov"
  | "rostov"
  | "sevastopol"
  | "sochi"
  | "erzurum"
  | "angora"
  | "constantinople"
  | "smyrna"
  | "athens"
  | "sofia"
  | "bucharest"
  | "budapest"
  | "vienna"
  | "munich"
  | "venezia"
  | "zagreb"
  | "sarajevo"
  | "roma"
  | "brindisi"
  | "palermo";

interface City {
  id: CityId;
  name: string;
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  labelAnchor?: "start" | "middle" | "end";
}

interface Route {
  id: string;
  from: CityId;
  to: CityId;
  color: RouteColor;
  length: number;
  points: number;
  ownerId?: string;
  offset?: number;
  type?: RouteType;
  ferryLocos?: number;
}

interface Ticket {
  id?: string;
  from: CityId;
  to: CityId;
  points: number;
  type?: "long" | "short";
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
  hasSelectedStartingTickets?: boolean;
}

interface LogItem {
  id: number;
  text: string;
}

interface LobbySnapshotPlayer {
  id?: string | number;
  user_id?: string | number;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  image?: string;
}

interface BoardLobbySnapshot {
  gameId: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: "waiting" | "started" | "finished";
  players: LobbySnapshotPlayer[];
  currentUserId?: string | number;
  currentUsername?: string;
  playerToken?: string;
  player_token?: string;
  hostToken?: string;
  host_token?: string;
  startedAt: string;
}

interface StartingTicketOffer {
  longTicket: Ticket;
  shortTickets: Ticket[];
  allTickets: Ticket[];
}

const ACTIVE_LOBBY_STORAGE_KEY = "ttr_current_lobby";
const STARTING_TICKETS_STORAGE_PREFIX = "ttr_selected_starting_tickets";
const TURN_SECONDS = 90;
const PLAYER_COLOR_ORDER: PlayerColor[] = ["red", "blue", "green", "yellow", "black"];
const PLAYER_AVATARS = ["🚂", "🧑‍💻", "🦊", "🦉", "😎"];

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

const CLAIM_COLORS: CardColor[] = [
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

const ROUTE_POINTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  7: 18,
  8: 21,
};

const CARD_META: Record<
  CardColor,
  {
    label: string;
    className: string;
    miniClassName: string;
    hex: string;
    symbol: string;
  }
> = {
  red: {
    label: "Red",
    className: "from-red-400 to-red-700 text-white ring-red-200/50",
    miniClassName: "bg-red-500 text-white",
    hex: "#ef4444",
    symbol: "♥",
  },
  blue: {
    label: "Blue",
    className: "from-blue-400 to-blue-700 text-white ring-blue-200/50",
    miniClassName: "bg-blue-500 text-white",
    hex: "#3b82f6",
    symbol: "◆",
  },
  green: {
    label: "Green",
    className: "from-green-300 to-green-700 text-slate-950 ring-green-100/50",
    miniClassName: "bg-green-500 text-slate-950",
    hex: "#22c55e",
    symbol: "✚",
  },
  yellow: {
    label: "Yellow",
    className: "from-yellow-200 to-yellow-500 text-slate-950 ring-yellow-100/60",
    miniClassName: "bg-yellow-400 text-slate-950",
    hex: "#facc15",
    symbol: "♣",
  },
  black: {
    label: "Black",
    className: "from-zinc-700 to-zinc-950 text-white ring-zinc-300/30",
    miniClassName: "bg-zinc-950 text-white",
    hex: "#18181b",
    symbol: "◈",
  },
  white: {
    label: "White",
    className: "from-white to-slate-300 text-slate-950 ring-white/70",
    miniClassName: "bg-white text-slate-950",
    hex: "#f8fafc",
    symbol: "✦",
  },
  orange: {
    label: "Orange",
    className: "from-orange-300 to-orange-600 text-white ring-orange-100/50",
    miniClassName: "bg-orange-500 text-white",
    hex: "#f97316",
    symbol: "●",
  },
  pink: {
    label: "Pink",
    className: "from-fuchsia-300 to-pink-600 text-white ring-pink-100/50",
    miniClassName: "bg-pink-500 text-white",
    hex: "#ec4899",
    symbol: "⬟",
  },
  wild: {
    label: "Loco",
    className: "from-red-500 via-yellow-300 to-blue-600 text-white ring-white/50",
    miniClassName: "bg-gradient-to-br from-red-500 via-yellow-300 to-blue-600 text-white",
    hex: "#8b5cf6",
    symbol: "★",
  },
};

const ROUTE_META: Record<RouteColor, { fill: string; stroke: string; label: string }> = {
  red: { fill: "#ef4444", stroke: "#991b1b", label: "Red" },
  blue: { fill: "#3b82f6", stroke: "#1d4ed8", label: "Blue" },
  green: { fill: "#22c55e", stroke: "#15803d", label: "Green" },
  yellow: { fill: "#facc15", stroke: "#a16207", label: "Yellow" },
  black: { fill: "#18181b", stroke: "#000000", label: "Black" },
  white: { fill: "#f8fafc", stroke: "#64748b", label: "White" },
  orange: { fill: "#f97316", stroke: "#c2410c", label: "Orange" },
  pink: { fill: "#ec4899", stroke: "#be185d", label: "Pink" },
  gray: { fill: "#cbd5e1", stroke: "#64748b", label: "Any one color" },
};

const PLAYER_COLORS: Record<PlayerColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  black: "#27272a",
};

const CITIES: City[] = [
  { id: "edinburgh", name: "Edinburgh", x: 12, y: 8, labelDx: 1.2, labelDy: -1.3 },
  { id: "london", name: "London", x: 18, y: 24, labelDx: 1.2, labelDy: -1.2 },
  { id: "amsterdam", name: "Amsterdam", x: 29, y: 25, labelDx: 1.1, labelDy: -1.25 },
  { id: "bruxelles", name: "Bruxelles", x: 24, y: 30, labelDx: 1.15, labelDy: -0.55 },
  { id: "dieppe", name: "Dieppe", x: 20, y: 34, labelDx: 1.1, labelDy: -0.7 },
  { id: "brest", name: "Brest", x: 13, y: 36, labelDx: -0.4, labelDy: -0.9, labelAnchor: "end" },
  { id: "paris", name: "Paris", x: 20, y: 39, labelDx: 1.25, labelDy: -0.8 },
  { id: "pamplona", name: "Pamplona", x: 17, y: 56, labelDx: 1.1, labelDy: -0.8 },
  { id: "madrid", name: "Madrid", x: 8, y: 60, labelDx: 1.1, labelDy: -0.9 },
  { id: "lisboa", name: "Lisboa", x: 5, y: 62.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "cadiz", name: "Cadiz", x: 8, y: 67, labelDx: 1.1, labelDy: -0.8 },
  { id: "barcelona", name: "Barcelona", x: 22, y: 62, labelDx: 1.1, labelDy: -0.8 },
  { id: "marseille", name: "Marseille", x: 31, y: 52, labelDx: 1.1, labelDy: -0.8 },
  { id: "zurich", name: "Zürich", x: 35, y: 44, labelDx: 1.05, labelDy: -0.75 },
  { id: "frankfurt", name: "Frankfurt", x: 37, y: 34, labelDx: 1.1, labelDy: -0.8 },
  { id: "essen", name: "Essen", x: 38, y: 25.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "berlin", name: "Berlin", x: 48, y: 24, labelDx: 1.15, labelDy: -0.8 },
  { id: "copenhagen", name: "København", x: 47, y: 15, labelDx: 1.1, labelDy: -0.8 },
  { id: "stockholm", name: "Stockholm", x: 56, y: 7, labelDx: 1.05, labelDy: -0.8 },
  { id: "danzig", name: "Danzig", x: 56, y: 21, labelDx: 1.1, labelDy: -0.8 },
  { id: "riga", name: "Riga", x: 67, y: 12, labelDx: 1.1, labelDy: -0.8 },
  { id: "petrograd", name: "Petrograd", x: 84, y: 10, labelDx: 1.1, labelDy: -0.8 },
  { id: "moscow", name: "Moskva", x: 89, y: 24, labelDx: 1.1, labelDy: -0.8 },
  { id: "warsaw", name: "Warszawa", x: 63, y: 31, labelDx: 1.1, labelDy: -0.8 },
  { id: "wilno", name: "Wilno", x: 70, y: 27, labelDx: 1.1, labelDy: -0.8 },
  { id: "smolensk", name: "Smolensk", x: 78, y: 30, labelDx: 1.1, labelDy: -0.8 },
  { id: "kyiv", name: "Kyiv", x: 74, y: 37, labelDx: 1.1, labelDy: -0.8 },
  { id: "kharkov", name: "Kharkov", x: 88, y: 41, labelDx: 1.1, labelDy: -0.8 },
  { id: "rostov", name: "Rostov", x: 92, y: 51, labelDx: 1.1, labelDy: -0.8 },
  { id: "sevastopol", name: "Sevastopol", x: 79, y: 53.8, labelDx: 1.1, labelDy: -0.8 },
  { id: "sochi", name: "Sochi", x: 93, y: 60, labelDx: 1.1, labelDy: -0.8 },
  { id: "erzurum", name: "Erzurum", x: 90, y: 66, labelDx: 1.1, labelDy: -0.8 },
  { id: "angora", name: "Angora", x: 80, y: 66, labelDx: 1.1, labelDy: -0.8 },
  { id: "constantinople", name: "Constantinople", x: 73, y: 61.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "smyrna", name: "Smyrna", x: 69, y: 66.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "athens", name: "Athina", x: 65, y: 62.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "sofia", name: "Sofia", x: 67, y: 56.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "bucharest", name: "București", x: 75, y: 51, labelDx: 1.1, labelDy: -0.8 },
  { id: "budapest", name: "Budapest", x: 60, y: 46, labelDx: 1.1, labelDy: -0.8 },
  { id: "vienna", name: "Wien", x: 54, y: 42, labelDx: 1.1, labelDy: -0.8 },
  { id: "munich", name: "München", x: 45, y: 40, labelDx: 1.1, labelDy: -0.8 },
  { id: "venezia", name: "Venezia", x: 46, y: 49.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "zagreb", name: "Zagrab", x: 52, y: 52.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "sarajevo", name: "Sarajevo", x: 57, y: 56.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "roma", name: "Roma", x: 42, y: 58.5, labelDx: 1.1, labelDy: -0.8 },
  { id: "brindisi", name: "Brindisi", x: 54, y: 64, labelDx: 1.1, labelDy: -0.8 },
  { id: "palermo", name: "Palermo", x: 48, y: 67.5, labelDx: 1.1, labelDy: -0.8 },
];

const ROUTE_DEFS: Omit<Route, "points">[] = [
  { id: "edinburgh-london", from: "edinburgh", to: "london", color: "black", length: 4 },
  { id: "london-amsterdam", from: "london", to: "amsterdam", color: "gray", length: 2, offset: -0.55 },
  { id: "london-amsterdam-2", from: "london", to: "amsterdam", color: "orange", length: 2, offset: 0.55 },
  { id: "london-dieppe", from: "london", to: "dieppe", color: "gray", length: 2, type: "ferry", ferryLocos: 1 },
  { id: "brest-dieppe", from: "brest", to: "dieppe", color: "orange", length: 2 },
  { id: "brest-paris", from: "brest", to: "paris", color: "pink", length: 3 },
  { id: "dieppe-paris", from: "dieppe", to: "paris", color: "white", length: 1, offset: -0.45 },
  { id: "dieppe-paris-2", from: "dieppe", to: "paris", color: "pink", length: 1, offset: 0.45 },
  { id: "dieppe-bruxelles", from: "dieppe", to: "bruxelles", color: "green", length: 2 },
  { id: "bruxelles-amsterdam", from: "bruxelles", to: "amsterdam", color: "yellow", length: 1 },
  { id: "bruxelles-paris", from: "bruxelles", to: "paris", color: "red", length: 2, offset: -0.45 },
  { id: "bruxelles-paris-2", from: "bruxelles", to: "paris", color: "yellow", length: 2, offset: 0.45 },
  { id: "amsterdam-essen", from: "amsterdam", to: "essen", color: "yellow", length: 3 },
  { id: "essen-berlin", from: "essen", to: "berlin", color: "blue", length: 2, offset: -0.45 },
  { id: "essen-berlin-2", from: "essen", to: "berlin", color: "gray", length: 2, offset: 0.45 },
  { id: "essen-frankfurt", from: "essen", to: "frankfurt", color: "green", length: 2 },
  { id: "frankfurt-berlin", from: "frankfurt", to: "berlin", color: "black", length: 3, offset: -0.45 },
  { id: "frankfurt-berlin-2", from: "frankfurt", to: "berlin", color: "red", length: 3, offset: 0.45 },
  { id: "paris-frankfurt", from: "paris", to: "frankfurt", color: "white", length: 3 },
  { id: "paris-zurich", from: "paris", to: "zurich", color: "pink", length: 3 },
  { id: "paris-pamplona", from: "paris", to: "pamplona", color: "blue", length: 4, offset: -0.45 },
  { id: "paris-pamplona-2", from: "paris", to: "pamplona", color: "green", length: 4, offset: 0.45 },
  { id: "pamplona-madrid", from: "pamplona", to: "madrid", color: "black", length: 3, offset: -0.45 },
  { id: "pamplona-madrid-2", from: "pamplona", to: "madrid", color: "white", length: 3, offset: 0.45 },
  { id: "madrid-lisboa", from: "madrid", to: "lisboa", color: "pink", length: 3 },
  { id: "lisboa-cadiz", from: "lisboa", to: "cadiz", color: "blue", length: 2, offset: -0.45 },
  { id: "lisboa-cadiz-2", from: "lisboa", to: "cadiz", color: "orange", length: 2, offset: 0.45 },
  { id: "madrid-cadiz", from: "madrid", to: "cadiz", color: "orange", length: 3 },
  { id: "pamplona-barcelona", from: "pamplona", to: "barcelona", color: "gray", length: 2 },
  { id: "barcelona-madrid", from: "barcelona", to: "madrid", color: "yellow", length: 2 },
  { id: "pamplona-marseille", from: "pamplona", to: "marseille", color: "red", length: 4 },
  { id: "barcelona-marseille", from: "barcelona", to: "marseille", color: "orange", length: 4 },
  { id: "marseille-zurich", from: "marseille", to: "zurich", color: "gray", length: 2, type: "tunnel" },
  { id: "marseille-roma", from: "marseille", to: "roma", color: "red", length: 4 },
  { id: "zurich-frankfurt", from: "zurich", to: "frankfurt", color: "white", length: 2 },
  { id: "zurich-munich", from: "zurich", to: "munich", color: "yellow", length: 2, type: "tunnel" },
  { id: "zurich-venezia", from: "zurich", to: "venezia", color: "green", length: 2, type: "tunnel" },
  { id: "munich-frankfurt", from: "munich", to: "frankfurt", color: "red", length: 2 },
  { id: "munich-vienna", from: "munich", to: "vienna", color: "orange", length: 3 },
  { id: "munich-venezia", from: "munich", to: "venezia", color: "blue", length: 2, type: "tunnel" },
  { id: "venezia-vienna", from: "venezia", to: "vienna", color: "green", length: 2 },
  { id: "venezia-roma", from: "venezia", to: "roma", color: "gray", length: 2 },
  { id: "roma-palermo", from: "roma", to: "palermo", color: "black", length: 4, type: "ferry", ferryLocos: 1 },
  { id: "roma-brindisi", from: "roma", to: "brindisi", color: "white", length: 2 },
  { id: "palermo-brindisi", from: "palermo", to: "brindisi", color: "gray", length: 3, type: "ferry", ferryLocos: 1 },
  { id: "brindisi-athens", from: "brindisi", to: "athens", color: "gray", length: 4, type: "ferry", ferryLocos: 1 },
  { id: "palermo-smyrna", from: "palermo", to: "smyrna", color: "gray", length: 6, type: "ferry", ferryLocos: 2 },
  { id: "vienna-budapest", from: "vienna", to: "budapest", color: "red", length: 1 },
  { id: "vienna-warsaw", from: "vienna", to: "warsaw", color: "blue", length: 4 },
  { id: "berlin-warsaw", from: "berlin", to: "warsaw", color: "pink", length: 4 },
  { id: "berlin-danzig", from: "berlin", to: "danzig", color: "green", length: 4 },
  { id: "copenhagen-berlin", from: "copenhagen", to: "berlin", color: "white", length: 3 },
  { id: "stockholm-copenhagen", from: "stockholm", to: "copenhagen", color: "yellow", length: 3, offset: -0.45 },
  { id: "stockholm-copenhagen-2", from: "stockholm", to: "copenhagen", color: "gray", length: 3, offset: 0.45 },
  { id: "stockholm-riga", from: "stockholm", to: "riga", color: "gray", length: 4, type: "ferry", ferryLocos: 1 },
  { id: "riga-danzig", from: "riga", to: "danzig", color: "gray", length: 2 },
  { id: "riga-wilno", from: "riga", to: "wilno", color: "green", length: 4 },
  { id: "riga-petrograd", from: "riga", to: "petrograd", color: "gray", length: 4 },
  { id: "petrograd-moscow", from: "petrograd", to: "moscow", color: "white", length: 4 },
  { id: "wilno-warsaw", from: "wilno", to: "warsaw", color: "red", length: 3 },
  { id: "wilno-smolensk", from: "wilno", to: "smolensk", color: "yellow", length: 3 },
  { id: "smolensk-moscow", from: "smolensk", to: "moscow", color: "orange", length: 2 },
  { id: "danzig-warsaw", from: "danzig", to: "warsaw", color: "gray", length: 2 },
  { id: "warsaw-kyiv", from: "warsaw", to: "kyiv", color: "gray", length: 4 },
  { id: "smolensk-kyiv", from: "smolensk", to: "kyiv", color: "red", length: 3 },
  { id: "smolensk-kharkov", from: "smolensk", to: "kharkov", color: "orange", length: 3 },
  { id: "kyiv-bucharest", from: "kyiv", to: "bucharest", color: "gray", length: 4 },
  { id: "kyiv-kharkov", from: "kyiv", to: "kharkov", color: "gray", length: 4 },
  { id: "kharkov-moscow", from: "kharkov", to: "moscow", color: "red", length: 4 },
  { id: "kharkov-rostov", from: "kharkov", to: "rostov", color: "green", length: 2 },
  { id: "rostov-sochi", from: "rostov", to: "sochi", color: "red", length: 2 },
  { id: "sochi-erzurum", from: "sochi", to: "erzurum", color: "black", length: 3 },
  { id: "sevastopol-rostov", from: "sevastopol", to: "rostov", color: "pink", length: 2 },
  { id: "sevastopol-constantinople", from: "sevastopol", to: "constantinople", color: "orange", length: 5 },
  { id: "erzurum-angora", from: "erzurum", to: "angora", color: "orange", length: 3 },
  { id: "angora-constantinople", from: "angora", to: "constantinople", color: "gray", length: 2 },
  { id: "constantinople-smyrna", from: "constantinople", to: "smyrna", color: "gray", length: 2 },
  { id: "smyrna-athens", from: "smyrna", to: "athens", color: "orange", length: 2, type: "ferry", ferryLocos: 1 },
  { id: "athens-sofia", from: "athens", to: "sofia", color: "green", length: 3 },
  { id: "sofia-constantinople", from: "sofia", to: "constantinople", color: "blue", length: 3 },
  { id: "bucharest-sofia", from: "bucharest", to: "sofia", color: "yellow", length: 2 },
  { id: "budapest-bucharest", from: "budapest", to: "bucharest", color: "white", length: 4 },
  { id: "budapest-sofia", from: "budapest", to: "sofia", color: "pink", length: 4 },
  { id: "budapest-zagreb", from: "budapest", to: "zagreb", color: "orange", length: 2 },
  { id: "venezia-zagreb", from: "venezia", to: "zagreb", color: "gray", length: 2 },
  { id: "zagreb-sarajevo", from: "zagreb", to: "sarajevo", color: "red", length: 3 },
  { id: "sarajevo-sofia", from: "sarajevo", to: "sofia", color: "green", length: 2 },
  { id: "sarajevo-athens", from: "sarajevo", to: "athens", color: "gray", length: 4 },
];

const INITIAL_ROUTES: Route[] = ROUTE_DEFS.map((route) => ({
  ...route,
  points: ROUTE_POINTS[route.length] ?? 0,
}));


function normalizeServerText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function serverCityToCityId(value: string): CityId | null {
  const normalized = normalizeServerText(value);
  const aliases: Record<string, CityId> = {
    kobenhavn: "copenhagen",
    copenhagen: "copenhagen",
    moskva: "moscow",
    moscow: "moscow",
    warszawa: "warsaw",
    warsaw: "warsaw",
    bucurersti: "bucharest",
    bucuresti: "bucharest",
    wien: "vienna",
    vienna: "vienna",
    munchen: "munich",
    munich: "munich",
    athina: "athens",
    athens: "athens",
    zagrab: "zagreb",
    zagreb: "zagreb",
  };

  if (aliases[normalized]) return aliases[normalized];

  const byId = CITIES.find((city) => normalizeServerText(city.id) === normalized);
  if (byId) return byId.id;

  const byName = CITIES.find((city) => normalizeServerText(city.name) === normalized);
  return byName?.id ?? null;
}

function makeRouteMatchKey(from: CityId, to: CityId, length: number): string {
  return [from, to].sort().join("--") + `--${length}`;
}

function buildServerRouteMappings(serverRoutes: ServerGameRoute[]): {
  localToServer: Record<string, number>;
  claimedByLocalRouteId: Record<string, string | null>;
} {
  const localGroups = new Map<string, Route[]>();

  INITIAL_ROUTES.forEach((route) => {
    const key = makeRouteMatchKey(route.from, route.to, route.length);
    localGroups.set(key, [...(localGroups.get(key) ?? []), route]);
  });

  const usedLocalRouteIds = new Set<string>();
  const localToServer: Record<string, number> = {};
  const claimedByLocalRouteId: Record<string, string | null> = {};

  serverRoutes.forEach((serverRoute) => {
    const from = serverCityToCityId(serverRoute.city_a);
    const to = serverCityToCityId(serverRoute.city_b);

    if (!from || !to) return;

    const key = makeRouteMatchKey(from, to, serverRoute.length);
    const candidates = localGroups.get(key) ?? [];
    const localRoute = candidates.find((candidate) => !usedLocalRouteIds.has(candidate.id));

    if (!localRoute) return;

    usedLocalRouteIds.add(localRoute.id);
    localToServer[localRoute.id] = serverRoute.id;
    claimedByLocalRouteId[localRoute.id] = serverRoute.claimed_by_player_id
      ? String(serverRoute.claimed_by_player_id)
      : null;
  });

  return { localToServer, claimedByLocalRouteId };
}

function getSnapshotCurrentUserId(snapshot: BoardLobbySnapshot | null): string | null {
  const directId = snapshot?.currentUserId;
  if (directId !== undefined && directId !== null) return String(directId);

  const currentUsername = snapshot?.currentUsername;
  if (!currentUsername) return null;

  const matchedPlayer = snapshot?.players?.find((player, index) => getPlayerDisplayName(player, index) === currentUsername);
  const matchedId = matchedPlayer?.id ?? matchedPlayer?.user_id;

  return matchedId !== undefined && matchedId !== null ? String(matchedId) : null;
}

function getSnapshotPlayerToken(snapshot: BoardLobbySnapshot | null): string | null {
  return snapshot?.playerToken ?? snapshot?.player_token ?? null;
}

const INITIAL_TICKETS: Ticket[] = [
  { from: "london", to: "roma", points: 10 },
  { from: "paris", to: "moscow", points: 18 },
  { from: "madrid", to: "constantinople", points: 16 },
  { from: "stockholm", to: "athens", points: 21 },
  { from: "berlin", to: "kyiv", points: 8 },
  { from: "amsterdam", to: "bucharest", points: 13 },
  { from: "barcelona", to: "vienna", points: 9 },
  { from: "copenhagen", to: "sofia", points: 12 },
  { from: "zurich", to: "warsaw", points: 7 },
  { from: "marseille", to: "budapest", points: 8 },
  { from: "edinburgh", to: "petrograd", points: 20 },
  { from: "lisboa", to: "danzig", points: 20 },
  { from: "brest", to: "venezia", points: 8 },
  { from: "frankfurt", to: "kharkov", points: 13 },
  { from: "essen", to: "smyrna", points: 16 },
  { from: "cadiz", to: "stockholm", points: 21 },
  { from: "palermo", to: "moscow", points: 20 },
  { from: "sochi", to: "vienna", points: 12 },
  { from: "brindisi", to: "riga", points: 17 },
  { from: "munich", to: "angora", points: 13 },
  { from: "pamplona", to: "kyiv", points: 13 },
  { from: "bruxelles", to: "budapest", points: 9 },
  { from: "dieppe", to: "sofia", points: 13 },
  { from: "athens", to: "wilno", points: 14 },
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
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
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
  if (deck.length === 0) return { deck };
  const [card, ...rest] = deck;
  return { card, deck: rest };
}

function cityName(id: CityId): string {
  return CITIES.find((city) => city.id === id)?.name ?? id;
}

function ticketId(ticket: Ticket): string {
  return ticket.id ?? `${ticket.from}-${ticket.to}-${ticket.points}`;
}

function withTicketMeta(ticket: Ticket, type: "long" | "short"): Ticket {
  return {
    ...ticket,
    id: `${type}-${ticket.from}-${ticket.to}-${ticket.points}`,
    type,
  };
}

function readLobbySnapshot(): BoardLobbySnapshot | null {
  try {
    const raw = localStorage.getItem(ACTIVE_LOBBY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BoardLobbySnapshot;
  } catch {
    return null;
  }
}

function getStartingTicketsStorageKey(gameId?: string): string {
  const snapshot = readLobbySnapshot();
  return `${STARTING_TICKETS_STORAGE_PREFIX}_${gameId ?? snapshot?.gameId ?? "local"}`;
}

function readSavedStartingTickets(storageKey: string): Ticket[] | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Ticket[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed;
  } catch {
    return null;
  }
}

function saveStartingTickets(storageKey: string, tickets: Ticket[]) {
  localStorage.setItem(storageKey, JSON.stringify(tickets));
}

function clearStartingTickets(storageKey: string) {
  localStorage.removeItem(storageKey);
}

function getPlayerDisplayName(player: LobbySnapshotPlayer, index: number): string {
  return player.username ?? player.name ?? player.email ?? `Player ${index + 1}`;
}

function buildRawPlayersFromLobby(): Array<{
  id: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  isHuman: boolean;
}> {
  const snapshot = readLobbySnapshot();

  const fallbackPlayers = [
    { id: "p1", name: "You", avatar: "🚂", color: "red" as PlayerColor, isHuman: true },
    { id: "p2", name: "Opponent", avatar: "🧑‍💻", color: "blue" as PlayerColor, isHuman: false },
  ];

  if (!snapshot?.players?.length) return fallbackPlayers;

  const lobbyPlayers = [...snapshot.players].slice(0, 5);
  const currentIndex = lobbyPlayers.findIndex((player) => {
    const id = player.id ?? player.user_id;

    return (
      String(id) === String(snapshot.currentUserId) ||
      getPlayerDisplayName(player, 0) === snapshot.currentUsername
    );
  });

  if (currentIndex > 0) {
    const [currentPlayer] = lobbyPlayers.splice(currentIndex, 1);
    lobbyPlayers.unshift(currentPlayer);
  }

  return lobbyPlayers.map((player, index) => ({
    id: String(player.id ?? player.user_id ?? `p${index + 1}`),
    name: getPlayerDisplayName(player, index),
    avatar: player.avatar ?? player.avatar_url ?? player.image ?? PLAYER_AVATARS[index] ?? "🚂",
    color: PLAYER_COLOR_ORDER[index] ?? "red",
    isHuman: index === 0,
  }));
}

function drawStartingTicketOffer(): StartingTicketOffer {
  const longTickets = shuffle(INITIAL_TICKETS.filter((ticket) => ticket.points >= 17)).map((ticket) =>
    withTicketMeta(ticket, "long"),
  );

  const shortTickets = shuffle(INITIAL_TICKETS.filter((ticket) => ticket.points < 17)).map((ticket) =>
    withTicketMeta(ticket, "short"),
  );

  const longTicket = longTickets[0] ?? withTicketMeta(shuffle(INITIAL_TICKETS)[0], "long");
  const offeredShortTickets = shortTickets.slice(0, 3);

  return {
    longTicket,
    shortTickets: offeredShortTickets,
    allTickets: [longTicket, ...offeredShortTickets],
  };
}

function autoChooseStartingTickets(): Ticket[] {
  const offer = drawStartingTicketOffer();
  return [offer.longTicket, offer.shortTickets[0]].filter(Boolean);
}

function createPlayers(
  deckStart: CardColor[],
  ticketDeckStart: Ticket[],
): { players: Player[]; deck: CardColor[]; ticketDeck: Ticket[]; humanTicketOffer: StartingTicketOffer } {
  let deck = [...deckStart];
  const ticketDeck = [...ticketDeckStart];
  const rawPlayers = buildRawPlayersFromLobby();
  const humanTicketOffer = drawStartingTicketOffer();

  const players: Player[] = rawPlayers.map((player) => {
    const hand = emptyHand();

    for (let i = 0; i < 4; i += 1) {
      const next = drawOne(deck);
      deck = next.deck;
      if (next.card) hand[next.card] += 1;
    }

    return {
      ...player,
      colorHex: PLAYER_COLORS[player.color],
      score: 0,
      trains: 35,
      hand,
      tickets: player.isHuman ? [] : autoChooseStartingTickets(),
      hasSelectedStartingTickets: !player.isHuman,
    };
  });

  return { players, deck, ticketDeck, humanTicketOffer };
}

function replaceMarketIfTooManyLocos(deckInput: CardColor[], marketInput: CardColor[]): { deck: CardColor[]; market: CardColor[] } {
  const locomotives = marketInput.filter((card) => card === "wild").length;

  if (locomotives < 3 || deckInput.length < 5) {
    return { deck: deckInput, market: marketInput };
  }

  let deck = [...deckInput];
  const market: CardColor[] = [];

  while (market.length < 5 && deck.length > 0) {
    const next = drawOne(deck);
    deck = next.deck;
    if (next.card) market.push(next.card);
  }

  return { deck, market };
}

function refillMarket(deckInput: CardColor[], marketInput: CardColor[]): { deck: CardColor[]; market: CardColor[] } {
  let deck = [...deckInput];
  const market = [...marketInput];

  while (market.length < 5 && deck.length > 0) {
    const next = drawOne(deck);
    deck = next.deck;
    if (next.card) market.push(next.card);
  }

  return replaceMarketIfTooManyLocos(deck, market);
}

function getClaimColor(route: Route, selectedColor: CardColor): CardColor {
  if (route.color !== "gray") return route.color;
  return selectedColor;
}

function canClaimRoute(player: Player, route: Route, selectedColor: CardColor): boolean {
  if (route.ownerId) return false;
  if (player.trains < route.length) return false;

  const requiredLocos = route.type === "ferry" ? route.ferryLocos ?? 1 : 0;
  const color = getClaimColor(route, selectedColor);

  if (player.hand.wild < requiredLocos) return false;

  if (color === "wild") {
    return player.hand.wild >= route.length;
  }

  const nonLocoLength = route.length - requiredLocos;
  const spareLocos = player.hand.wild - requiredLocos;
  return player.hand[color] + spareLocos >= nonLocoLength;
}

function spendCards(
  hand: Record<CardColor, number>,
  selectedColor: CardColor,
  routeLength: number,
  requiredLocos: number,
): Record<CardColor, number> {
  const next = { ...hand };

  if (selectedColor === "wild") {
    next.wild -= routeLength;
    return next;
  }

  const colorCardsToSpend = Math.min(next[selectedColor], routeLength - requiredLocos);
  next[selectedColor] -= colorCardsToSpend;
  next.wild -= requiredLocos + (routeLength - requiredLocos - colorCardsToSpend);

  return next;
}

function handCount(hand: Record<CardColor, number>): number {
  return Object.values(hand).reduce((sum, value) => sum + value, 0);
}

function hasConnection(player: Player, routes: Route[], from: CityId, to: CityId): boolean {
  const graph = new Map<CityId, CityId[]>();

  routes
    .filter((route) => route.ownerId === player.id)
    .forEach((route) => {
      const fromNeighbours = graph.get(route.from) ?? [];
      fromNeighbours.push(route.to);
      graph.set(route.from, fromNeighbours);

      const toNeighbours = graph.get(route.to) ?? [];
      toNeighbours.push(route.from);
      graph.set(route.to, toNeighbours);
    });

  const visited = new Set<CityId>();
  const stack: CityId[] = [from];

  while (stack.length) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (visited.has(current)) continue;

    visited.add(current);
    const neighbours = graph.get(current) ?? [];
    neighbours.forEach((city) => {
      if (!visited.has(city)) stack.push(city);
    });
  }

  return false;
}

function completedTickets(player: Player, routes: Route[]): number {
  return player.tickets.reduce((sum, ticket) => {
    return sum + (hasConnection(player, routes, ticket.from, ticket.to) ? ticket.points : -ticket.points);
  }, 0);
}

function routeGeometry(route: Route, cityById: Map<CityId, City>) {
  const from = cityById.get(route.from)!;
  const to = cityById.get(route.to)!;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = route.offset ?? 0;
  const normalX = (-dy / length) * offset;
  const normalY = (dx / length) * offset;

  return {
    x1: from.x + normalX,
    y1: from.y + normalY,
    x2: to.x + normalX,
    y2: to.y + normalY,
    dx,
    dy,
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function StartingTicketSelectionScreen({
  offer,
  selectedTicketIds,
  onToggleTicket,
  onConfirm,
}: {
  offer: StartingTicketOffer;
  selectedTicketIds: string[];
  onToggleTicket: (ticket: Ticket) => void;
  onConfirm: () => void;
}) {
  const selectedShortCount = selectedTicketIds.filter((id) =>
    offer.shortTickets.some((ticket) => ticketId(ticket) === id),
  ).length;

  const selectedTotal = offer.allTickets.filter((ticket) => selectedTicketIds.includes(ticketId(ticket))).length;
  const canConfirm = selectedShortCount >= 1;

  const renderTicket = (ticket: Ticket, locked = false) => {
    const selected = selectedTicketIds.includes(ticketId(ticket));

    return (
      <button
        key={ticketId(ticket)}
        type="button"
        disabled={locked}
        onClick={() => onToggleTicket(ticket)}
        className={`rounded-3xl border-2 p-5 text-left shadow-xl transition ${
          selected
            ? "border-emerald-400 bg-emerald-500/15 shadow-emerald-950/30"
            : "border-white/10 bg-slate-950/75 hover:border-white/25"
        } ${locked ? "cursor-not-allowed opacity-90" : "hover:-translate-y-0.5"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
              {ticket.type === "long" ? "Long route" : "Short route"}
            </p>
            <h3 className="text-xl font-black text-white">
              {cityName(ticket.from)} → {cityName(ticket.to)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Keep this ticket hidden. If completed, you gain points. If failed, you lose them.
            </p>
          </div>

          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-xl font-black text-slate-950">
            {ticket.points}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              ticket.type === "long" ? "bg-purple-400/20 text-purple-200" : "bg-blue-400/20 text-blue-200"
            }`}
          >
            {ticket.type === "long" ? "Required" : "Choose / discard"}
          </span>

          <span
            className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-black ${
              selected ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-white/20 text-white/30"
            }`}
          >
            ✓
          </span>
        </div>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-[#20262b] p-5 text-slate-50">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">
              Private setup phase
            </p>
            <h1 className="text-3xl font-black">Choose your destination tickets</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              You got 1 random long route and 3 short routes. Long route stays with you. From short routes
              you must keep at least 1, or you can keep all. Opponents do not see your choice.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 px-5 py-4 text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Selected</p>
            <p className="mt-1 text-3xl font-black text-white">{selectedTotal}/4</p>
          </div>
        </div>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Long route</h2>
            <span className="rounded-full bg-purple-400/20 px-3 py-1 text-xs font-black text-purple-200">
              Always kept
            </span>
          </div>
          {renderTicket(offer.longTicket, true)}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Short routes</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                canConfirm ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"
              }`}
            >
              Select at least one
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">{offer.shortTickets.map((ticket) => renderTicket(ticket))}</div>
        </section>

        <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/75 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black text-white">Hidden information</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              These tickets are stored only for your player. Other players should not see this panel.
            </p>
          </div>

          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 px-6 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Confirm routes and open board
          </button>
        </div>
      </div>
    </main>
  );
}

function TrainCard({ card }: { card: CardColor }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-3 text-center text-sm font-black shadow-lg ring-2 ${CARD_META[card].className}`}>
      <div className="text-2xl leading-none">{CARD_META[card].symbol}</div>
      <div className="mt-1">{CARD_META[card].label}</div>
    </div>
  );
}

export default function GameBoard() {
  const { gameId } = useParams<{ gameId?: string }>();
  const startingTicketsStorageKey = useMemo(() => getStartingTicketsStorageKey(gameId), [gameId]);
  const savedStartingTickets = useMemo(
    () => readSavedStartingTickets(startingTicketsStorageKey),
    [startingTicketsStorageKey],
  );

  const initialDeck = useMemo(() => makeDeck(), []);
  const initialTicketDeck = useMemo(() => shuffle(INITIAL_TICKETS), []);
  const prepared = useMemo(() => createPlayers(initialDeck, initialTicketDeck), [initialDeck, initialTicketDeck]);
  const preparedMarket = useMemo(() => refillMarket(prepared.deck, []), [prepared.deck]);

  const [players, setPlayers] = useState<Player[]>(() =>
    prepared.players.map((player, index) =>
      index === 0 && savedStartingTickets
        ? {
            ...player,
            tickets: savedStartingTickets,
            hasSelectedStartingTickets: true,
          }
        : player,
    ),
  );
  const [routes, setRoutes] = useState<Route[]>(INITIAL_ROUTES);
  const [deck, setDeck] = useState<CardColor[]>(preparedMarket.deck);
  const [market, setMarket] = useState<CardColor[]>(preparedMarket.market);
  const [ticketDeck, setTicketDeck] = useState<Ticket[]>(prepared.ticketDeck);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<CardColor>("red");
  const [cardsDrawnThisTurn, setCardsDrawnThisTurn] = useState(0);
  const [log, setLog] = useState<LogItem[]>([
    {
      id: Date.now(),
      text: "Game started. Choose your hidden destination tickets.",
    },
  ]);

  const [startingTicketOffer, setStartingTicketOffer] = useState<StartingTicketOffer>(prepared.humanTicketOffer);
  const [showStartingTicketSelection, setShowStartingTicketSelection] = useState(!savedStartingTickets);
  const [selectedStartingTicketIds, setSelectedStartingTicketIds] = useState<string[]>([
    ticketId(prepared.humanTicketOffer.longTicket),
    ticketId(prepared.humanTicketOffer.shortTickets[0]),
  ]);

  const lobbySnapshot = useMemo(() => readLobbySnapshot(), []);
  const localPlayerId = useMemo(() => getSnapshotCurrentUserId(lobbySnapshot), [lobbySnapshot]);
  const playerToken = useMemo(() => getSnapshotPlayerToken(lobbySnapshot), [lobbySnapshot]);
  const isOnlineGame = Boolean(gameId && playerToken);
  const socketRef = useRef<ReturnType<typeof connectGameSocket> | null>(null);
  const serverRouteIdByLocalRouteIdRef = useRef<Record<string, number>>({});
  const handledExpiredTurnRef = useRef<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"offline" | "connecting" | "connected" | "closed">(
    isOnlineGame ? "connecting" : "offline",
  );
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(TURN_SECONDS);

  const activePlayer = players[activePlayerIndex] ?? players[0];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const cityById = useMemo(() => new Map(CITIES.map((city) => [city.id, city])), []);
  const isMyTurn = !isOnlineGame || Boolean(activePlayer && localPlayerId && String(activePlayer.id) === String(localPlayerId));
  const currentCanClaim = Boolean(selectedRoute && activePlayer && isMyTurn && canClaimRoute(activePlayer, selectedRoute, selectedColor));

  const rankedPlayers = [...players].sort((a, b) => {
    const aScore = a.score + completedTickets(a, routes);
    const bScore = b.score + completedTickets(b, routes);
    return bScore - aScore;
  });

  function addLog(text: string) {
    setLog((items) => [{ id: Date.now() + Math.random(), text }, ...items].slice(0, 12));
  }

  function applyServerGameState(state: GameState) {
    const routeMappings = buildServerRouteMappings(state.routes);
    serverRouteIdByLocalRouteIdRef.current = routeMappings.localToServer;

    setRoutes((currentRoutes) =>
      currentRoutes.map((route) => {
        if (!(route.id in routeMappings.claimedByLocalRouteId)) return route;

        return {
          ...route,
          ownerId: routeMappings.claimedByLocalRouteId[route.id] ?? undefined,
        };
      }),
    );

    setPlayers((currentPlayers) => {
      const existingById = new Map(currentPlayers.map((player) => [String(player.id), player]));
      const serverPlayers = [...state.players].sort((a, b) => a.turn_order - b.turn_order);

      const mappedPlayers: Player[] = serverPlayers.map((serverPlayer, index) => {
        const id = String(serverPlayer.id);
        const existing = existingById.get(id);
        const color = existing?.color ?? PLAYER_COLOR_ORDER[index] ?? "red";

        return {
          id,
          name: serverPlayer.name ?? existing?.name ?? `Player ${index + 1}`,
          avatar: existing?.avatar ?? PLAYER_AVATARS[index] ?? "🚂",
          color,
          colorHex: PLAYER_COLORS[color],
          score: serverPlayer.score ?? existing?.score ?? 0,
          trains: serverPlayer.train_cars_left ?? existing?.trains ?? 35,
          hand: existing?.hand ?? emptyHand(),
          tickets: existing?.tickets ?? [],
          isHuman: localPlayerId ? id === localPlayerId : existing?.isHuman ?? index === 0,
          hasSelectedStartingTickets: existing?.hasSelectedStartingTickets ?? false,
        };
      });

      if (mappedPlayers.length === 0) return currentPlayers;

      const localIndex = localPlayerId ? mappedPlayers.findIndex((player) => String(player.id) === localPlayerId) : -1;
      const reorderedPlayers = [...mappedPlayers];

      if (localIndex > 0) {
        const [localPlayer] = reorderedPlayers.splice(localIndex, 1);
        reorderedPlayers.unshift(localPlayer);
      }

      const activeServerPlayerId = state.current_player_id ? String(state.current_player_id) : null;
      const nextActiveIndex = activeServerPlayerId
        ? reorderedPlayers.findIndex((player) => String(player.id) === activeServerPlayerId)
        : 0;

      setActivePlayerIndex(nextActiveIndex >= 0 ? nextActiveIndex : 0);
      return reorderedPlayers;
    });
  }

  async function syncFromServer(silent = false) {
    if (!gameId) return;

    try {
      const state = await getGameState(gameId);
      applyServerGameState(state);
    } catch (error) {
      if (!silent) {
        addLog(error instanceof Error ? error.message : "Could not synchronize game state.");
      }
    }
  }

  useEffect(() => {
    if (!gameId || !playerToken) return;

    let cancelled = false;
    setConnectionStatus("connecting");

    const safeSync = async () => {
      if (cancelled) return;
      await syncFromServer(true);
    };

    safeSync();

    const realtime = connectGameSocket(gameId, playerToken, {
      onOpen: () => {
        setConnectionStatus("connected");
        realtime.requestState();
        safeSync();
      },
      onClose: () => setConnectionStatus("closed"),
      onError: (message) => addLog(message),
      onMessage: (event) => {
        const maybeState = event.payload as Partial<GameState> | undefined;

        if (maybeState?.players && maybeState?.routes) {
          applyServerGameState(maybeState as GameState);
          return;
        }

        const eventsThatNeedSync = new Set([
          "game_state",
          "state",
          "state_changed",
          "game_started",
          "player_joined",
          "player_left",
          "route_claimed",
          "turn_changed",
          "turn_expired",
        ]);

        if (eventsThatNeedSync.has(event.type)) {
          safeSync();
        }
      },
    });

    socketRef.current = realtime;

    const pingId = window.setInterval(() => realtime.ping(), 25_000);
    const pollId = window.setInterval(() => safeSync(), 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(pingId);
      window.clearInterval(pollId);
      realtime.close();
      socketRef.current = null;
    };
  }, [gameId, playerToken]);

  useEffect(() => {
    setTurnSecondsLeft(TURN_SECONDS);
    handledExpiredTurnRef.current = null;
  }, [activePlayer?.id, activePlayerIndex]);

  useEffect(() => {
    if (showStartingTicketSelection || !activePlayer) return;

    const timerId = window.setInterval(() => {
      setTurnSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [showStartingTicketSelection, activePlayer?.id]);

  useEffect(() => {
    if (showStartingTicketSelection || turnSecondsLeft > 0 || !activePlayer) return;

    const expiredTurnKey = `${activePlayer.id}-${activePlayerIndex}`;
    if (handledExpiredTurnRef.current === expiredTurnKey) return;

    handledExpiredTurnRef.current = expiredTurnKey;
    addLog(`${activePlayer.name}'s 90 seconds expired. Turn skipped.`);

    if (isOnlineGame) {
      if (isMyTurn && gameId && playerToken) {
        socketRef.current?.endTurn(playerToken);
        endTurnOnServer(gameId, { player_token: playerToken })
          .then(() => syncFromServer(true))
          .catch(() => socketRef.current?.requestState());
      }

      return;
    }

    nextTurn();
  }, [turnSecondsLeft, showStartingTicketSelection, activePlayer?.id, activePlayerIndex, isOnlineGame, isMyTurn, gameId, playerToken]);

  function nextTurn() {
    setCardsDrawnThisTurn(0);
    setActivePlayerIndex((index) => (index + 1) % players.length);
  }

  function addCardToActivePlayer(card: CardColor) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex ? { ...player, hand: { ...player.hand, [card]: player.hand[card] + 1 } } : player,
      ),
    );
  }

  function drawBlindCard() {
    if (!isMyTurn) {
      addLog("Wait for your turn.");
      return;
    }

    if (cardsDrawnThisTurn >= 2) return;

    if (deck.length === 0) {
      addLog("Deck is empty.");
      return;
    }

    const next = drawOne(deck);
    if (!next.card) return;

    setDeck(next.deck);
    addCardToActivePlayer(next.card);

    const newDrawCount = cardsDrawnThisTurn + 1;
    setCardsDrawnThisTurn(newDrawCount);
    addLog(`${activePlayer.name} drew a blind train card.`);

    if (newDrawCount >= 2) nextTurn();
  }

  function drawMarketCard(index: number) {
    if (!isMyTurn) {
      addLog("Wait for your turn.");
      return;
    }

    if (cardsDrawnThisTurn >= 2) return;

    const card = market[index];
    if (!card) return;

    if (card === "wild" && cardsDrawnThisTurn > 0) {
      addLog("You can take a locomotive only as the first card of your turn.");
      return;
    }

    addCardToActivePlayer(card);

    const remainingMarket = market.filter((_, itemIndex) => itemIndex !== index);
    const refilled = refillMarket(deck, remainingMarket);
    setDeck(refilled.deck);
    setMarket(refilled.market);

    addLog(`${activePlayer.name} took ${CARD_META[card].label} from market.`);

    if (card === "wild") {
      nextTurn();
      return;
    }

    const newDrawCount = cardsDrawnThisTurn + 1;
    setCardsDrawnThisTurn(newDrawCount);

    if (newDrawCount >= 2) nextTurn();
  }

  async function claimSelectedRoute() {
    if (!selectedRoute) {
      addLog("Select a route first.");
      return;
    }

    if (!isMyTurn) {
      addLog("Wait for your turn.");
      return;
    }

    if (selectedRoute.ownerId) {
      addLog("This route has already been claimed.");
      return;
    }

    if (!currentCanClaim) {
      addLog(`${activePlayer.name} does not have enough cards or trains for this route.`);
      return;
    }

    const claimColor = getClaimColor(selectedRoute, selectedColor);
    const requiredLocos = selectedRoute.type === "ferry" ? selectedRoute.ferryLocos ?? 1 : 0;

    if (isOnlineGame && gameId && playerToken) {
      const serverRouteId = serverRouteIdByLocalRouteIdRef.current[selectedRoute.id];

      if (serverRouteId === undefined) {
        addLog("Cannot match this route with the server route id. Synchronizing again...");
        await syncFromServer(true);
        return;
      }

      try {
        await claimRouteOnServer(gameId, { player_token: playerToken, route_id: serverRouteId });
        socketRef.current?.requestState();
        await syncFromServer(true);
        addLog(`${activePlayer.name} claimed ${cityName(selectedRoute.from)} → ${cityName(selectedRoute.to)}.`);
        setSelectedRouteId(null);
      } catch (error) {
        addLog(error instanceof Error ? error.message : "Could not claim route on server.");
      }

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
              hand: spendCards(player.hand, claimColor, selectedRoute.length, requiredLocos),
            }
          : player,
      ),
    );

    addLog(`${activePlayer.name} claimed ${cityName(selectedRoute.from)} → ${cityName(selectedRoute.to)}.`);
    setSelectedRouteId(null);
    nextTurn();
  }

  function toggleStartingTicket(ticket: Ticket) {
    if (ticket.type === "long") return;

    const id = ticketId(ticket);

    setSelectedStartingTicketIds((current) => {
      if (current.includes(id)) {
        return current.filter((ticketIdValue) => ticketIdValue !== id);
      }

      return [...current, id];
    });
  }

  function confirmStartingTickets() {
    const selectedTickets = startingTicketOffer.allTickets.filter((ticket) =>
      selectedStartingTicketIds.includes(ticketId(ticket)),
    );

    const selectedShortCount = selectedTickets.filter((ticket) => ticket.type === "short").length;

    if (selectedShortCount < 1) {
      addLog("You must keep at least one short destination ticket.");
      return;
    }

    saveStartingTickets(startingTicketsStorageKey, selectedTickets);

    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === 0
          ? {
              ...player,
              tickets: selectedTickets,
              hasSelectedStartingTickets: true,
            }
          : player,
      ),
    );

    setActivePlayerIndex(0);
    setCardsDrawnThisTurn(0);
    setShowStartingTicketSelection(false);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    addLog(`${players[0].name} kept ${selectedTickets.length} hidden destination tickets. The board is now open.`);
  }

  function resetGame() {
    clearStartingTickets(startingTicketsStorageKey);
    const newDeck = makeDeck();
    const newTicketDeck = shuffle(INITIAL_TICKETS);
    const newPrepared = createPlayers(newDeck, newTicketDeck);
    const newMarket = refillMarket(newPrepared.deck, []);

    setPlayers(newPrepared.players);
    setRoutes(INITIAL_ROUTES);
    setDeck(newMarket.deck);
    setMarket(newMarket.market);
    setTicketDeck(newPrepared.ticketDeck);
    setActivePlayerIndex(0);
    setSelectedRouteId(null);
    setSelectedColor("red");
    setCardsDrawnThisTurn(0);
    setStartingTicketOffer(newPrepared.humanTicketOffer);
    setSelectedStartingTicketIds([
      ticketId(newPrepared.humanTicketOffer.longTicket),
      ticketId(newPrepared.humanTicketOffer.shortTickets[0]),
    ]);
    setShowStartingTicketSelection(true);
    setLog([{ id: Date.now(), text: "New game started. Choose your hidden destination tickets." }]);
  }

  if (showStartingTicketSelection) {
    return (
      <StartingTicketSelectionScreen
        offer={startingTicketOffer}
        selectedTicketIds={selectedStartingTicketIds}
        onToggleTicket={toggleStartingTicket}
        onConfirm={confirmStartingTickets}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#20262b] p-3 text-slate-50 md:p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(780px,1fr)_350px]">
        <aside className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-red-500 to-orange-500 p-5 shadow-2xl shadow-black/30">
            <div>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">Ticket Online</p>
              <h1 className="text-2xl font-black leading-tight">Ticket to Ride Europe</h1>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/50">Lobby players + hidden tickets</p>
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
              const ticketPoints = completedTickets(player, routes);
              const totalScore = player.score + ticketPoints;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => !isOnlineGame && setActivePlayerIndex(index)}
                  className={`rounded-3xl border p-4 text-left shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-0.5 ${
                    index === activePlayerIndex
                      ? "border-white/25 bg-slate-800/95 ring-2 ring-white/15"
                      : "border-white/10 bg-slate-950/75 hover:bg-slate-800/90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-full border-[3px] bg-white text-2xl shadow-lg"
                      style={{ borderColor: player.colorHex }}
                    >
                      {player.avatar}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-base font-black text-slate-50">{player.name}</strong>
                      <span className="text-sm font-semibold text-slate-400">{player.isHuman ? "You" : "Opponent"}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-400">
                    <span className="col-span-2 text-2xl font-light text-slate-50">{totalScore.toLocaleString()} pts</span>
                    <span>{player.trains} trains</span>
                    <span>{handCount(player.hand)} cards</span>
                    <span className="col-span-2 text-xs text-slate-500">
                      routes {player.score} + tickets {ticketPoints}
                    </span>
                    <span className="col-span-2 text-xs text-emerald-300">
                      {player.isHuman ? `${player.tickets.length} hidden tickets` : "Tickets hidden"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <section className="mt-4 rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Leaderboard</h2>
            <div className="space-y-2">
              {rankedPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                  <span className="font-bold">
                    {index + 1}. {player.name}
                  </span>
                  <span className="font-black">{player.score + completedTickets(player, routes)}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[#d8e5d2] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-black/10 bg-white/40 px-5 py-4 text-slate-900">
            <div>
              <h2 className="text-xl font-black">Europe Board</h2>
              <p className="text-sm font-semibold text-slate-600">
                Active player: <span className="font-black">{activePlayer.name}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className={`rounded-full px-4 py-2 text-sm font-black ${isMyTurn ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"}`}>
                {isMyTurn ? "Your turn" : `${activePlayer.name}'s turn`}
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-black ${turnSecondsLeft <= 15 ? "bg-red-600 text-white" : "bg-slate-900 text-white"}`}>
                ⏱ {turnSecondsLeft}s
              </div>
              <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white">
                {deck.length} cards in deck
              </div>
              {isOnlineGame && (
                <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-900">
                  WS: {connectionStatus}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-auto p-2">
            <svg viewBox="0 0 100 75" className="min-h-[620px] w-full min-w-[820px] rounded-[1.5rem] bg-[#cfe1c5]">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0.7" stdDeviation="0.7" floodOpacity="0.35" />
                </filter>
                <linearGradient id="water" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#d9f0ff" />
                  <stop offset="100%" stopColor="#9fd0ec" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="100" height="75" fill="url(#water)" />
              <path
                d="M8 13 C18 3, 33 8, 42 14 C53 22, 67 14, 82 22 C95 29, 97 48, 90 62 C80 72, 62 70, 47 66 C34 62, 19 70, 8 62 C-1 52, 1 26, 8 13 Z"
                fill="#d4d99f"
                stroke="#9ca36a"
                strokeWidth="0.6"
                opacity="0.95"
              />
              <path
                d="M33 43 C38 39, 47 40, 54 45 C63 51, 69 57, 72 67 C61 71, 47 70, 37 64 C29 59, 28 49, 33 43 Z"
                fill="#c9d58d"
                stroke="#9ca36a"
                strokeWidth="0.5"
                opacity="0.9"
              />

              {routes.map((route) => {
                const meta = ROUTE_META[route.color];
                const owner = players.find((player) => player.id === route.ownerId);
                const geometry = routeGeometry(route, cityById);
                const selected = selectedRouteId === route.id;
                const fill = owner?.colorHex ?? meta.fill;
                const stroke = owner ? "#ffffff" : meta.stroke;

                const items = Array.from({ length: route.length }, (_, index) => {
                  const t = (index + 1) / (route.length + 1);
                  const x = geometry.x1 + (geometry.x2 - geometry.x1) * t;
                  const y = geometry.y1 + (geometry.y2 - geometry.y1) * t;

                  return (
                    <g key={`${route.id}-${index}`} transform={`translate(${x} ${y}) rotate(${geometry.angle})`}>
                      <rect
                        x="-1.25"
                        y="-0.72"
                        width="2.5"
                        height="1.44"
                        rx="0.35"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={selected ? 0.35 : 0.18}
                        filter="url(#shadow)"
                      />
                      {route.type === "ferry" && index < (route.ferryLocos ?? 1) && (
                        <text
                          x="0"
                          y="0.28"
                          textAnchor="middle"
                          fontSize="0.95"
                          fontWeight="900"
                          fill={owner ? "#ffffff" : "#111827"}
                        >
                          ★
                        </text>
                      )}
                    </g>
                  );
                });

                return (
                  <g key={route.id} className="cursor-pointer" onClick={() => setSelectedRouteId(route.id)}>
                    <line
                      x1={geometry.x1}
                      y1={geometry.y1}
                      x2={geometry.x2}
                      y2={geometry.y2}
                      stroke={selected ? "#10b981" : "rgba(15,23,42,0.24)"}
                      strokeWidth={selected ? 1.25 : 0.8}
                      strokeLinecap="round"
                    />
                    {items}
                  </g>
                );
              })}

              {CITIES.map((city) => (
                <g key={city.id}>
                  <circle cx={city.x} cy={city.y} r="1.65" fill="#111827" stroke="#ffffff" strokeWidth="0.7" />
                  <circle cx={city.x} cy={city.y} r="0.75" fill="#fef3c7" />
                  <text
                    x={city.x + (city.labelDx ?? 1)}
                    y={city.y + (city.labelDy ?? -0.8)}
                    textAnchor={city.labelAnchor ?? "start"}
                    fontSize="1.65"
                    fontWeight="900"
                    fill="#0f172a"
                    stroke="#f8fafc"
                    strokeWidth="0.22"
                    paintOrder="stroke"
                  >
                    {city.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Claim route</h2>

            {selectedRoute ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-lg font-black">
                    {cityName(selectedRoute.from)} → {cityName(selectedRoute.to)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {selectedRoute.length} trains · {selectedRoute.points} points ·{" "}
                    {selectedRoute.color === "gray" ? "Any color" : ROUTE_META[selectedRoute.color].label}
                    {selectedRoute.type === "ferry" ? ` · ferry needs ${selectedRoute.ferryLocos ?? 1} loco` : ""}
                    {selectedRoute.type === "tunnel" ? " · tunnel" : ""}
                  </p>
                </div>

                {selectedRoute.color === "gray" && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Choose color for gray route
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {CLAIM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`rounded-2xl px-3 py-2 text-xs font-black ring-2 transition ${
                            selectedColor === color ? "ring-emerald-400" : "ring-white/10"
                          } ${CARD_META[color].miniClassName}`}
                        >
                          {CARD_META[color].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={claimSelectedRoute}
                  disabled={!currentCanClaim}
                  className="w-full rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 px-4 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  Claim selected route
                </button>
              </div>
            ) : (
              <p className="rounded-2xl bg-white/5 p-4 text-sm font-semibold text-slate-400">
                Click any route on the map to select it.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Train cards</h2>

            <div className="grid grid-cols-5 gap-2">
              {market.map((card, index) => (
                <button
                  key={`${card}-${index}`}
                  type="button"
                  onClick={() => drawMarketCard(index)}
                  disabled={!isMyTurn}
                  className="transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <TrainCard card={card} />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={drawBlindCard}
              disabled={!isMyTurn || cardsDrawnThisTurn >= 2}
              className="mt-3 w-full rounded-2xl bg-white/10 px-4 py-3 font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Draw blind card ({cardsDrawnThisTurn}/2)
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              {activePlayer.name}'s hand
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {CARD_COLORS.map((color) => (
                <div key={color} className={`rounded-2xl px-3 py-2 text-center text-xs font-black ${CARD_META[color].miniClassName}`}>
                  {CARD_META[color].label}: {activePlayer.hand[color]}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Your hidden tickets</h2>
            <div className="space-y-2">
              {players[0]?.tickets.map((ticket) => {
                const completed = hasConnection(players[0], routes, ticket.from, ticket.to);

                return (
                  <div
                    key={ticketId(ticket)}
                    className={`rounded-2xl border p-3 ${
                      completed ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="font-black">
                      {cityName(ticket.from)} → {cityName(ticket.to)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {ticket.points} pts · {completed ? "completed" : "not completed"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Game log</h2>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {log.map((item) => (
                <p key={item.id} className="rounded-2xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300">
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
