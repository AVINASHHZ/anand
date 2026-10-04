import type { CycleRecord } from "./shop";
import { INITIAL_CYCLES } from "./catalogue";

export const DEFAULT_CYCLES: CycleRecord[] = INITIAL_CYCLES.map((c, i) => ({
  ...c,
  id: i + 1,
  ownerAdded: false,
}));

// Multi-region CORS-enabled cloud endpoints for instant cross-device sync
const CLOUD_ENDPOINTS = [
  "https://jsonblob.com/api/jsonBlob/1335244589887758336",
  "/api/catalogue",
];

export async function getGlobalCloudCycles(): Promise<CycleRecord[]> {
  for (const endpoint of CLOUD_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            try { localStorage.setItem("anand_custom_cycles", JSON.stringify(data)); } catch {}
            return data as CycleRecord[];
          }
        }
      }
    } catch {}
  }

  // Local storage fallback
  try {
    const stored = localStorage.getItem("anand_custom_cycles");
    if (stored) {
      const custom = JSON.parse(stored);
      if (Array.isArray(custom) && custom.length > 0) return custom;
    }
  } catch {}

  return DEFAULT_CYCLES;
}

export async function saveGlobalCloudCycles(updated: CycleRecord[]): Promise<void> {
  try {
    localStorage.setItem("anand_custom_cycles", JSON.stringify(updated));
  } catch {}

  for (const endpoint of CLOUD_ENDPOINTS) {
    try {
      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch {
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      } catch {}
    }
  }
}
