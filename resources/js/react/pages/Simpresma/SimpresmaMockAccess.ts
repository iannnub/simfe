export type Role = "Mahasiswa" | "Verifikator" | "Tendik" | "Wadek" | "Kaprodi";

export type ManagedRole = "Verifikator" | "Tendik" | "Kaprodi";

export type Account = {
  name: string;
  email: string;
  roles: Role[];
  prodi?: "Sistem Informasi" | "Teknologi Informasi" | "Informatika";
  nim_nip?: string;
  whatsapp?: string;
  avatar?: string;
  telegramConnected?: boolean;
  telegramChatId?: string;
};

export const rolePath: Record<Role, string> = {
  Mahasiswa: "/mahasiswa/dashboard",
  Verifikator: "/verifikator/dashboard",
  Tendik: "/tendik/data-prestasi",
  Wadek: "/wadek/dashboard",
  Kaprodi: "/kaprodi/dashboard",
};

export const initialManagedAccounts: Account[] = [
  {
    name: "Dosen Verifikator",
    email: "verifikator@fasilkom.unej.ac.id",
    roles: ["Verifikator"],
    prodi: "Sistem Informasi",
    nim_nip: "NIP.10004",
    whatsapp: "08122220004",
  },
  {
    name: "Tendik FASILKOM",
    email: "tendik@fasilkom.unej.ac.id",
    roles: ["Tendik"],
    nim_nip: "NIP.20002",
    whatsapp: "08133330002",
  },
  {
    name: "Kaprodi Sistem Informasi",
    email: "kaprodi.si@fasilkom.unej.ac.id",
    roles: ["Kaprodi"],
    prodi: "Sistem Informasi",
    nim_nip: "NIP.40001",
    whatsapp: "08155550001",
  },
  {
    name: "Kaprodi Teknologi Informasi",
    email: "kaprodi.ti@fasilkom.unej.ac.id",
    roles: ["Kaprodi"],
    prodi: "Teknologi Informasi",
    nim_nip: "NIP.40002",
    whatsapp: "08155550002",
  },
  {
    name: "Kaprodi Informatika",
    email: "kaprodi.if@fasilkom.unej.ac.id",
    roles: ["Kaprodi"],
    prodi: "Informatika",
    nim_nip: "NIP.40003",
    whatsapp: "08155550003",
  },
];

export const wadekMockAccount: Account = {
  name: "Wakil Dekan FASILKOM",
  email: "wadek@fasilkom.unej.ac.id",
  roles: ["Wadek"],
  nim_nip: "NIP.99002",
  whatsapp: "08199990002",
};

export const mahasiswaMockAccount: Account = {
  name: "Chelsea Brilliant Syah Putra",
  email: "mahasiswa@fasilkom.unej.ac.id",
  roles: ["Mahasiswa"],
  prodi: "Sistem Informasi",
  nim_nip: "242410101079",
  whatsapp: "081234567890",
};

const ACCOUNT_KEY = "simpresma_wadek_accounts";
const ACTIVE_KEY = "simpresma_mock_account";
const PROFILES_KEY = "simpresma_profiles";

export function loadManagedAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return initialManagedAccounts;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialManagedAccounts;
  } catch {
    return initialManagedAccounts;
  }
}

export function saveManagedAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
  window.dispatchEvent(new Event("simpresma:accounts-update"));
}

export function saveActiveAccount(account: Account, activeRole?: Role) {
  localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({ ...account, activeRole: activeRole ?? account.roles[0] })
  );
  window.dispatchEvent(new Event("simpresma:profile-update"));
}

export function loadActiveAccount(): (Account & { activeRole?: Role }) | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAccountForEmail(email: string): Account | null {
  if (email === wadekMockAccount.email) return wadekMockAccount;
  if (email === mahasiswaMockAccount.email) return mahasiswaMockAccount;
  return loadManagedAccounts().find((account) => account.email === email) ?? null;
}

function normalizeRoleKey(roleLabel: string): Role {
  const lower = roleLabel.toLowerCase();
  if (lower.includes("verifikator")) return "Verifikator";
  if (lower.includes("tendik")) return "Tendik";
  if (lower.includes("wadek") || lower.includes("wakil dekan")) return "Wadek";
  if (lower.includes("kaprodi")) return "Kaprodi";
  return "Mahasiswa";
}

function defaultAccountForRole(role: Role): Account {
  if (role === "Mahasiswa") return mahasiswaMockAccount;
  if (role === "Wadek") return wadekMockAccount;
  const managed = loadManagedAccounts().find((a) => a.roles.includes(role));
  return managed ?? {
    name: role,
    email: `${role.toLowerCase()}@fasilkom.unej.ac.id`,
    roles: [role],
    prodi: "Sistem Informasi",
    nim_nip: "-",
    whatsapp: "081234567890",
  };
}

function loadStoredProfiles(): Record<string, Partial<Account>> {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadProfileForRole(roleLabel: string): Account {
  const roleKey = normalizeRoleKey(roleLabel);
  const base = defaultAccountForRole(roleKey);
  const active = loadActiveAccount();
  const activeMatches =
    active && (active.activeRole === roleKey || active.roles?.includes(roleKey));
  const storedMap = loadStoredProfiles();
  const savedByRole = storedMap[roleKey] || {};
  const savedByEmail = active?.email && storedMap[active.email] ? storedMap[active.email] : {};

  return {
    ...base,
    ...(activeMatches ? active : {}),
    ...savedByRole,
    ...savedByEmail,
  };
}

export function saveProfileForRole(
  roleLabel: string,
  patch: Partial<Account> & { removeAvatar?: boolean }
): Account {
  const roleKey = normalizeRoleKey(roleLabel);
  const current = loadProfileForRole(roleLabel);
  const { removeAvatar, ...restPatch } = patch;
  const next: Account = {
    ...current,
    ...restPatch,
  };
  if (removeAvatar) {
    delete next.avatar;
  }

  const storedMap = loadStoredProfiles();
  storedMap[roleKey] = next;
  if (next.email) {
    storedMap[next.email] = next;
  }
  localStorage.setItem(PROFILES_KEY, JSON.stringify(storedMap));

  const active = loadActiveAccount();
  if (!active || active.activeRole === roleKey || active.roles?.includes(roleKey)) {
    saveActiveAccount(next, active?.activeRole ?? roleKey);
  } else {
    window.dispatchEvent(new Event("simpresma:profile-update"));
  }

  return next;
}
