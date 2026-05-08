import { useMemo, useState } from "react";

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
  if (deck.length === 0) return { deck };
  const [card, ...rest] = deck;
  return { card, deck: rest };
}

function cityName(id: CityId): string {
  return CITIES.find((city) => city.id === id)?.name ?? id;
}

function createPlayers(
  deckStart: CardColor[],
  ticketDeckStart: Ticket[],
): { players: Player[]; deck: CardColor[]; ticketDeck: Ticket[] } {
  let deck = [...deckStart];
  let ticketDeck = [...ticketDeckStart];

  const rawPlayers = [
    { id: "p1", name: "Хлеп", avatar: "🐱", color: "red" as PlayerColor, isHuman: true },
    { id: "p2", name: "ratushnyi", avatar: "🧑‍💻", color: "blue" as PlayerColor, isHuman: false },
    { id: "p3", name: "goodcoach87", avatar: "🚴", color: "green" as PlayerColor, isHuman: false },
    { id: "p4", name: "Zemel9", avatar: "🦉", color: "yellow" as PlayerColor, isHuman: false },
    { id: "p5", name: "Булат", avatar: "😎", color: "black" as PlayerColor, isHuman: false },
  ];

  const players: Player[] = rawPlayers.map((player) => {
    const hand = emptyHand();

    for (let i = 0; i < 4; i += 1) {
      const next = drawOne(deck);
      deck = next.deck;
      if (next.card) hand[next.card] += 1;
    }

    const startingTickets = ticketDeck.slice(0, 4);
    ticketDeck = ticketDeck.slice(4);

    return {
      ...player,
      colorHex: PLAYER_COLORS[player.color],
      score: 0,
      trains: 35,
      hand,
      tickets: startingTickets.slice(0, 2),
    };
  });

  return { players, deck, ticketDeck };
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

function canClaimRoute(player: Player, route: Route, selectedColor: CardColor): boolean {
  if (route.ownerId) return false;
  if (player.trains < route.length) return false;

  const requiredLocos = route.type === "ferry" ? route.ferryLocos ?? 1 : 0;
  if (player.hand.wild < requiredLocos) return false;

  if (selectedColor === "wild") {
    return player.hand.wild >= route.length;
  }

  if (route.color !== "gray" && route.color !== selectedColor) {
    return false;
  }

  return player.hand[selectedColor] + player.hand.wild >= route.length;
}

function spendCards(hand: Record<CardColor, number>, color: CardColor, amount: number, requiredLocos = 0): Record<CardColor, number> {
  const newHand = { ...hand };
  const mandatoryLocos = Math.min(requiredLocos, newHand.wild);
  newHand.wild -= mandatoryLocos;

  const remainingAmount = amount - mandatoryLocos;
  const colorUsed = color === "wild" ? 0 : Math.min(newHand[color], remainingAmount);
  const extraWildUsed = remainingAmount - colorUsed;

  if (color !== "wild") {
    newHand[color] -= colorUsed;
  }

  newHand.wild -= extraWildUsed;
  return newHand;
}

function spentCardsPreview(hand: Record<CardColor, number>, color: CardColor, route: Route): string {
  const requiredLocos = route.type === "ferry" ? route.ferryLocos ?? 1 : 0;
  if (color === "wild") return `${route.length} locomotives`;

  const regularNeeded = route.length - requiredLocos;
  const regularUsed = Math.min(hand[color], regularNeeded);
  const extraWild = regularNeeded - regularUsed;

  const parts: string[] = [];
  if (regularUsed > 0) parts.push(`${regularUsed} ${CARD_META[color].label}`);
  if (requiredLocos > 0) parts.push(`${requiredLocos} required locomotive${requiredLocos > 1 ? "s" : ""}`);
  if (extraWild > 0) parts.push(`${extraWild} extra locomotive${extraWild > 1 ? "s" : ""}`);

  return parts.join(" + ");
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
      if (!visited.has(next)) queue.push(next);
    });
  }

  return false;
}

