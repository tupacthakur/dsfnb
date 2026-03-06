import { NextRequest } from "next/server";
import { ok } from "@/lib/api/response";

type PromptKind = "analysis" | "report";

export interface AnalyticsPrompt {
  id: string;
  label: string;
  description: string;
  kind: PromptKind;
  defaultPeriod: "7d" | "30d" | "90d";
  focus:
    | "revenue"
    | "margin"
    | "waste"
    | "fulfilment"
    | "inventory"
    | "procurement"
    | "mixed";
  template: string;
}

const STANDARD_PROMPTS: AnalyticsPrompt[] = [
  {
    id: "rev-bridge-7d",
    label: "Revenue & margin bridge (7 days)",
    description:
      "Explain the main drivers of revenue and blended margin over the last 7 days, broken down by location, channel, and top SKUs.",
    kind: "analysis",
    defaultPeriod: "7d",
    focus: "margin",
    template:
      "Using the latest ingested sales, product master, and inventory data, produce a revenue and blended margin bridge for the last 7 days. Break out contributions by location, channel, and top 15 SKUs. Call out any material positive/negative drivers, quantify their impact in ₹ and percentage points, and flag anomalies against typical behaviour for this business.",
  },
  {
    id: "waste-hotspots-30d",
    label: "Waste hotspots (30 days)",
    description:
      "Identify SKUs, locations, and days with outsized wastage and estimate preventable loss.",
    kind: "analysis",
    defaultPeriod: "30d",
    focus: "waste",
    template:
      "Analyse the last 30 days of inventory and waste records. Identify the SKUs, locations, and specific dates with the highest wastage cost. Quantify total waste, estimate preventable loss (if waste were at the 25th percentile location), and recommend 3–5 concrete actions for the operator to reduce wastage.",
  },
  {
    id: "fulfilment-sla-7d",
    label: "Order fulfilment vs SLA",
    description:
      "Assess fulfilment rate against a 90% SLA and highlight chronic underperformance.",
    kind: "analysis",
    defaultPeriod: "7d",
    focus: "fulfilment",
    template:
      "Using order fulfilment and sales data for the last 7 days, evaluate our fulfilment rate versus a 90% SLA. Highlight locations, time windows, or channels where fulfilment repeatedly dipped below 90%. Estimate the revenue at risk and suggest operational levers to stabilise fulfilment.",
  },
  {
    id: "weekly-ops-report",
    label: "Weekly F&B intelligence report",
    description:
      "Generate an operator-friendly weekly summary of revenue, margin, waste, and fulfilment with clear next actions.",
    kind: "report",
    defaultPeriod: "7d",
    focus: "mixed",
    template:
      "Generate a concise weekly F&B operations report for the last 7 days, covering: (1) revenue and blended margin, (2) wastage cost and top waste drivers, (3) fulfilment rate vs SLA, and (4) any regime shifts or constraint breaches. Write this as if for an operator, with bullet-point insights and a short, prioritised action list.",
  },
  {
    id: "monthly-cfo-pack",
    label: "Monthly CFO pack (experimental)",
    description:
      "High-level monthly view of unit economics, waste, and procurement efficiency for finance stakeholders.",
    kind: "report",
    defaultPeriod: "30d",
    focus: "mixed",
    template:
      "Prepare a monthly CFO-style pack using the last 30 days of data. Summarise unit economics (revenue, COGS, gross margin), inventory health, wastage, procurement price movements, and fulfilment. Focus on explaining variance versus the prior month and call out 3–7 headline insights the finance team should care about.",
  },
];

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? undefined;

  // Prompts are currently static and not personalised; no auth is required.
  return ok(
    {
      prompts: STANDARD_PROMPTS,
    },
    requestId,
  );
}

