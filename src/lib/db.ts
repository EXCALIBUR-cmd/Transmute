import mongoose from "mongoose";

/**
 * Reusable MongoDB connection utility.
 *
 * - Reads connection string from MONGODB_URI environment variable.
 * - Caches the connection promise to avoid redundant connections
 *   during Next.js development hot reloads.
 * - Fails with a clear error if MONGODB_URI is not set.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI environment variable is not defined. " +
      "Please add it to .env.local (e.g. MONGODB_URI=mongodb://localhost:27017/migration-workbench)"
  );
}

/**
 * Global cache to prevent multiple connections during HMR in development.
 * In production, this is unused because the module is loaded once.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/* eslint-disable no-var */
declare global {
  var _mongooseCache: MongooseCache | undefined;
}
/* eslint-enable no-var */

const cached: MongooseCache = global._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

/**
 * Returns a connected Mongoose instance.
 * Re-uses an existing connection if one is already established.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset the promise so a subsequent call can retry
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
