"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const postgres_connections_1 = require("./postgres.connections");
const logger_1 = __importDefault(require("../logger/logger"));
class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }
    /**
     * Find all records
     */
    async findAll() {
        const query = `SELECT * FROM ${this.tableName}`;
        return postgres_connections_1.db.query(query);
    }
    /**
     * Find one record by ID
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1 LIMIT 1`;
        const rows = await postgres_connections_1.db.query(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }
    /**
     * Delete a record by ID
     */
    async deleteById(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
        await postgres_connections_1.db.query(query, [id]);
        return true;
    }
    /**
     * Standardized error handling for repository methods
     */
    handleError(error, context) {
        logger_1.default.error(`Repository Error [${this.tableName}]: ${context}`, {
            message: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
exports.BaseRepository = BaseRepository;