function completedTickets(player: Player, routes: Route[]): number {
  return player.tickets.reduce((sum, ticket) => {
    return hasPath(player.id, ticket.from, ticket.to, routes) ? sum + ticket.points : sum;
  }, 0);
}

function handCount(hand: Record<CardColor, number>): number {
  return CARD_COLORS.reduce((sum, color) => sum + hand[color], 0);
}

function BoardBackground() {
  const topNums = Array.from({ length: 35 }, (_, i) => i + 1);
  const bottomNums = Array.from({ length: 35 }, (_, i) => 70 - i);

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 70" preserveAspectRatio="none">
      <defs>
        <linearGradient id="seaGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cfe6f2" />
          <stop offset="45%" stopColor="#bdd9e8" />
          <stop offset="100%" stopColor="#a9cadc" />
        </linearGradient>
        <linearGradient id="landGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4ead1" />
          <stop offset="58%" stopColor="#e2cfaa" />
          <stop offset="100%" stopColor="#c7aa7a" />
        </linearGradient>
        <filter id="landShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="0.42" stdDeviation="0.38" floodColor="#5f4a32" floodOpacity="0.28" />
        </filter>
        <filter id="labelGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.12" stdDeviation="0.18" floodColor="#ffffff" floodOpacity="0.8" />
        </filter>
      </defs>

      <rect x="0" y="0" width="100" height="70" fill="url(#seaGradient)" />

      <g opacity="0.18" stroke="#ffffff" strokeWidth="0.16" fill="none">
        <path d="M5 13 C 11 11, 18 12, 26 10" />
        <path d="M65 13 C 75 11, 86 13, 96 11" />
        <path d="M6 32 C 13 30, 20 31, 28 30" />
        <path d="M5 58 C 18 56, 31 58, 43 56" />
        <path d="M58 61 C 71 59, 84 61, 96 59" />
      </g>

      <g filter="url(#landShadow)">
        {/* Great Britain and Ireland area */}
        <path
          d="M5.4 8.4 L12.2 5.6 L19.4 5.9 L24.8 8.1 L30.1 10.9 L31.8 17.1 L31.1 24.8 L28.2 31.0 L23.1 33.2 L17.5 31.6 L12.9 27.9 L10.1 21.3 L5.4 16.3 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.25"
        />

        {/* Mainland Europe: one connected shape, with Brittany, France, Iberia, Central/Eastern Europe and Balkans */}
        <path
          d="M12.2 34.4
             L15.2 29.2 L22.3 27.8 L30.6 27.2 L38.9 28.2 L46.7 31.0
             L52.5 35.2 L59.0 34.1 L68.4 35.9 L76.6 40.2 L81.7 46.7
             L83.9 53.2 L80.6 59.4 L73.6 64.0 L63.0 64.3 L53.3 61.0
             L45.9 53.0 L40.2 56.6 L32.0 59.2 L24.0 62.2 L16.2 59.3
             L12.5 51.0 L11.5 42.1 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.27"
        />

        {/* Scandinavia and North-East mainland, connected visually to Europe through Denmark/Baltic area */}
        <path
          d="M40.2 7.1 L55.8 4.6 L69.3 5.9 L83.9 9.2 L91.1 14.8
             L95.3 22.9 L94.1 32.0 L89.3 38.7 L81.4 42.0 L72.6 41.2
             L64.2 38.5 L55.6 33.0 L48.7 28.0 L43.5 23.0 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.25"
        />

        {/* Denmark / northern Germany bridge */}
        <path
          d="M40.3 22.4 L46.4 22.9 L49.6 27.5 L47.1 31.2 L41.8 29.1 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.22"
        />

        {/* Anatolia / Caucasus area */}
        <path
          d="M72.3 47.7 L82.8 46.0 L94.6 49.1 L98.0 55.4 L98.0 63.7
             L93.7 67.2 L83.5 67.4 L74.9 63.5 L70.9 57.4 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.25"
        />

        {/* Italy boot, connected but shaped more naturally */}
        <path
          d="M34.0 56.3 L39.5 55.0 L43.7 58.2 L45.4 62.8 L44.2 67.0
             L38.6 68.1 L33.3 65.0 L32.5 60.2 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.25"
        />

        {/* Portugal / south-west edge */}
        <path
          d="M2.2 54.3 L7.3 53.5 L10.3 58.2 L10.2 65.2 L6.4 67.3
             L2.1 65.1 L1.4 58.4 Z"
          fill="url(#landGradient)"
          stroke="#9f8255"
          strokeWidth="0.25"
        />
      </g>

      {/* Inner region lines for an old-map feeling */}
      <g opacity="0.24" stroke="#9f8255" strokeWidth="0.18" fill="none">
        <path d="M14 40 L25 38 L36 40 L46 44" />
        <path d="M30 28 L33 37 L32 47 L28 56" />
        <path d="M48 36 L57 46 L62 57" />
        <path d="M62 36 L71 43 L76 53" />
        <path d="M73 48 L82 47 L94 51" />
        <path d="M44 23 L52 20 L62 18 L72 18 L86 20" />
        <path d="M52 35 L59 34 L69 36" />
      </g>

      {/* A few coast/sea strokes */}
      <g opacity="0.18" stroke="#6f9fb8" strokeWidth="0.18" fill="none">
        <path d="M7 13 C 14 11, 20 13, 28 11" />
        <path d="M68 14 C 77 12, 87 14, 96 12" />
        <path d="M40 66 C 49 64, 57 65, 66 64" />
        <path d="M74 60 C 83 59, 91 60, 97 58" />
      </g>

      {/* Board frame */}
      <rect x="0.8" y="0.8" width="98.4" height="68.4" rx="2.8" fill="none" stroke="#d9c7a5" strokeWidth="1.2" />
      <rect x="1.8" y="1.8" width="96.4" height="66.4" rx="2.2" fill="none" stroke="#edf5fb" strokeWidth="0.55" />
      <rect x="2.4" y="2.4" width="95.2" height="65.2" rx="2" fill="none" stroke="#7da0ba" strokeWidth="0.2" opacity="0.6" />

      {topNums.map((n, i) => {
        const x = 2.2 + i * 2.75;
        return (
          <g key={`top-${n}`}>
            <circle cx={x} cy={2.1} r="1.08" fill="#15739a" stroke="#d9c7a5" strokeWidth="0.25" />
            <text x={x} y={2.45} textAnchor="middle" fontSize="0.72" fontWeight="900" fill="#ffffff">
              {n}
            </text>
          </g>
        );
      })}

      {bottomNums.map((n, i) => {
        const x = 2.2 + i * 2.75;
        return (
          <g key={`bottom-${n}`}>
            <circle cx={x} cy={67.9} r="1.08" fill="#15739a" stroke="#d9c7a5" strokeWidth="0.25" />
            <text x={x} y={68.25} textAnchor="middle" fontSize="0.72" fontWeight="900" fill="#ffffff">
              {n}
            </text>
          </g>
        );
      })}

      <g opacity="0.58">
        <rect x="10" y="9" width="14" height="7" rx="0.8" fill="rgba(255,255,255,0.23)" stroke="rgba(99,82,58,0.35)" strokeWidth="0.18" />
        <text x="11" y="11.2" fontSize="0.82" fontWeight="900" fill="#334155">
          Route scoring
        </text>
        <text x="11" y="13" fontSize="0.65" fontWeight="700" fill="#475569">
          1 2 3 4 5 6 7 8
        </text>
        <text x="11" y="14.4" fontSize="0.65" fontWeight="700" fill="#475569">
          1 2 4 7 10 15 18 21
        </text>
      </g>
    </svg>
  );
}

