"use client";

import { isSupabaseConfigured } from "@/lib/env";
import { LocalStore } from "@/lib/data/local-store";
import { CloudStore } from "@/lib/data/cloud-store";
import type { ProjectStore } from "@/lib/data/types";

let store: ProjectStore | null = null;

/** Returns the single store for this session: cloud when configured, else local. */
export function getStore(): ProjectStore {
  if (!store) store = isSupabaseConfigured ? new CloudStore() : new LocalStore();
  return store;
}

export type { ProjectStore };
export { LocalStore };
