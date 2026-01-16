import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), './data/agui-events.json');
const QUEUE_FILE = path.resolve(process.cwd(), './data/agui-queue.json');

interface StoredAGUIEvent {
  id: string;
  timestamp: number;
  daid?: { runId?: string; userId?: string };
  type: string;
  payload: any;
  metadata?: Record<string, any>;
}

let eventsCache: StoredAGUIEvent[] | null = null;
let queueCache: StoredAGUIEvent[] | null = null;

// Simple in-memory cache for filtered events
const filteredEventsCache: { [key: string]: StoredAGUIEvent[] } = {};

const metrics = {
  totalEventsReceived: 0,
  processedEvents: 0,
  errorEvents: 0,
  lastPurgeTimestamp: Date.now(),
};

async function readJsonFile<T>(filePath: string, defaultContent: T): Promise<T> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify(defaultContent), 'utf8');
      return defaultContent;
    }
    console.error(`Error reading ${filePath}:`, error);
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, content: T): Promise<void> {
  await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
}

function clearFilteredEventsCache() {
  for (const key in filteredEventsCache) {
    delete filteredEventsCache[key];
  }
}

export const db = {
  async getEvents(): Promise<StoredAGUIEvent[]> {
    if (eventsCache) {
      return eventsCache;
    }
    eventsCache = await readJsonFile(DB_FILE, []);
    return eventsCache;
  },

  async addEvent(event: StoredAGUIEvent): Promise<void> {
    const events = await db.getEvents();
    events.push(event);
    await writeJsonFile(DB_FILE, events);
    metrics.processedEvents++;
    clearFilteredEventsCache(); // Invalidate cache on write
  },

  async getEventsFiltered({
    limit = 50,
    runId,
    userId,
    startDate,
    endDate,
  }: {
    limit?: number;
    runId?: string;
    userId?: string;
    startDate?: number;
    endDate?: number;
  }): Promise<StoredAGUIEvent[]> {
    const cacheKey = JSON.stringify({ limit, runId, userId, startDate, endDate });
    if (filteredEventsCache[cacheKey]) {
      console.log('DB: Returning from filtered events cache.');
      return filteredEventsCache[cacheKey];
    }

    let events = await db.getEvents();

    if (runId) {
      events = events.filter((event) => event.daid?.runId === runId);
    }
    if (userId) {
      events = events.filter((event) => event.daid?.userId === userId);
    }
    if (startDate) {
      events = events.filter((event) => event.timestamp >= startDate);
    }
    if (endDate) {
      events = events.filter((event) => event.timestamp <= endDate);
    }

    const result = events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    filteredEventsCache[cacheKey] = result; // Cache the result
    return result;
  },

  async getQueue(): Promise<StoredAGUIEvent[]> {
    if (queueCache) {
      return queueCache;
    }
    queueCache = await readJsonFile(QUEUE_FILE, []);
    return queueCache;
  },

  async addToQueue(event: StoredAGUIEvent): Promise<void> {
    const queue = await db.getQueue();
    queue.push(event);
    await writeJsonFile(QUEUE_FILE, queue);
    metrics.totalEventsReceived++;
  },

  async clearQueue(): Promise<void> {
    queueCache = [];
    await writeJsonFile(QUEUE_FILE, []);
  },

  /**
   * Purges events older than a specified number of days.
   * @param retentionDays The number of days to retain events. Events older than this will be removed.
   * @returns The number of events purged.
   */
  async purgeEvents(retentionDays: number): Promise<number> {
    const events = await db.getEvents();
    const cutoffTimestamp = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const eventsToKeep = events.filter(event => event.timestamp >= cutoffTimestamp);
    const purgedCount = events.length - eventsToKeep.length;

    if (purgedCount > 0) {
      console.log(`Purging ${purgedCount} events older than ${retentionDays} days.`);
      await writeJsonFile(DB_FILE, eventsToKeep);
      eventsCache = eventsToKeep; // Update cache
      clearFilteredEventsCache(); // Invalidate cache on purge
    } else {
      console.log(`No events to purge older than ${retentionDays} days.`);
    }
    metrics.lastPurgeTimestamp = Date.now();
    return purgedCount;
  },

  getMetrics() {
    return { ...metrics, currentQueueSize: queueCache ? queueCache.length : 0 };
  },
};
