import { Router } from "express";

import { AlertModel } from "../models/Alert.js";

export const alertsRouter = Router();

const parsePositiveInteger = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

alertsRouter.get("/", async (req, res, next) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 10_000);
    const limit = parsePositiveInteger(req.query.limit, 12, 50);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AlertModel.find().sort({ sentAt: -1 }).skip(skip).limit(limit).lean(),
      AlertModel.countDocuments()
    ]);

    res.json({
      items,
      pagination: {
        limit,
        page,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    next(error);
  }
});
