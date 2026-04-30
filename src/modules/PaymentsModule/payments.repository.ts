import { razorpay } from "@/config/razorpay";
import { BaseRepository } from "../../common/database/base.repository";
import { db } from "../../common/database/postgres.connections";

export interface Payment {
  id: string;
  amount: number;
  user_id: string;
  currency: string;
  status: string;
  order_id?: string;
  idempotencyKey: string;
  created_at: Date;
  updated_at: Date;
}

export type CreateOrderParams = Pick<
  Payment,
  "amount" | "currency" | "idempotencyKey" | "user_id"
>;

export class PaymentsRepository extends BaseRepository<Payment> {
  constructor() {
    super("payment_orders");
  }

  /**
   * Create a new payment record
   */
  async createOrder(params: CreateOrderParams) {
    // STEP 1 — DB transaction (idempotency + insert)
    const order = await db.transaction(async (tx) => {
      // Lock row if exists
      const existing = await tx.query(
        `SELECT * FROM payment_orders 
       WHERE idempotency_key = $1 
       FOR UPDATE`,
        [params.idempotencyKey]
      );
      const row = existing.rows[0];
      
      if (row) {
        return row;
      }

      // Insert new order
      const {
        rows: [newOrder],
      } = await tx.query(
        `
        INSERT INTO payment_orders
          (idempotency_key, user_id, amount, currency, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING *
        `,
        [params.idempotencyKey, params.user_id, params.amount, params.currency]
      );

      return newOrder;
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId:order.razorpay_order_id
    };
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, status: string): Promise<Payment | null> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const rows = await db.query<Payment>(query, [status, id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update payment razorpay_order_id
   */

  async updatePaymentRazorpayOrderId(razorpayPayId: string, orderId: number) {
    const query = `
       UPDATE ${this.tableName} SET razorpay_order_id = $1, updated_at = NOW(), version = version+1
       WHERE id = $2 RETURNING *;
    `;
    const params = [razorpayPayId, orderId];
    const rows = await db.query(query, params);

    if(!rows.length){
      throw new Error("Order not found or update failed")
    }

    const order=rows[0]
    return  {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId:order.razorpay_order_id
    };
  }
}

export const paymentsRepository = new PaymentsRepository();
