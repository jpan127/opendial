type CatalogLike = { fetchedAt: number };

/** RAM + disk TTL cache with in-flight coalescing. Used by SVGL and Simple Icons. */
export function createCatalogLoader<T extends CatalogLike>(opts: {
  ttlMs: number;
  readDisk: () => Promise<T | null>;
  fetchFresh: () => Promise<T>;
  writeDisk: (catalog: T) => Promise<void>;
}): () => Promise<T | null> {
  let memory: T | null = null;
  let inflight: Promise<T | null> | null = null;

  const isFresh = (catalog: T) => Date.now() - catalog.fetchedAt < opts.ttlMs;

  const loadInner = async (): Promise<T | null> => {
    const disk = await opts.readDisk();
    if (disk && isFresh(disk)) {
      memory = disk;
      return disk;
    }
    try {
      const next = await opts.fetchFresh();
      memory = next;
      await opts.writeDisk(next);
      return next;
    } catch {
      if (disk) {
        memory = disk;
        return disk;
      }
      return memory;
    }
  };

  return async () => {
    if (memory && isFresh(memory)) return memory;
    if (inflight) return inflight;
    inflight = loadInner().finally(() => {
      inflight = null;
    });
    return inflight;
  };
}
