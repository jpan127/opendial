// RAM + chrome.storage TTL cache with in-flight coalescing.
// Network errors fall back to a stale disk/RAM copy rather than failing the modal.
type CatalogLike = { fetchedAt: number };
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
