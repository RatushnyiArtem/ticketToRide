import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Button from "../../components/Button";
import { getAuthToken } from "../../lib/authApi";
import { claimRoute, getGameState, startGame, type GameRoute, type GameState } from "../../lib/gameApi";
import { connectGameSocket, type GameSocketEvent } from "../../lib/gameSocket";

const playerTokenKey = (gameId: string) => `ttr_player_token_${gameId}`;
const playerIdKey = (gameId: string) => `ttr_player_id_${gameId}`;
const startingTicketsKey = (gameId: string) => `ttr_selected_starting_tickets_${gameId}`;

type RouteColor = "red" | "blue" | "green" | "yellow" | "black" | "white" | "orange" | "pink" | "gray";
type TicketType = "long" | "short";
type ConnectionStatus = "connecting" | "connected" | "closed" | "error";

interface City {
  id: string;
  name: string;
  x: number;
  y: number;
  labelDx?: number;
  labelDy?: number;
  labelAnchor?: "start" | "middle" | "end";
}

interface TemplateRoute {
  id: string;
  from: string;
  to: string;
  color: RouteColor;
  length: number;
  offset?: number;
  type?: "normal" | "ferry" | "tunnel";
  ferryLocos?: number;
}

interface BoardRoute {
  backendId: number;
  from: string;
  to: string;
  color: RouteColor;
  length: number;
  points: number;
  claimedByPlayerId: string | null;
  offset?: number;
  type?: "normal" | "ferry" | "tunnel";
  ferryLocos?: number;
  raw: GameRoute;
}

interface Ticket {
  id?: string;
  from: string;
  to: string;
  points: number;
  type?: TicketType;
}

interface StartingTicketOffer {
  longTicket: Ticket;
  shortTickets: Ticket[];
  allTickets: Ticket[];
}

const ROUTE_META: Record<RouteColor, { fill: string; stroke: string; label: string }> = {
  red: { fill: "#ef4444", stroke: "#991b1b", label: "Red" },
  blue: { fill: "#3b82f6", stroke: "#1d4ed8", label: "Blue" },
  green: { fill: "#22c55e", stroke: "#15803d", label: "Green" },
  yellow: { fill: "#facc15", stroke: "#a16207", label: "Yellow" },
  black: { fill: "#18181b", stroke: "#000000", label: "Black" },
  white: { fill: "#f8fafc", stroke: "#64748b", label: "White" },
  orange: { fill: "#f97316", stroke: "#c2410c", label: "Orange" },
  pink: { fill: "#ec4899", stroke: "#be185d", label: "Pink" },
  gray: { fill: "#cbd5e1", stroke: "#64748b", label: "Any color" },
};

const PLAYER_COLOR_HEX = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#27272a"];

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


const ROUTE_DEFS: TemplateRoute[] = [
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


function routePoints(length: number): number {
  const points: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15, 7: 18, 8: 21 };
  return points[length] ?? length;
}

function normalizeCityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const CITY_ALIASES: Record<string, string> = {
  kiev: "kyiv",
  kyiv: "kyiv",
  warsaw: "warsaw",
  warszawa: "warsaw",
  wilno: "wilno",
  vilnius: "wilno",
  danzig: "danzig",
  gdansk: "danzig",
  moscow: "moscow",
  moskva: "moscow",
  stpetersburg: "petrograd",
  saintpetersburg: "petrograd",
  petersburg: "petrograd",
  petrograd: "petrograd",
  copenhagen: "copenhagen",
  kobenhavn: "copenhagen",
  kopenhagen: "copenhagen",
  munich: "munich",
  munchen: "munich",
  zurich: "zurich",
  venezia: "venezia",
  venice: "venezia",
  roma: "roma",
  rome: "roma",
  lisboa: "lisboa",
  lisbon: "lisboa",
  bruxelles: "bruxelles",
  brussels: "bruxelles",
  athina: "athens",
  athens: "athens",
  bucuresti: "bucharest",
  bucharest: "bucharest",
  smyrna: "smyrna",
  izmir: "smyrna",
  constantinople: "constantinople",
  istanbul: "constantinople",
  sevastopol: "sevastopol",
  kharkiv: "kharkov",
  kharkov: "kharkov",
};

