import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const client = axios.create({ baseURL: API });

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const ratesApi = {
  get: () => client.get("/rates").then((r) => r.data),
  login: (password) => client.post("/admin/login", { password }).then((r) => r.data),
  update: (doc, token) => client.put("/rates", doc, auth(token)).then((r) => r.data),
  reset: (token) => client.post("/rates/reset", {}, auth(token)).then((r) => r.data),
};

export const feedApi = {
  toggle: (autoFeed, token) => client.post("/feed/toggle", { autoFeed }, auth(token)).then((r) => r.data),
  setMode: (mode, token) => client.post("/feed/mode", { mode }, auth(token)).then((r) => r.data),
  refresh: (token) => client.post("/feed/refresh", {}, auth(token)).then((r) => r.data),
};

export const bookingsApi = {
  create: (body) => client.post("/bookings", body).then((r) => r.data),
  list: () => client.get("/bookings").then((r) => r.data),
};

export const historyApi = {
  get: (metal = "gold") => client.get(`/history?metal=${metal}`).then((r) => r.data),
};

export const commoditiesApi = {
  get: () => client.get("/commodities").then((r) => r.data),
};
