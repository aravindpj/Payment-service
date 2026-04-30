"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotency = idempotency;
async function idempotency(req, res, next) {
    // get the idempotency key from headers
    const idempotencyKey = req.headers['x-razorpay-idempotency-key'];
    if (!idempotencyKey)
        return res.status(400).json({ status: false, message: "idempotency key required for this request" });
    // check this key is already exist
    // if is there return 409 and the current result 
    // set the key with distributed locking for new key
    // if key  not claimed return 409 
    // intercept the res object 
}
