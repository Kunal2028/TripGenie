import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const API_URL = `${BACKEND_URL.replace(/\/$/, "")}/api`;

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("tripgenie_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("tripgenie_token", token);
  } else {
    localStorage.removeItem("tripgenie_token");
  }
}

export function getAuthToken() {
  return localStorage.getItem("tripgenie_token");
}

export async function signup(payload) {
  const { data } = await client.post("/auth/signup", payload);
  return data;
}

export async function login(payload) {
  const { data } = await client.post("/auth/login", payload);
  return data;
}

export async function getMe() {
  const { data } = await client.get("/auth/me");
  return data;
}

export async function planTrip(payload) {
  const { data } = await client.post("/trips/plan", payload);
  return data;
}

export async function getTrip(id) {
  const { data } = await client.get(`/trips/${id}`);
  return data;
}

export async function listTrips() {
  const { data } = await client.get("/trips");
  return data;
}

export async function deleteTrip(id) {
  const { data } = await client.delete(`/trips/${id}`);
  return data;
}

export async function getPlacePhotos(queries) {
  const { data } = await client.post("/places/photos", { queries });
  return data;
}

export async function sendChatMessage(message, tripId = null) {
  const { data } = await client.post("/chat", { message, trip_id: tripId });
  return data;
}

export { API_URL };
