import axios from "axios";
import { getAccessToken, setAccessToken } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  withCredentials: true, // send refresh_token cookie on every request
});

// Attach in-memory access token on every request
api.interceptors.request.use((config) => {
  const token = globalThis.window === undefined ? null : getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, silently refresh the access token and retry the original request once.
// Multiple concurrent requests that 401 at the same time are queued and retried
// together once the refresh completes.
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(err: unknown, token: string | null = null) {
  pendingQueue.forEach((p) =>
    err ? p.reject(err) : p.resolve(token as string),
  );
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes("/auth/");

    if (
      error.response?.status === 401 &&
      !original?._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post("/auth/refresh");
        const { token } = res.data;
        setAccessToken(token);
        drainQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        drainQueue(refreshError);
        setAccessToken(null);
        if (globalThis.window !== undefined) {
          globalThis.location.href = "/login";
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  },
);

export default api;

// Auth
export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
  }) => api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  updateMe: (data: { bankAccountNumber: string; bankCode: string }) =>
    api.patch("/auth/me", data),
};

// Pods
export const podsApi = {
  list: () => api.get("/api/pods"),
  get: (id: string) => api.get(`/api/pods/${id}`),
  create: (data: object) => api.post("/api/pods", data),
  evaluate: (id: string) => api.post(`/api/pods/${id}/evaluate`),
  payout: (id: string) => api.post(`/api/pods/${id}/payout`),
  reset: (id: string) => api.post(`/api/pods/${id}/reset`),
  walletBalance: (id: string) => api.get(`/api/pods/${id}/wallet-balance`),
  provisionWallet: (id: string) => api.post(`/api/pods/${id}/provision-wallet`),
  myContributions: (id: string) => api.get(`/api/pods/${id}/my-contributions`),
  payoutHistory: (id: string) => api.get(`/api/pods/${id}/payout-history`),
  trustScores: (id: string) => api.get(`/api/pods/${id}/trust-scores`),
  activity: (id: string) => api.get(`/api/pods/${id}/activity`),
  contributionMatrix: (id: string) =>
    api.get(`/api/pods/${id}/contribution-matrix`),
};

// Payments
export const paymentsApi = {
  join: (data: { podId: string; cycles?: number }) =>
    api.post("/api/payments/join", data),
  contribute: (data: { podId: string; cycles?: number }) =>
    api.post("/api/payments/contribute", data),
  manual: (data: { podId: string; userId: string; cycleNumber: number }) =>
    api.post("/api/payments/manual", data),
};

// Trust
export const trustApi = {
  score: (data: object) => api.post("/api/trust/score", data),
};

// Stats
export const statsApi = {
  platform: () => api.get("/api/stats"),
  me: () => api.get("/api/stats/me"),
};

// Seed (dev only)
export const seedApi = {
  run: () => api.post("/api/seed"),
};
