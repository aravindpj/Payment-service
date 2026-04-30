import { db } from "./postgres.connections";
import logger from "../logger/logger";

export abstract class BaseRepository<T> {
  constructor(protected readonly tableName: string) {}

  /**
   * Find all records
   */
  async findAll(): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName}`;
    return db.query<T>(query);
  }

  /**
   * Find one record by ID
   */
  async findById(id: string | number): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 LIMIT 1`;
    const rows = await db.query<T>(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Delete a record by ID
   */
  async deleteById(id: string | number): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
    await db.query(query, [id]);
    return true;
  }

  /**
   * Standardized error handling for repository methods
   */
  protected handleError(error: any, context: string) {
    logger.error(`Repository Error [${this.tableName}]: ${context}`, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