function RouteSlot({
  x,
  y,
  angle,
  fill,
  stroke,
  claimed,
  type,
  isRequiredLoco,
}: {
  x: number;
  y: number;
  angle: number;
  fill: string;
  stroke: string;
  claimed: boolean;
  type?: RouteType;
  isRequiredLoco?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      {type === "tunnel" && !claimed && (
        <rect x="-1.7" y="-0.76" width="3.4" height="1.52" rx="0.36" fill="#475569" opacity="0.45" />
      )}
      <rect
        x="-1.45"
        y="-0.54"
        width="2.9"
        height="1.08"
        rx="0.28"
        fill={isRequiredLoco && !claimed ? "#8b5cf6" : fill}
        stroke={stroke}
        strokeWidth="0.18"
        opacity={claimed ? 0.98 : 0.96}
      />
      {isRequiredLoco && !claimed && (
        <text x="0" y="0.32" textAnchor="middle" fontSize="0.72" fontWeight="900" fill="#ffffff">
          ★
        </text>
      )}
      {claimed && (
        <>
          <rect x="-0.62" y="-0.2" width="0.86" height="0.4" rx="0.1" fill="rgba(255,255,255,0.22)" />
          <circle cx="-0.72" cy="0.46" r="0.12" fill="#111827" />
          <circle cx="0.72" cy="0.46" r="0.12" fill="#111827" />
        </>
      )}
    </g>
  );
}

