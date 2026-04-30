import { RedisClientType, createClient } from "redis";
import logger from "../logger/logger";

let client: RedisClientType | null;

async function initializeRedisClient() {
  if (client) return client;

  // missing: redis retry connection
  client = createClient();

  client.on("error", (err) => {
    logger.error("Redis not connected", {
      error: err,
    });
  });

  client.on("connect", () => {
    logger.info("Redis conncted successfully");
  });

  await client.connect();
  return client
}

async function closeRedisConnection() {
  if (client) {
    try {
      await client.quit();
      logger.warn("Redis quit connection");
    } catch (error) {
      client.destroy();
      logger.warn("Redis connection forcefully quit");
    } finally {
      client = null;
    }
  }
}

export const redis = {
  getClient: initializeRedisClient,
  closeClient: closeRedisConnection,
};
