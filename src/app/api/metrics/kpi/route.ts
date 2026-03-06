import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ok, errorResponse } from "@/lib/api/response";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "7d";

  const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;

  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
  const prevEnd = start;

  try {
    const [currentRevenue, prevRevenue] = await Promise.all([
      prisma.salesTransaction.aggregate({
        _sum: { totalAmountPaise: true },
        where: {
          transactedAt: { gte: start, lte: now },
        },
      }),
      prisma.salesTransaction.aggregate({
        _sum: { totalAmountPaise: true },
        where: {
          transactedAt: { gte: prevStart, lte: prevEnd },
        },
      }),
    ]);

    const [waste, fulfilment] = await Promise.all([
      prisma.wasteRecord.aggregate({
        _sum: { financialLossPaise: true },
        where: {
          wasteDate: { gte: start, lte: now },
        },
      }),
      prisma.orderFulfilment.aggregate({
        _avg: { fulfilmentRatePct: true },
        where: {
          orderedAt: { gte: start, lte: now },
        },
      }),
    ]);

    const revenueValue = (currentRevenue._sum.totalAmountPaise ?? 0) / 100;
    const prevRevenueValue = (prevRevenue._sum.totalAmountPaise ?? 0) / 100;

    const revenueTrend =
      prevRevenueValue > 0
        ? ((revenueValue - prevRevenueValue) / prevRevenueValue) * 100
        : 0;

    const wasteValue = (waste._sum.financialLossPaise ?? 0) / 100;
    const fulfilmentRate =
      fulfilment._avg.fulfilmentRatePct != null
        ? Number(fulfilment._avg.fulfilmentRatePct)
        : null;

    const wastePctOfRevenue =
      revenueValue > 0 ? (wasteValue / revenueValue) * 100 : null;

    return ok(
      {
        period,
        generatedAt: now.toISOString(),
        revenue: {
          value: revenueValue,
          trend: revenueTrend,
        },
        margin: {
          value: null,
          trend: null,
        },
        wasteCost: {
          value: wasteValue,
          trend: null,
          pctOfRevenue: wastePctOfRevenue,
        },
        fulfilmentRate: {
          value: fulfilmentRate,
          trend: null,
        },
      },
      requestId,
    );
  } catch (err) {
    return errorResponse(
      500,
      "METRICS_ERROR",
      err instanceof Error ? err.message : "Failed to compute KPIs",
      null,
      requestId,
    );
  }
}

