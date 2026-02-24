// ─── Profile Persistence (localStorage) ───

const STORAGE_KEY = "justhousesErp_profiles";
const OLD_KEY = "flipmodel_profiles";

export interface Profile {
  id: string;
  name: string;
  savedAt?: string;
  mode?: string;
  acq: Record<string, unknown>;
  prop: Record<string, unknown>;
  rooms: Record<string, unknown>[];
  nextRoomId?: number;
  contractors?: Record<string, unknown>[];
  costDb?: Record<string, unknown>;
  contingencyPct?: number;
  pmPct?: number;
  holding?: Record<string, unknown>;
  resale?: Record<string, unknown>;
  quickRenoEstimate?: number;
  [key: string]: unknown;
}

function migrate(): void {
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, old);
      localStorage.removeItem(OLD_KEY);
    }
  } catch { /* ignore */ }
}

export function loadProfiles(): Profile[] {
  try {
    migrate();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: Profile): Profile[] {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

export function deleteProfile(id: string): Profile[] {
  const profiles = loadProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles;
}

export function exportProfile(profile: Profile): void {
  const json = JSON.stringify(profile, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_") || "profile"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
