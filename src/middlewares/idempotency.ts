import logger from "@/common/logger/logger";
import { redis } from "@/common/redis/redis.connections";
import { NextFunction, Request, Response } from "express";

const LOCK_TTL = 30;
const RESULT_TTL = 86400;
export async function idempotency(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.info("Idempotency checking...");
  // get the idempotency key from headers
  const idempotencyKey = req.headers["x-razorpay-idempotency-key"] as string;

  if (!idempotencyKey)
    return res.status(400).json({
      status: false,
      message: "idempotency key required for this request",
    });

  const redisClient = await redis.getClient();

  const idempotent_key = `idempotent_key::${idempotencyKey}`;

  // check this key is already exist
  const cached = await redisClient.get(idempotent_key);

  if (cached) {
    const parsedData = JSON.parse(cached);

    if(parsedData.status === "DONE"){
      delete parsedData.status
      return res.status(200).json(parsedData);
    }
    
    if (parsedData.status === "IN_FLIGHT") {
      // if is there return 409 and the current result
      if (parsedData.razorpayOrderId) {
        return res.status(200).json({
          message: "Request in processing - retry-later",
          data: parsedData,
        });
      }
      return res.status(409).json({
        message: "Request in processing - retry-later",
      });
    }
  }

  // set the key with distributed locking for new key
  const claimed = await redisClient.set(
    idempotent_key,
    JSON.stringify({ status: "IN_FLIGHT" }),
    {
      NX: true,
      EX: LOCK_TTL,
    }
  );

  if (!claimed) {
    return res.status(409).json({
      status: false,
      message: "retry-later",
    });
  }

  req.idempotencyKey = idempotencyKey;

  // // intercept
  const orignalRespose = res.json.bind(res);

  res.json = (body: any) => {
    const statusCode = res.statusCode;
    if (statusCode >= 200 && statusCode <= 300) {
      redisClient
        .set(idempotent_key, JSON.stringify({ status: "DONE", ...body }), {
          EX: RESULT_TTL, 
        })
        .catch((err) => logger.warn("Redis is failed"));
    } else {
      redisClient
        .del(idempotent_key)
        .catch((err) => logger.warn("Redis del failed", { err }));
    }

    return orignalRespose(body);
  };

  next();
}