const CITY_ID_BY_NORMALIZED_NAME = new Map<string, string>();
CITIES.forEach((city) => {
  CITY_ID_BY_NORMALIZED_NAME.set(normalizeCityName(city.id), city.id);
  CITY_ID_BY_NORMALIZED_NAME.set(normalizeCityName(city.name), city.id);
});
Object.entries(CITY_ALIASES).forEach(([alias, id]) => CITY_ID_BY_NORMALIZED_NAME.set(normalizeCityName(alias), id));

function resolveCityId(value: string): string | null {
  return CITY_ID_BY_NORMALIZED_NAME.get(normalizeCityName(value)) ?? null;
}

function cityName(id: string): string {
  return CITIES.find((city) => city.id === id)?.name ?? id;
}

function ticketId(ticket: Ticket): string {
  return ticket.id ?? `${ticket.from}-${ticket.to}-${ticket.points}`;
}

function withTicketMeta(ticket: Ticket, type: TicketType): Ticket {
  return { ...ticket, id: `${type}-${ticket.from}-${ticket.to}-${ticket.points}`, type };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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
  return { longTicket, shortTickets: offeredShortTickets, allTickets: [longTicket, ...offeredShortTickets] };
}

function readSavedStartingTickets(key: string): Ticket[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Ticket[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveStartingTickets(key: string, tickets: Ticket[]) {
  localStorage.setItem(key, JSON.stringify(tickets));
}

function clearStartingTickets(key: string) {
  localStorage.removeItem(key);
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("--");
}

function getTemplateRouteForPair(from: string, to: string, occurrence: number): TemplateRoute | undefined {
  const matches = ROUTE_DEFS.filter((route) => pairKey(route.from, route.to) === pairKey(from, to));
  return matches[occurrence] ?? matches[0];
}

function buildBoardRoutes(routes: GameRoute[]): { boardRoutes: BoardRoute[]; unknownRoutes: GameRoute[] } {
  const occurrences = new Map<string, number>();
  const boardRoutes: BoardRoute[] = [];
  const unknownRoutes: GameRoute[] = [];

  routes.forEach((route) => {
    const from = resolveCityId(route.city_a);
    const to = resolveCityId(route.city_b);

    if (!from || !to) {
      unknownRoutes.push(route);
      return;
    }

    const key = pairKey(from, to);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);

    const template = getTemplateRouteForPair(from, to, occurrence);
    const automaticOffset = occurrence === 0 ? undefined : occurrence % 2 === 0 ? -0.55 : 0.55;

    boardRoutes.push({
      backendId: route.id,
      from,
      to,
      color: template?.color ?? "gray",
      length: route.length,
      points: route.points ?? routePoints(route.length),
      claimedByPlayerId: route.claimed_by_player_id,
      offset: template?.offset ?? automaticOffset,
      type: template?.type,
      ferryLocos: template?.ferryLocos,
      raw: route,
    });
  });

  return { boardRoutes, unknownRoutes };
}

function routeGeometry(route: BoardRoute, cityById: Map<string, City>) {
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
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

function getPlayerColor(playerId: string | null, game: GameState | null): string | null {
  if (!playerId || !game) return null;
  const index = game.players.findIndex((player) => player.id === playerId);
  if (index < 0) return "#64748b";
  return PLAYER_COLOR_HEX[index % PLAYER_COLOR_HEX.length];
}

function StartingTicketSelectionScreen({
  offer,
  selectedTicketIds,
  onToggleTicket,
  onConfirm,
  onResetSavedTickets,
}: {
  offer: StartingTicketOffer;
  selectedTicketIds: string[];
  onToggleTicket: (ticket: Ticket) => void;
  onConfirm: () => void;
  onResetSavedTickets: () => void;
}) {
  const selectedShortCount = selectedTicketIds.filter((id) =>
    offer.shortTickets.some((ticket) => ticketId(ticket) === id),
  ).length;
  const selectedTickets = offer.allTickets.filter((ticket) => selectedTicketIds.includes(ticketId(ticket)));
  const selectedTotal = selectedTickets.length;
  const totalPotentialPoints = selectedTickets.reduce((sum, ticket) => sum + ticket.points, 0);
  const canConfirm = selectedShortCount >= 1;

  const renderTicket = (ticket: Ticket, locked = false) => {
    const selected = selectedTicketIds.includes(ticketId(ticket));
    return (
      <button
        key={ticketId(ticket)}
        type="button"
        disabled={locked}
        onClick={() => onToggleTicket(ticket)}
        className={`group relative overflow-hidden rounded-[1.7rem] border-[3px] p-5 text-left shadow-xl transition ${
          selected
            ? "border-[#2f8f59] bg-[#fff7df] shadow-emerald-900/25"
            : "border-[#b78545]/60 bg-[#ead2a2] hover:-translate-y-1 hover:border-[#8a5d2e]"
        } ${locked ? "cursor-not-allowed" : ""}`}
      >
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,#ffffff_0,transparent_20%),radial-gradient(circle_at_80%_10%,#8b5a2b_0,transparent_18%)]" />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c4a1f]">
                {ticket.type === "long" ? "Long destination" : "Short destination"}
              </p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-[#3f2415]">
                {cityName(ticket.from)}
                <span className="mx-2 text-[#b85f21]">→</span>
                {cityName(ticket.to)}
              </h3>
            </div>
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[3px] border-[#6f421b] bg-gradient-to-br from-[#f9d26a] to-[#c27021] text-2xl font-black text-white shadow-lg">
              {ticket.points}
            </div>
          </div>
          <div className="mb-5 h-16 rounded-2xl border border-[#8b5a2b]/30 bg-[#d9b777]/45 p-3">
            <div className="flex h-full items-center justify-between gap-1">
              {Array.from({ length: Math.min(ticket.points > 16 ? 8 : 5, 8) }).map((_, index) => (
                <span
                  key={index}
                  className={`h-8 flex-1 rounded-md border border-black/20 shadow-inner ${
                    ticket.type === "long" ? "bg-gradient-to-b from-purple-300 to-purple-600" : "bg-gradient-to-b from-sky-300 to-sky-600"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-4 py-2 text-xs font-black ${ticket.type === "long" ? "bg-purple-800 text-purple-100" : "bg-sky-800 text-sky-100"}`}>
              {locked ? "Automatically kept" : "Click to keep/discard"}
            </span>
            <span
              className={`grid h-10 w-10 place-items-center rounded-full border-[3px] text-lg font-black shadow ${
                selected ? "border-[#1f6f42] bg-[#2f8f59] text-white" : "border-[#8b5a2b]/40 bg-[#f4dfad] text-[#8b5a2b]/35"
              }`}
            >
              ✓
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#1e2529] p-4 text-[#3f2415] md:p-7">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_10%,#d8b26c_0,transparent_25%),radial-gradient(circle_at_80%_20%,#4f8e97_0,transparent_24%),radial-gradient(circle_at_50%_100%,#120b06_0,transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl rounded-[2.2rem] border-[6px] border-[#7a4a22] bg-[#dfc18a] p-3 shadow-2xl shadow-black/50">
        <div className="rounded-[1.65rem] border-2 border-[#b9833f] bg-[#f1dfb8] p-5 md:p-7">
          <header className="grid gap-5 border-b-2 border-[#b9833f]/40 pb-6 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-[#9c5422]">Private route selection</p>
              <h1 className="text-4xl font-black leading-tight md:text-5xl">Choose your hidden routes</h1>
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#6f4b2a]">
                You receive one random long destination and three short destinations. The long route stays with you.
                Keep at least one short route, or keep all of them. Other players do not see this choice.
              </p>
            </div>
            <aside className="rounded-[1.5rem] border-2 border-[#7a4a22]/35 bg-[#2d3b40] p-5 text-white shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">Current choice</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4 text-center"><p className="text-3xl font-black">{selectedTotal}</p><p className="text-xs font-bold text-white/60">tickets</p></div>
                <div className="rounded-2xl bg-white/10 p-4 text-center"><p className="text-3xl font-black">{totalPotentialPoints}</p><p className="text-xs font-bold text-white/60">possible pts</p></div>
              </div>
              <div className="mt-4 rounded-2xl bg-black/20 p-3 text-sm font-semibold text-white/75">
                Short routes selected: <span className="font-black text-white">{selectedShortCount}</span>/3
              </div>
            </aside>
          </header>
          <section className="mt-7 grid gap-6 xl:grid-cols-[360px_1fr]">
            <div>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-black">Long route</h2><span className="rounded-full bg-purple-900 px-3 py-1 text-xs font-black text-purple-100">required</span></div>
              {renderTicket(offer.longTicket, true)}
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">Short routes</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${canConfirm ? "bg-emerald-800 text-emerald-100" : "bg-red-800 text-red-100"}`}>select at least one</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">{offer.shortTickets.map((ticket) => renderTicket(ticket))}</div>
            </div>
          </section>
          <footer className="mt-7 flex flex-col gap-4 rounded-[1.5rem] border-2 border-[#8b5a2b]/30 bg-[#d3ab68]/45 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-black">Opponent cannot see this menu</p>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#6f4b2a]">After confirmation the board opens immediately, and these selected tickets are stored locally for this player.</p>
              <button type="button" onClick={onResetSavedTickets} className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-[#8a5d2e] underline">Reset saved tickets for this game</button>
            </div>
            <button type="button" disabled={!canConfirm} onClick={onConfirm} className="rounded-2xl bg-gradient-to-br from-[#2f8f59] to-[#0f766e] px-7 py-4 text-lg font-black text-white shadow-xl shadow-black/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:hover:translate-y-0">
              Confirm routes and open board
            </button>
          </footer>
        </div>
      </div>
    </main>
  );
}

function EuropeBoardMap({
  game,
  boardRoutes,
  selectedRouteId,
  onSelectRoute,
}: {
  game: GameState | null;
  boardRoutes: BoardRoute[];
  selectedRouteId: number | null;
  onSelectRoute: (routeId: number) => void;
}) {
  const cityById = useMemo(() => new Map(CITIES.map((city) => [city.id, city])), []);

  return (
    <svg viewBox="0 0 100 75" className="min-h-[640px] w-full min-w-[900px] rounded-[1.5rem] bg-[#b9d7e4]">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0.65" stdDeviation="0.65" floodOpacity="0.38" /></filter>
        <filter id="softMapShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0.45" stdDeviation="0.45" floodColor="#4d321c" floodOpacity="0.32" /></filter>
        <linearGradient id="water" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stopColor="#d8eff7" /><stop offset="52%" stopColor="#b9d7e4" /><stop offset="100%" stopColor="#8bb6c5" /></linearGradient>
        <linearGradient id="land" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stopColor="#f2d9a5" /><stop offset="45%" stopColor="#dec083" /><stop offset="100%" stopColor="#c99d5d" /></linearGradient>
        <pattern id="paperTexture" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="transparent" /><circle cx="1" cy="1" r="0.18" fill="#704821" opacity="0.14" /><circle cx="4" cy="2.8" r="0.14" fill="#ffffff" opacity="0.18" /><path d="M0 4 L5 3.4" stroke="#704821" strokeWidth="0.05" opacity="0.14" /></pattern>
      </defs>

      <rect x="0" y="0" width="100" height="75" fill="url(#water)" />
      <rect x="0" y="0" width="100" height="75" fill="url(#paperTexture)" opacity="0.75" />
      <rect x="1.1" y="1.1" width="97.8" height="72.8" rx="2.2" fill="none" stroke="#6a4524" strokeWidth="1.3" />
      <rect x="2.35" y="2.35" width="95.3" height="70.3" rx="1.4" fill="none" stroke="#e4c077" strokeWidth="0.55" />

      {Array.from({ length: 31 }).map((_, index) => {
        const x = 5 + index * 3;
        return <g key={`score-top-${index}`}><circle cx={x} cy="3.1" r="1.25" fill="#0f6179" stroke="#f2d39a" strokeWidth="0.35" /><text x={x} y="3.48" textAnchor="middle" fontSize="0.95" fontWeight="900" fill="#ffffff">{index}</text></g>;
      })}
      {Array.from({ length: 20 }).map((_, index) => {
        const y = 7 + index * 3.05;
        return <g key={`score-right-${index}`}><circle cx="96.9" cy={y} r="1.25" fill="#0f6179" stroke="#f2d39a" strokeWidth="0.35" /><text x="96.9" y={y + 0.36} textAnchor="middle" fontSize="0.9" fontWeight="900" fill="#ffffff">{31 + index}</text></g>;
      })}
      {Array.from({ length: 31 }).map((_, index) => {
        const x = 95 - index * 3;
        return <g key={`score-bottom-${index}`}><circle cx={x} cy="71.9" r="1.25" fill="#0f6179" stroke="#f2d39a" strokeWidth="0.35" /><text x={x} y="72.25" textAnchor="middle" fontSize="0.9" fontWeight="900" fill="#ffffff">{50 + index}</text></g>;
      })}
      {Array.from({ length: 19 }).map((_, index) => {
        const y = 65 - index * 3.05;
        return <g key={`score-left-${index}`}><circle cx="3.1" cy={y} r="1.25" fill="#0f6179" stroke="#f2d39a" strokeWidth="0.35" /><text x="3.1" y={y + 0.34} textAnchor="middle" fontSize="0.9" fontWeight="900" fill="#ffffff">{81 + index}</text></g>;
      })}

      <g filter="url(#softMapShadow)">
        <path d="M16 20 C23 13, 33 11, 43 16 C51 20, 58 18, 66 16 C78 13, 92 19, 95 32 C98 45, 91 58, 81 62 C69 67, 59 61, 49 62 C37 63, 25 68, 13 61 C5 56, 8 43, 12 35 C14 30, 11 25, 16 20 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.55" />
        <path d="M8 9 C14 6, 19 8, 20 14 C21 21, 16 27, 10 25 C5 22, 4 13, 8 9 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.45" />
        <path d="M7 31 C13 29, 18 33, 20 40 C22 48, 18 59, 10 62 C4 58, 4 47, 6 39 C7 36, 5 33, 7 31 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.45" />
        <path d="M43 53 C47 52, 50 56, 50 62 C50 67, 45 70, 41 67 C38 63, 39 56, 43 53 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.45" />
        <path d="M52 52 C59 52, 65 56, 67 63 C61 67, 54 66, 50 61 C47 57, 48 53, 52 52 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.45" />
        <path d="M78 53 C86 52, 93 57, 96 66 C88 70, 80 68, 73 63 C70 58, 72 54, 78 53 Z" fill="url(#land)" stroke="#8a6a45" strokeWidth="0.45" />
      </g>
      <g opacity="0.34" fontSize="3.2" fill="#5e3b1e"><text x="18" y="18">⚓</text><text x="35" y="43">⛰</text><text x="72" y="24">♜</text><text x="77" y="57">⚓</text><text x="26" y="66">⚓</text></g>

      {boardRoutes.map((route) => {
        const meta = ROUTE_META[route.color];
        const geometry = routeGeometry(route, cityById);
        const selected = selectedRouteId === route.backendId;
        const ownerColor = getPlayerColor(route.claimedByPlayerId, game);
        const fill = ownerColor ?? meta.fill;
        const stroke = ownerColor ? "#fff7ed" : meta.stroke;

        return (
          <g key={route.backendId} className="cursor-pointer" onClick={() => onSelectRoute(route.backendId)}>
            <line x1={geometry.x1} y1={geometry.y1} x2={geometry.x2} y2={geometry.y2} stroke={selected ? "#10b981" : "rgba(74,45,20,0.34)"} strokeWidth={selected ? 1.45 : 0.9} strokeLinecap="round" />
            {Array.from({ length: route.length }).map((_, index) => {
              const t = (index + 1) / (route.length + 1);
              const x = geometry.x1 + (geometry.x2 - geometry.x1) * t;
              const y = geometry.y1 + (geometry.y2 - geometry.y1) * t;
              return (
                <g key={`${route.backendId}-${index}`} transform={`translate(${x} ${y}) rotate(${geometry.angle})`}>
                  <rect x="-1.45" y="-0.82" width="2.9" height="1.64" rx="0.42" fill={fill} stroke={stroke} strokeWidth={selected ? 0.42 : 0.24} filter="url(#shadow)" />
                  <rect x="-1.05" y="-0.48" width="2.1" height="0.28" rx="0.1" fill="#ffffff" opacity="0.18" />
                  <circle cx="-0.72" cy="0.53" r="0.16" fill="rgba(0,0,0,0.22)" />
                  <circle cx="0.72" cy="0.53" r="0.16" fill="rgba(0,0,0,0.22)" />
                  {route.claimedByPlayerId && <text x="0" y="0.31" textAnchor="middle" fontSize="0.95" fontWeight="900" fill="#ffffff">✓</text>}
                </g>
              );
            })}
          </g>
        );
      })}

      {CITIES.map((city) => (
        <g key={city.id}>
          <circle cx={city.x} cy={city.y} r="1.85" fill="#7c2d12" stroke="#fff1b8" strokeWidth="0.55" filter="url(#shadow)" />
          <circle cx={city.x} cy={city.y} r="1.18" fill="#f59e0b" stroke="#a33d12" strokeWidth="0.35" />
          <circle cx={city.x} cy={city.y} r="0.46" fill="#fff7ed" opacity="0.95" />
          <text x={city.x + (city.labelDx ?? 1)} y={city.y + (city.labelDy ?? -0.8)} textAnchor={city.labelAnchor ?? "start"} fontSize="1.55" fontWeight="900" fill="#4a2512" stroke="#f6dfb2" strokeWidth="0.28" paintOrder="stroke">
            {city.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function GameRoomPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState<number>(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const socketRef = useRef<ReturnType<typeof connectGameSocket> | null>(null);
  const pendingActionRef = useRef<"start" | "claim" | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const token = useMemo(() => (gameId ? localStorage.getItem(playerTokenKey(gameId)) ?? "" : ""), [gameId]);
  const playerId = useMemo(() => (gameId ? localStorage.getItem(playerIdKey(gameId)) ?? "" : ""), [gameId]);
  const storageKey = useMemo(() => (gameId ? startingTicketsKey(gameId) : "ttr_selected_starting_tickets_local"), [gameId]);
  const ticketOffer = useMemo(() => drawStartingTicketOffer(), [gameId]);
  const isMyTurn = Boolean(game?.current_player_id && playerId && game.current_player_id === playerId);

  const { boardRoutes, unknownRoutes } = useMemo(() => buildBoardRoutes(game?.routes ?? []), [game?.routes]);
  const selectedRoute = useMemo(() => boardRoutes.find((route) => route.backendId === selectedRouteId) ?? null, [boardRoutes, selectedRouteId]);
  const selectedRouteIsClaimed = Boolean(selectedRoute?.claimedByPlayerId);
  const canClaimSelectedRoute = Boolean(selectedRoute && !selectedRoute.claimedByPlayerId && isMyTurn && game?.status !== "waiting");

  const reloadGameState = useCallback(async () => {
    if (!gameId) return;
    const state = await getGameState(gameId);
    setGame(state);
    setError("");
  }, [gameId]);

  useEffect(() => {
    const saved = readSavedStartingTickets(storageKey);
    setSelectedTickets(saved ?? []);
    setSelectedTicketIds([ticketId(ticketOffer.longTicket), ticketId(ticketOffer.shortTickets[0])]);
  }, [storageKey, ticketOffer]);

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
      setConnectionStatus("error");
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
      setConnectionStatus("connecting");
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
        onError: (message) => {
          if (alive) {
            setConnectionStatus("error");
            setError(message);
          }
        },
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
        await startGame(gameId, { host_token: token });
        await reloadGameState();
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
        await claimRoute(gameId, { player_token: token, route_id: routeId });
        setSelectedRouteId(null);
        await reloadGameState();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim route");
      pendingActionRef.current = null;
    } finally {
      if (!usingSocket) setActionLoading(false);
    }
  };

  const toggleStartingTicket = (ticket: Ticket) => {
    if (ticket.type === "long") return;
    const id = ticketId(ticket);
    setSelectedTicketIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const resetSavedTickets = () => {
    clearStartingTickets(storageKey);
    setSelectedTickets([]);
    setSelectedTicketIds([ticketId(ticketOffer.longTicket), ticketId(ticketOffer.shortTickets[0])]);
  };

  const confirmStartingTickets = () => {
    const tickets = ticketOffer.allTickets.filter((ticket) => selectedTicketIds.includes(ticketId(ticket)));
    const shortCount = tickets.filter((ticket) => ticket.type === "short").length;
    if (shortCount < 1) {
      setError("You must keep at least one short destination ticket.");
      return;
    }
    saveStartingTickets(storageKey, tickets);
    setSelectedTickets(tickets);
    setError("");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  if (!gameId) return null;

  const shouldShowTicketSelection = Boolean(game && game.status !== "waiting" && selectedTickets.length === 0);

  if (shouldShowTicketSelection) {
    return (
      <StartingTicketSelectionScreen
        offer={ticketOffer}
        selectedTicketIds={selectedTicketIds}
        onToggleTicket={toggleStartingTicket}
        onConfirm={confirmStartingTickets}
        onResetSavedTickets={resetSavedTickets}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#20262b] p-3 text-slate-50 md:p-5">
      <div className="grid min-h-[calc(100vh-40px)] grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(780px,1fr)_360px]">
        <aside className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-red-500 to-orange-500 p-5 shadow-2xl shadow-black/30">
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">Online game room</p>
            <h1 className="text-2xl font-black leading-tight">{game?.name ?? `Game ${gameId}`}</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/60">Ticket to Ride Europe</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate("/lobby")}>Lobby</Button>
              {game?.status === "waiting" && <Button variant="primary" onClick={handleStart} disabled={actionLoading}>Start game</Button>}
            </div>
          </div>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Players</h2>
            <div className="space-y-2">
              {(game?.players ?? []).map((player, index) => {
                const active = game?.current_player_id === player.id;
                const mine = player.id === playerId;
                return (
                  <div key={player.id} className={`rounded-2xl border p-3 ${active ? "border-emerald-400/60 bg-emerald-400/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full border-2 bg-white text-sm font-black" style={{ borderColor: PLAYER_COLOR_HEX[index % PLAYER_COLOR_HEX.length], color: PLAYER_COLOR_HEX[index % PLAYER_COLOR_HEX.length] }}>{player.name.slice(0, 2).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black">{player.name}</p>
                        <p className="text-xs text-slate-400">{player.score} pts · {player.train_cars_left} trains</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                      {active && <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-emerald-200">Current</span>}
                      {mine && <span className="rounded-full bg-cyan-400/20 px-2 py-1 text-cyan-200">You</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Connection</h2>
            <div className="space-y-2 text-sm font-semibold text-slate-300">
              <p>WS: <span className="font-black text-white">{connectionStatus}</span></p>
              <p>Connected peers: <span className="font-black text-white">{connectedPeers}</span></p>
              <p>Status: <span className="font-black text-white">{game?.status ?? "loading"}</span></p>
              <p>{isMyTurn ? "Your turn" : "Waiting for other player"}</p>
            </div>
            <Button variant="secondary" onClick={() => socketRef.current?.requestState()} className="mt-4 w-full">Refresh via WS</Button>
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[2rem] border-[5px] border-[#7a4a22] bg-[#d6b06f] shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-3 border-b border-[#7a4a22]/35 bg-[#f1dfb8]/85 px-5 py-4 text-[#3f2415] md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">Europe Board</h2>
              <p className="text-sm font-semibold text-[#6f4b2a]">
                {game?.status === "waiting" ? "Waiting room: start the game first." : "Click a free route on the map, then claim it on your turn."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#2d3b40] px-4 py-2 text-sm font-black text-white">{boardRoutes.length} mapped routes</span>
              {unknownRoutes.length > 0 && <span className="rounded-full bg-red-900 px-4 py-2 text-sm font-black text-white">{unknownRoutes.length} unmapped</span>}
            </div>
          </div>
          {error ? <p className="m-4 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          {!token ? <p className="m-4 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-100">No player token found for this lobby.</p> : null}
          <div className="overflow-auto p-2">
            <EuropeBoardMap game={game} boardRoutes={boardRoutes} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Claim route</h2>
            {selectedRoute ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-lg font-black">{cityName(selectedRoute.from)} → {cityName(selectedRoute.to)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {selectedRoute.length} trains · {selectedRoute.points} points · {ROUTE_META[selectedRoute.color].label}
                  </p>
                  {selectedRouteIsClaimed && <p className="mt-2 text-sm font-black text-red-200">Already claimed</p>}
                </div>
                <Button
                  variant="primary"
                  disabled={!canClaimSelectedRoute || actionLoading}
                  onClick={() => selectedRoute && handleClaim(selectedRoute.backendId)}
                  className="w-full"
                >
                  {actionLoading ? "Claiming..." : isMyTurn ? "Claim selected route" : "Not your turn"}
                </Button>
              </div>
            ) : (
              <p className="rounded-2xl bg-white/5 p-4 text-sm font-semibold text-slate-400">Click any route on the map to select it.</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Your hidden destination tickets</h2>
            {selectedTickets.length > 0 ? (
              <div className="space-y-2">
                {selectedTickets.map((ticket) => (
                  <div key={ticketId(ticket)} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="font-black">{cityName(ticket.from)} → {cityName(ticket.to)}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{ticket.points} pts · {ticket.type === "long" ? "long" : "short"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-white/5 p-4 text-sm font-semibold text-slate-400">
                {game?.status === "waiting" ? "Start the game first, then choose tickets." : "Tickets not selected yet."}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Routes list</h2>
            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {(game?.routes ?? []).map((route) => {
                const selected = selectedRouteId === route.id;
                const claimed = Boolean(route.claimed_by_player_id);
                return (
                  <button key={route.id} type="button" onClick={() => setSelectedRouteId(route.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-black">{route.city_a} → {route.city_b}</p><p className="text-sm text-slate-400">Length {route.length} · {route.points} pts</p></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${claimed ? "bg-red-500/20 text-red-200" : "bg-emerald-400/20 text-emerald-200"}`}>{claimed ? "Claimed" : "Free"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/75 p-4 shadow-2xl shadow-black/30">
            <h2 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Latest turns</h2>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
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
    </main>
  );
}
