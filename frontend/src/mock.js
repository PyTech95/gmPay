// Mock data + localStorage-backed store for SHRI SILVER TECHNOLOGIES live rates clone

export const LOGO_URL =
  "https://customer-assets-eiarnc6j.emergentagent.net/job_537ef3e9-ca80-499f-bbaa-71ea1abff481/artifacts/njuk8da0_image.png";

export const COMPANY = {
  name: "SHRI SILVER TECHNOLOGIES",
  suffix: "PRIVATE LIMITED",
  tagline: "SAVE IN SILVER \u00b7 GROW IN GOLD",
  subtitle: "BULLION & COIN DEALER",
  directors: ["Ankit Agarwal", "Shivangni Agarwal"],
  cities: ["JHANSI", "KANPUR"],
  phones: ["7703072555", "7905785875", "8953308455", "7985968012"],
  whatsapp: "917703072555",
  contactAddress:
    "Shiv Shakti Market, Dixit Bagh, Sarafa Bazar, Jhansi, Uttar Pradesh",
  officeAddress:
    "Shiv Shakti Market, Dixit Bagh, Sarafa Bazar, Jhansi, U.P.",
  regAddress:
    "Shiv Shakti Market, Dixit Bagh, Sarafa Bazar, Jhansi, U.P.",
  email: "1gmpay2@gmail.com",
};

export const DEFAULT_SPOT = {
  goldUsd: 4388.4,
  silverUsd: 64.93,
  inr: 95.44,
};

export const DEFAULT_MCX = { gold: 148000, silver: 235000 };
export const DEFAULT_SPREAD = 500;

export const DEFAULT_RETAIL = [
  { id: "r0", name: "SILVER MAX", metal: "silver", badla: 0, buy: 234500, sell: 235000 },
  { id: "r1", name: "SILVER 98.5", metal: "silver", badla: 1000, buy: 235500, sell: 236000 },
  { id: "r2", name: "SILVER 99.5", metal: "silver", badla: 4300, buy: 238800, sell: 239300 },
  { id: "r3", name: "SILVER SILCUT", metal: "silver", badla: 3000, buy: 237500, sell: 238000 },
  { id: "r4", name: "GOLD MAX", metal: "gold", badla: 0, buy: 147500, sell: 148000 },
  { id: "r5", name: "GOLD 99.5", metal: "gold", badla: 2300, buy: 149800, sell: 150300 },
  { id: "r6", name: "GOLD 99", metal: "gold", badla: 1400, buy: 148900, sell: 149400 },
];

export const DEFAULT_RTGS = [
  { id: "t0", name: "SILVER MAX", metal: "silver", badla: 500, buy: 235000, sell: 235500 },
  { id: "t1", name: "SILVER 98.5", metal: "silver", badla: 1800, buy: 236300, sell: 236800 },
  { id: "t2", name: "SILVER 99.5", metal: "silver", badla: 5100, buy: 239600, sell: 240100 },
  { id: "t3", name: "SILVER SILCUT", metal: "silver", badla: 3800, buy: 238300, sell: 238800 },
  { id: "t4", name: "GOLD MAX", metal: "gold", badla: 900, buy: 148400, sell: 148900 },
  { id: "t5", name: "GOLD 99.5", metal: "gold", badla: 3200, buy: 150700, sell: 151200 },
  { id: "t6", name: "GOLD 99", metal: "gold", badla: 2300, buy: 149800, sell: 150300 },
];

export const DEFAULT_COINS = [
  { id: "c0", name: "SILVER MAX", metal: "silver", badla: 2000, buy: 236500, sell: 237000 },
  { id: "c1", name: "SILVER 98.5", metal: "silver", badla: 4000, buy: 238500, sell: 239000 },
  { id: "c2", name: "SILVER 99.5", metal: "silver", badla: 7000, buy: 241500, sell: 242000 },
  { id: "c3", name: "SILVER SILCUT", metal: "silver", badla: 6000, buy: 240500, sell: 241000 },
  { id: "c4", name: "GOLD MAX", metal: "gold", badla: 3000, buy: 150500, sell: 151000 },
  { id: "c5", name: "GOLD 99.5", metal: "gold", badla: 7000, buy: 154500, sell: 155000 },
  { id: "c6", name: "GOLD 99", metal: "gold", badla: 6000, buy: 153500, sell: 154000 },
];

export const BANKS = [
  {
    bank: "Union Bank of India",
    account: "Shri Silver Technologies Private Limited",
    number: "197511010000181",
    ifsc: "",
    branch: "BKD Branch, Jhansi, U.P.",
  },
];

// ---- localStorage-backed store so Admin edits reflect on Live Rates ----
const KEY = "sst_rates_store_v1";

function seed() {
  return {
    spot: { ...DEFAULT_SPOT },
    retail: DEFAULT_RETAIL.map((x) => ({ ...x })),
    rtgs: DEFAULT_RTGS.map((x) => ({ ...x })),
    coins: DEFAULT_COINS.map((x) => ({ ...x })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw);
  } catch (e) {
    return seed();
  }
}

export function saveStore(store) {
  const next = { ...store, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function resetStore() {
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

export const ADMIN_PASSWORD = "admin123";
