interface SyncEntry {
  data: unknown;
  updatedAt: string;
}

interface SyncStore {
  kind: 'kv' | 'memory';
  get(token: string): Promise<SyncEntry | null>;
  set(token: string, data: unknown): Promise<SyncEntry>;
  delete(token: string): Promise<void>;
}

let cached: SyncStore | null = null;

export async function getSyncStore(): Promise<SyncStore> {
  if (cached) return cached;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    cached = {
      kind: 'kv',
      async get(token) {
        return (await kv.get<SyncEntry>(`cv:sync:${token}`)) ?? null;
      },
      async set(token, data) {
        const entry: SyncEntry = { data, updatedAt: new Date().toISOString() };
        await kv.set(`cv:sync:${token}`, entry);
        return entry;
      },
      async delete(token) {
        await kv.del(`cv:sync:${token}`);
      },
    };
    return cached;
  }
  const memory = new Map<string, SyncEntry>();
  cached = {
    kind: 'memory',
    async get(token) {
      return memory.get(token) ?? null;
    },
    async set(token, data) {
      const entry = { data, updatedAt: new Date().toISOString() };
      memory.set(token, entry);
      return entry;
    },
    async delete(token) {
      memory.delete(token);
    },
  };
  return cached;
}
