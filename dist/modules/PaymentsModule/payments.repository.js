"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRepository = exports.PaymentsRepository = void 0;
const razorpay_1 = require("@/config/razorpay");
const base_repository_1 = require("../../common/database/base.repository");
const postgres_connections_1 = require("../../common/database/postgres.connections");
class PaymentsRepository extends base_repository_1.BaseRepository {
    constructor() {
        super("payment_orders");
    }
    /**
     * Create a new payment record
     */
    async createOrder(params) {
        // STEP 1 — DB transaction (idempotency + insert)
        const order = await postgres_connections_1.db.transaction(async (tx) => {
            // Lock row if exists
            const existing = await tx.query(`SELECT * FROM payment_orders 
       WHERE idempotency_key = $1 
       FOR UPDATE`, [params.idempotencyKey]);
            if (existing.rows.length > 0) {
                return existing.rows[0]; // ✅ idempotent return
            }
            // Insert new order
            const { rows: [newOrder], } = await tx.query(`
        INSERT INTO payment_orders
          (idempotency_key, user_id, amount, currency, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING *
        `, [params.idempotencyKey, params.user_id, params.amount, params.currency]);
            return newOrder;
        });
        // STEP 2 — Call Razorpay (outside transaction)
        const rzpOrder = await razorpay_1.razorpay.orders.create({
            amount: params.amount,
            currency: params.currency,
            receipt: order.id,
            notes: {
                internal_order_id: order.id,
                // user_id: params.userId,
            },
        });
        // STEP 3 — Update Razorpay order ID (small query, no transaction needed)
        await postgres_connections_1.db.query(`
    UPDATE payment_orders
    SET razorpay_order_id = $1,
        updated_at = NOW(),
        version = version + 1
    WHERE id = $2
  `, [rzpOrder.id, order.id]);
        // STEP 4 — Return response to frontend
        return {
            orderId: order.id,
            razorpayOrderId: rzpOrder.id,
            amount: params.amount,
            currency: params.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        };
    }
    /**
     * Update payment status
     */
    async updateStatus(id, status) {
        const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
        const rows = await postgres_connections_1.db.query(query, [status, id]);
        return rows.length > 0 ? rows[0] : null;
    }
}
exports.PaymentsRepository = PaymentsRepository;
exports.paymentsRepository = new PaymentsRepository();
