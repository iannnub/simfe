/**
 * SIMPRESMA API Service
 * Clean fetch-based client with Sanctum Bearer authentication & API endpoints.
 *
 * @architect iannnub
 */

const BASE_URL = "/api";

export type JsonRecord = Record<string, unknown>;

export interface AuthUser {
  id: number;
  nim_nip?: string;
  nama: string;
  name?: string;
  email: string;
  no_whatsapp?: string;
  avatar?: string;
  telegram_chat_id?: string | null;
  telegram_connected?: boolean;
  prodi?: { id: number; nama: string; singkatan: string };
  roles: string[];
}

export function getToken(): string | null {
  return localStorage.getItem("simpresma_token");
}

export function setToken(token: string): void {
  localStorage.setItem("simpresma_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("simpresma_token");
  localStorage.removeItem("simpresma_user");
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    removeToken();
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data?.message || `HTTP error ${response.status}`;
      const error = new Error(errorMsg) as Error & { data?: unknown; status: number };
      error.data = data;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  // ─── AUTH ────────────────────────────────────────────────────────
  auth: {
    login: async (email: string, password: string) => {
      const res = await apiRequest<{ success: boolean; data: { token: string; user: AuthUser } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      if (res.data?.token) {
        setToken(res.data.token);
        localStorage.setItem("simpresma_user", JSON.stringify(res.data.user));
      }
      return res;
    },
    logout: async () => {
      try {
        await apiRequest("/auth/logout", { method: "POST" });
      } finally {
        removeToken();
      }
    },
    me: async () => {
      return apiRequest<{ success: boolean; data: AuthUser }>("/auth/me");
    },
    register: async (payload: {
      nama: string;
      nim_nip: string;
      email: string;
      password: string;
      prodi_id?: number;
      no_whatsapp?: string;
    }) => {
      const res = await apiRequest<{ success: boolean; message: string; data: { token: string; user: AuthUser } }>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      if (res.data?.token) {
        setToken(res.data.token);
        localStorage.setItem("simpresma_user", JSON.stringify(res.data.user));
      }
      return res;
    },
    updateProfile: async (payload: FormData) => {
      const res = await apiRequest<{ success: boolean; message: string; data: AuthUser }>(
        "/auth/profile",
        {
          method: "POST",
          body: payload,
        }
      );
      if (res.data) {
        localStorage.setItem("simpresma_user", JSON.stringify(res.data));
      }
      return res;
    },
    connectTelegram: async (telegram_chat_id: string) => {
      const res = await apiRequest<{ success: boolean; message: string; data: AuthUser }>(
        "/auth/connect-telegram",
        {
          method: "POST",
          body: JSON.stringify({ telegram_chat_id }),
        }
      );
      if (res.data) {
        localStorage.setItem("simpresma_user", JSON.stringify(res.data));
      }
      return res;
    },
    disconnectTelegram: async () => {
      const res = await apiRequest<{ success: boolean; message: string; data: AuthUser }>(
        "/auth/disconnect-telegram",
        {
          method: "POST",
        }
      );
      if (res.data) {
        localStorage.setItem("simpresma_user", JSON.stringify(res.data));
      }
      return res;
    },
    createTelegramLinkToken: async () => {
      return apiRequest<{
        success: boolean;
        message: string;
        data: { deep_link: string; bot_username: string; expires_in: number };
      }>("/auth/telegram/link-token", { method: "POST" });
    },
    checkTelegramLink: async () => {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        connected: boolean;
        data: AuthUser;
      }>("/auth/telegram/check-link", { method: "POST" });
      if (res.data) {
        localStorage.setItem("simpresma_user", JSON.stringify(res.data));
      }
      return res;
    },
    testTelegram: async () => {
      return apiRequest<{ success: boolean; message: string }>("/auth/telegram/test", {
        method: "POST",
      });
    },
    gapuraRedirect: () => {
      window.location.href = `${BASE_URL}/auth/gapura/redirect`;
    },
  },

  // ─── REF DATA ───────────────────────────────────────────────────
  ref: {
    prodi: () => apiRequest<{ success: boolean; data: JsonRecord[] }>("/ref/prodi"),
    tingkatan: () => apiRequest<{ success: boolean; data: JsonRecord[] }>("/ref/tingkatan"),
    tahapan: () => apiRequest<{ success: boolean; data: JsonRecord[] }>("/ref/tahapan"),
    bidang: () => apiRequest<{ success: boolean; data: JsonRecord[] }>("/ref/bidang"),
    matriks: (tingkatanId: number, tahapanId: number) =>
      apiRequest<{ success: boolean; data: JsonRecord }>(
        `/ref/matriks?tingkatan_id=${tingkatanId}&tahapan_id=${tahapanId}`
      ),
    mataKuliah: (bidangId: number, prodiId: number) =>
      apiRequest<{ success: boolean; data: JsonRecord[] }>(
        `/ref/mata-kuliah?bidang_id=${bidangId}&prodi_id=${prodiId}`
      ),
  },

  // ─── MAHASISWA ──────────────────────────────────────────────────
  mahasiswa: {
    getPengajuan: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/mahasiswa/pengajuan${query}`
      );
    },
    getDetail: (id: number) =>
      apiRequest<{ success: boolean; data: JsonRecord }>(`/mahasiswa/pengajuan/${id}`),
    storePengajuan: (payload: JsonRecord) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        "/mahasiswa/pengajuan",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    pilihMataKuliah: (
      id: number,
      payload: { mata_kuliah_ids?: number[]; mata_kuliah_names?: string[] }
    ) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/mahasiswa/pengajuan/${id}/mata-kuliah`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
  },

  // ─── VERIFIKATOR ────────────────────────────────────────────────
  verifikator: {
    getPengajuan: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/verifikator/pengajuan${query}`
      );
    },
    getDetail: (id: number) =>
      apiRequest<{ success: boolean; data: JsonRecord }>(`/verifikator/pengajuan/${id}`),
    terima: (
      id: number,
      feedback?: string,
      bidang?: { bidang_id?: number; bidang_nama?: string }
    ) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/verifikator/pengajuan/${id}/terima`,
        {
          method: "POST",
          body: JSON.stringify({
            feedback_verifikator: feedback || "Disetujui",
            ...(bidang?.bidang_id ? { bidang_id: bidang.bidang_id } : {}),
            ...(bidang?.bidang_nama ? { bidang_nama: bidang.bidang_nama } : {}),
          }),
        }
      ),
    tolak: (id: number, feedback: string) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/verifikator/pengajuan/${id}/tolak`,
        {
          method: "POST",
          body: JSON.stringify({ feedback_verifikator: feedback }),
        }
      ),
  },

  // ─── TENDIK ─────────────────────────────────────────────────────
  tendik: {
    getPengajuan: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/tendik/pengajuan${query}`
      );
    },
    getDetail: (id: number) =>
      apiRequest<{ success: boolean; data: JsonRecord }>(`/tendik/pengajuan/${id}`),
    finalisasi: (
      id: number,
      payload: {
        link_sk_konversi?: string;
        catatan_tendik?: string;
        nilai_per_mk?: { mk_id: number; huruf_nilai: string }[];
      }
    ) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/tendik/pengajuan/${id}/finalisasi`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    exportUrl: (format: "xlsx" | "csv" = "xlsx") =>
      `${BASE_URL}/tendik/export?format=${format}`,
  },

  // ─── WADEK ──────────────────────────────────────────────────────
  wadek: {
    getMatriks: () =>
      apiRequest<{ success: boolean; data: JsonRecord[] }>("/wadek/matriks"),
    updateMatriks: (id: number, payload: { min_sks: number; max_sks: number; huruf_nilai: string }) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(`/wadek/matriks/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    getVerifikator: () =>
      apiRequest<{ success: boolean; data: JsonRecord[] }>("/wadek/verifikator"),
    assignVerifikator: (payload: { user_id: number; prodi_id: number }) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>("/wadek/verifikator", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    removeVerifikator: (id: number) =>
      apiRequest<{ success: boolean; message: string }>(`/wadek/verifikator/${id}`, {
        method: "DELETE",
      }),
    getBidangMK: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: JsonRecord[] }>(`/wadek/bidang-mata-kuliah${query}`);
    },
    addBidangMK: (payload: { bidang_id: number; mata_kuliah_id: number }) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>("/wadek/bidang-mata-kuliah", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deleteBidangMK: (id: number) =>
      apiRequest<{ success: boolean; message: string }>(`/wadek/bidang-mata-kuliah/${id}`, {
        method: "DELETE",
      }),
    exportUrl: (format: "xlsx" | "csv" = "xlsx") =>
      `${BASE_URL}/wadek/export?format=${format}`,
  },

  // ─── KAPRODI ────────────────────────────────────────────────────
  kaprodi: {
    getPengajuan: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/kaprodi/pengajuan${query}`
      );
    },
    getDetail: (id: number) =>
      apiRequest<{ success: boolean; data: JsonRecord }>(`/kaprodi/pengajuan/${id}`),
    getStatistik: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: JsonRecord }>(`/kaprodi/statistik${query}`);
    },
    getPerforma: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: JsonRecord[] }>(`/kaprodi/verifikator-performa${query}`);
    },
    exportUrl: (format: "xlsx" | "csv" = "xlsx", prodiId?: number) =>
      `${BASE_URL}/kaprodi/export?format=${format}${prodiId ? `&prodi_id=${prodiId}` : ""}`,
  },

  // ─── ADMIN / ACCESS MANAGEMENT ──────────────────────────────────
  admin: {
    getUsers: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/admin/users${query}`
      );
    },
    assignRole: (userId: number, payload: { role_name: string; prodi_id?: number; notes?: string }) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/admin/users/${userId}/roles`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    revokeRole: (userId: number, roleName: string, notes?: string) =>
      apiRequest<{ success: boolean; message: string; data: JsonRecord }>(
        `/admin/users/${userId}/roles/${roleName}`,
        {
          method: "DELETE",
          body: JSON.stringify({ notes }),
        }
      ),
    getRoleHistory: (params?: Record<string, string | number>) => {
      const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
      return apiRequest<{ success: boolean; data: { items: JsonRecord[]; meta: JsonRecord } }>(
        `/admin/role-history${query}`
      );
    },
    getAvailableRoles: () =>
      apiRequest<{ success: boolean; data: JsonRecord[] }>("/admin/available-roles"),
  },

  // ─── SHARED & DASHBOARD ─────────────────────────────────────────
  shared: {
    statistik: () =>
      apiRequest<{ success: boolean; data: { grand_total: number; per_prodi: JsonRecord[] } }>(
        "/dashboard/statistik"
      ),
    direktoriVerifikator: () =>
      apiRequest<{ success: boolean; data: JsonRecord[] }>("/direktori-verifikator"),
    uploadDokumen: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiRequest<{ success: boolean; data: { name: string; url: string; size: number } }>(
        "/upload-dokumen",
        { method: "POST", body: fd }
      );
    },
  },
};

export default api;