function CityNode({ city, active }: { city: City; active: boolean }) {
  const dx = city.labelDx ?? 1.1;
  const dy = city.labelDy ?? -0.8;

  return (
    <g className="pointer-events-none">
      {active && <circle cx={city.x} cy={city.y} r="2.05" fill="rgba(255,255,255,0.55)" />}
      <circle cx={city.x} cy={city.y} r="1.28" fill="#f59e0b" stroke="#92400e" strokeWidth="0.34" />
      <circle cx={city.x} cy={city.y} r="0.53" fill="#fff7ed" stroke="rgba(146,64,14,0.45)" strokeWidth="0.1" />
      <text
        x={city.x + dx}
        y={city.y + dy}
        fontSize={active ? "1.1" : "0.95"}
        fontWeight="900"
        fill="#0f172a"
        stroke="rgba(255,255,255,0.98)"
        strokeWidth={active ? "0.45" : "0.36"}
        paintOrder="stroke"
        letterSpacing="0.01em"
      >
        {city.name}
      </text>
    </g>
  );
}

function getOffsetRoutePoints(from: City, to: City, offset = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const normalX = (-dy / distance) * offset;
  const normalY = (dx / distance) * offset;

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

export default function GameBoard() {
  const initialDeck = useMemo(() => makeDeck(), []);
  const initialTicketDeck = useMemo(() => shuffle(INITIAL_TICKETS), []);
  const prepared = useMemo(() => createPlayers(initialDeck, initialTicketDeck), [initialDeck, initialTicketDeck]);
  const preparedMarket = useMemo(() => refillMarket(prepared.deck, []), [prepared.deck]);

  const [players, setPlayers] = useState<Player[]>(prepared.players);
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
      text: "Game started. Each player begins with 35 trains, 4 train cards, and 2 kept destination tickets.",
    },
  ]);

  const activePlayer = players[activePlayerIndex];
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const cityById = useMemo(() => new Map(CITIES.map((city) => [city.id, city])), []);
  const currentCanClaim = selectedRoute ? canClaimRoute(activePlayer, selectedRoute, selectedColor) : false;

  const rankedPlayers = [...players].sort((a, b) => {
    const aScore = a.score + completedTickets(a, routes);
    const bScore = b.score + completedTickets(b, routes);
    return bScore - aScore;
  });

  function addLog(text: string) {
    setLog((items) => [{ id: Date.now() + Math.random(), text }, ...items].slice(0, 10));
  }

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

  function drawMarketCard(card: CardColor, cardIndex: number) {
    if (cardsDrawnThisTurn >= 2) return;

    if (card === "wild" && cardsDrawnThisTurn > 0) {
      addLog("You cannot take a face-up locomotive as your second card.");
      return;
    }

    const nextMarket = market.filter((_, index) => index !== cardIndex);
    const refilled = refillMarket(deck, nextMarket);

    setDeck(refilled.deck);
    setMarket(refilled.market);
    addCardToActivePlayer(card);
    addLog(`${activePlayer.name} drew ${CARD_META[card].label}.`);

    if (card === "wild") {
      nextTurn();
      return;
    }

    const newDrawCount = cardsDrawnThisTurn + 1;
    setCardsDrawnThisTurn(newDrawCount);
    if (newDrawCount >= 2) nextTurn();
  }

  function claimSelectedRoute() {
    if (cardsDrawnThisTurn > 0) {
      addLog("You already started drawing train cards this turn.");
      return;
    }

    if (!selectedRoute) {
      addLog("Select a route first.");
      return;
    }

    if (!currentCanClaim) {
      addLog("You do not have the full required set of cards for this route.");
      return;
    }

    const requiredLocos = selectedRoute.type === "ferry" ? selectedRoute.ferryLocos ?? 1 : 0;

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
              hand: spendCards(player.hand, selectedColor, selectedRoute.length, requiredLocos),
            }
          : player,
      ),
    );

    addLog(`${activePlayer.name} claimed ${cityName(selectedRoute.from)} → ${cityName(selectedRoute.to)} for ${selectedRoute.points} points.`);
    setSelectedRouteId(null);
    nextTurn();
  }

  function drawDestinationTickets() {
    if (cardsDrawnThisTurn > 0) {
      addLog("You already started drawing train cards this turn.");
      return;
    }

    const drawnTickets = ticketDeck.slice(0, 3);
    if (drawnTickets.length === 0) {
      addLog("Destination ticket deck is empty.");
      return;
    }

    const keptTickets = drawnTickets.slice(0, 1);
    const returnedTickets = drawnTickets.slice(1);

    setTicketDeck([...ticketDeck.slice(3), ...returnedTickets]);
    setPlayers((currentPlayers) =>
      currentPlayers.map((player, index) =>
        index === activePlayerIndex ? { ...player, tickets: [...player.tickets, ...keptTickets] } : player,
      ),
    );

    addLog(`${activePlayer.name} drew 3 tickets and kept 1 in this prototype.`);
    nextTurn();
  }

  function botMove() {
    const player = players[activePlayerIndex];
    if (player.isHuman) return;

    const possibleRoutes = routes.filter((route) => {
      const colorOptions = route.color === "gray" ? CLAIM_COLORS : [route.color as CardColor, "wild"];
      return colorOptions.some((color) => canClaimRoute(player, route, color as CardColor));
    });

    if (possibleRoutes.length > 0) {
      const route = shuffle(possibleRoutes)[0];
      const colorOptions = route.color === "gray" ? CLAIM_COLORS : [route.color as CardColor, "wild"];
      const usableColor = colorOptions.find((color) => canClaimRoute(player, route, color as CardColor)) ?? "wild";
      const requiredLocos = route.type === "ferry" ? route.ferryLocos ?? 1 : 0;

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
                hand: spendCards(item.hand, usableColor as CardColor, route.length, requiredLocos),
              }
            : item,
        ),
      );

      addLog(`${player.name} claimed ${cityName(route.from)} → ${cityName(route.to)}.`);
      nextTurn();
      return;
    }

    const next = drawOne(deck);
    if (!next.card) {
      addLog(`${player.name} skipped because the deck is empty.`);
      nextTurn();
      return;
    }

    setDeck(next.deck);
    setPlayers((currentPlayers) =>
      currentPlayers.map((item, index) =>
        index === activePlayerIndex
          ? { ...item, hand: { ...item.hand, [next.card as CardColor]: item.hand[next.card as CardColor] + 1 } }
          : item,
      ),
    );

    addLog(`${player.name} drew a train card.`);
    nextTurn();
  }

  function resetGame() {
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
    setLog([{ id: Date.now(), text: "New game started." }]);
  }

  return (
    <main className="min-h-screen bg-[#20262b] p-3 text-slate-50 md:p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-1 gap-4 xl:grid-cols-[240px_minmax(780px,1fr)_350px]">
        <aside className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-red-500 to-orange-500 p-5 shadow-2xl shadow-black/30">
            <div>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">Ticket Online</p>
              <h1 className="text-2xl font-black leading-tight">Ticket to Ride Europe</h1>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/50">Classic Europe board layout</p>
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
                  onClick={() => setActivePlayerIndex(index)}
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
                      <span className="text-sm font-semibold text-slate-400">{player.isHuman ? "You" : "Bot"}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-400">
                    <span className="col-span-2 text-2xl font-light text-slate-50">${totalScore.toLocaleString()}k</span>
                    <span>{player.trains} trains</span>
                    <span>{handCount(player.hand)} cards</span>
                    <span className="col-span-2 text-xs text-slate-500">routes {player.score} + tickets {ticketPoints}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid min-w-0 grid-rows-[auto_1fr] gap-4">
          <header className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex-row lg:items-center">
            <div>
              <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Current turn</p>
              <h2 className="flex items-center gap-3 text-2xl font-black">
                <span className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.10)]" style={{ backgroundColor: activePlayer.colorHex }} />
                {activePlayer.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                {cardsDrawnThisTurn > 0 ? `Train cards drawn this turn: ${cardsDrawnThisTurn}/2` : "Choose one action: draw cards, claim route, or draw tickets."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
              {market.map((card, index) => (
                <button
                  key={`${card}-${index}`}
                  type="button"
                  onClick={() => drawMarketCard(card, index)}
                  className={`group relative h-24 w-16 overflow-hidden rounded-2xl bg-gradient-to-br p-2 text-xs font-black shadow-xl shadow-black/25 ring-2 transition hover:-translate-y-1 ${CARD_META[card].className}`}
                >
                  <span className="absolute left-2 top-1 text-lg drop-shadow">{CARD_META[card].symbol}</span>
                  <span className="absolute right-2 top-1 text-lg drop-shadow">🚂</span>
                  <span className="grid h-full place-items-center rounded-xl border border-white/25 bg-white/20 text-center text-[11px] uppercase tracking-wide backdrop-blur-sm">
                    {CARD_META[card].label}
                  </span>
                  <span className="absolute bottom-1 left-2 text-lg drop-shadow">🚃</span>
                </button>
              ))}

              <button
                type="button"
                onClick={drawBlindCard}
                className="h-24 w-16 rounded-2xl border-2 border-slate-400/50 bg-[linear-gradient(135deg,#334155,#020617)] p-2 text-xs font-black text-white shadow-xl shadow-black/25 transition hover:-translate-y-1"
              >
                <span className="block text-lg">🚂</span>
                Deck
                <small className="block text-sm text-slate-300">{deck.length}</small>
              </button>
            </div>
          </header>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40" style={{ aspectRatio: "800 / 560" }}>
            <BoardBackground />

            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 70" preserveAspectRatio="none">
              {routes.map((route) => {
                const from = cityById.get(route.from);
                const to = cityById.get(route.to);
                const owner = players.find((player) => player.id === route.ownerId);

                if (!from || !to) return null;

                const { x1, y1, x2, y2, angle } = getOffsetRoutePoints(from, to, route.offset ?? 0);
                const dx = x2 - x1;
                const dy = y2 - y1;
                const fill = owner ? owner.colorHex : ROUTE_META[route.color].fill;
                const stroke = owner ? "#111827" : ROUTE_META[route.color].stroke;
                const selected = selectedRouteId === route.id;

                return (
                  <g key={route.id} className="cursor-pointer transition hover:opacity-85" onClick={() => setSelectedRouteId(route.id)}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="5.4" strokeLinecap="round" />

                    {selected && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />}

                    {Array.from({ length: route.length }).map((_, index) => {
                      const t = (index + 1) / (route.length + 1);
                      const x = x1 + dx * t;
                      const y = y1 + dy * t;
                      const isRequiredLoco = route.type === "ferry" && index < (route.ferryLocos ?? 1);

                      return (
                        <RouteSlot
                          key={`${route.id}-${index}`}
                          x={x}
                          y={y}
                          angle={angle}
                          fill={fill}
                          stroke={stroke}
                          claimed={Boolean(owner)}
                          type={route.type}
                          isRequiredLoco={isRequiredLoco}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {CITIES.map((city) => (
                <CityNode key={city.id} city={city} active={selectedRoute?.from === city.id || selectedRoute?.to === city.id} />
              ))}
            </svg>
          </div>
        </section>

        <aside className="grid min-w-0 gap-3 md:grid-cols-2 xl:flex xl:flex-col">
          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Selected route</p>
            {selectedRoute ? (
              <>
                <h3 className="text-xl font-black">
                  {cityName(selectedRoute.from)} → {cityName(selectedRoute.to)}
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">Need: {selectedRoute.length}</span>
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">Score: {selectedRoute.points}</span>
                  <span className="rounded-2xl bg-white/10 p-3 text-xs font-bold text-slate-300">Color: {ROUTE_META[selectedRoute.color].label}</span>
                </div>
                <div className="mt-3 rounded-2xl bg-white/5 p-3 text-sm font-semibold text-slate-300">
                  {selectedRoute.ownerId ? (
                    <span className="text-red-200">Already claimed by {players.find((player) => player.id === selectedRoute.ownerId)?.name}.</span>
                  ) : currentCanClaim ? (
                    <span className="text-green-200">
                      You will spend exactly {selectedRoute.length} cards: {spentCardsPreview(activePlayer.hand, selectedColor, selectedRoute)}.
                    </span>
                  ) : (
                    <span className="text-yellow-200">You must have the full amount in one turn. Partial building is not allowed.</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-slate-400">Click any route on the board.</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Choose cards for claiming</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {CLAIM_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`min-h-16 rounded-2xl p-2 text-center text-xs font-black shadow-lg shadow-black/20 transition hover:-translate-y-0.5 ${CARD_META[color].miniClassName} ${
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
              disabled={!selectedRoute || !currentCanClaim || cardsDrawnThisTurn > 0}
              onClick={claimSelectedRoute}
              className="mb-2 w-full rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 px-4 py-3 font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Claim full route
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={drawDestinationTickets}
                disabled={cardsDrawnThisTurn > 0}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Draw tickets
              </button>
              <button
                type="button"
                onClick={activePlayer.isHuman ? nextTurn : botMove}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                {activePlayer.isHuman ? "Skip" : "Bot move"}
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Destination tickets</p>
            <div className="grid gap-2">
              {activePlayer.tickets.map((ticket) => {
                const done = hasPath(activePlayer.id, ticket.from, ticket.to, routes);
                return (
                  <div
                    key={`${ticket.from}-${ticket.to}-${ticket.points}`}
                    className={`flex items-center justify-between gap-3 rounded-2xl p-3 text-sm font-bold ${done ? "bg-green-500/20 text-green-200" : "bg-white/10 text-slate-300"}`}
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

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
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

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:col-span-2 xl:col-span-1">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Rules implemented</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-sm leading-6 text-slate-400">
              <li>35 trains and 4 train cards at start.</li>
              <li>Claim a full route only; no partial building.</li>
              <li>Gray routes accept any one color plus locomotives.</li>
              <li>Ferry routes require locomotive cards where stars are shown.</li>
              <li>Tunnel routes are visually marked; extra tunnel draw is not simulated yet.</li>
              <li>Face-up locomotive ends the draw action.</li>
            </ul>

            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Game log</p>
            <div className="grid max-h-64 gap-2 overflow-auto pr-1">
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
