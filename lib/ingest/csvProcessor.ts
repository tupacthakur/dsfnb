// eslint-disable-next-line @typescript-eslint/no-var-requires
const Papa: any = require('papaparse');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export interface TierDetectionResult {
  tier1: string[];
  tier2: string[];
  unknown: string[];
  mappings: Record<string, string>;
}

export interface ProcessedRow {
  raw: Record<string, string>;
  normalized: Record<string, unknown>;
}

export interface KoravoIngestionPayload {
  type:
    | 'sales'
    | 'inventory'
    | 'procurement'
    | 'returns'
    | 'waste'
    | 'opex'
    | 'mixed';
  rows: ProcessedRow[];
  errors: { index: number; message: string }[];
}

export interface PersistResult {
  inserted: number;
  skipped: number;
  errors: { index: number; message: string }[];
}

export async function parseCSV(buffer: Buffer): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(buffer.toString('utf8'), {
      header: true,
      skipEmptyLines: true,
      complete: (result: { data: unknown[]; errors: { row: number; message: string }[]; meta: { fields?: string[] } }) => {
        if (result.errors.length > 0) {
          const first = result.errors[0];
          return reject(
            new Error(
              `CSV parse error at row ${first.row}: ${first.message}`,
            ),
          );
        }
        const rows = (result.data as unknown[]).map(
          (row) => row as Record<string, string>,
        );
        const headers = result.meta.fields ?? [];
        resolve({ headers, rows });
      },
      error: (error: unknown) => {
        reject(error);
      },
    });
  });
}

export async function detectTierFields(
  headers: string[],
): Promise<TierDetectionResult> {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const tier1: string[] = [];
  const tier2: string[] = [];
  const unknown: string[] = [];
  const mappings: Record<string, string> = {};

  const knownMap: Record<string, string> = {
    transaction_id: 'transaction_id',
    txn_id: 'transaction_id',
    trans_id: 'transaction_id',
    date: 'date',
    sku: 'sku',
    product_id: 'product_id',
    qty: 'quantity',
    quantity: 'quantity',
    price: 'unit_price',
    unit_price: 'unit_price',
    total: 'total_value',
    location: 'location',
    location_id: 'location_id',
    channel: 'channel',
    stock_in_date: 'stock_in_date',
    expiry_date: 'expiry_date',
    supplier: 'supplier_name',
    supplier_name: 'supplier_name',
  };

  normalized.forEach((h, idx) => {
    const original = headers[idx];
    const mapped = knownMap[h];
    if (mapped) {
      mappings[original] = mapped;
      if (
        [
          'transaction_id',
          'sku',
          'product_id',
          'quantity',
          'unit_price',
          'total_value',
          'location_id',
          'stock_in_date',
          'expiry_date',
          'supplier_name',
        ].includes(mapped)
      ) {
        tier1.push(mapped);
      } else {
        tier2.push(mapped);
      }
    } else {
      unknown.push(original);
    }
  });

  return { tier1, tier2, unknown, mappings };
}

export async function applySmartDefaults(
  rows: Record<string, string>[],
  detectedSchema: string,
): Promise<{ rows: ProcessedRow[]; flags: string[] }> {
  const flags = new Set<string>();
  const processed: ProcessedRow[] = rows.map((row) => ({
    raw: row,
    normalized: { ...row },
  }));

  if (detectedSchema === 'inventory') {
    for (const row of processed) {
      const category = (row.raw['category'] ?? '').toLowerCase();
      if (!row.raw['expiry_date']) {
        let days = 90;
        if (category.includes('dairy')) days = 7;
        else if (category.includes('bakery')) days = 3;
        else if (category.includes('beverage')) days = 180;
        else if (category.includes('grain')) days = 365;
        row.normalized['expiry_date_default_days'] = days;
        flags.add('standard_shelf_life_assumption');
      }
    }
  }

  return { rows: processed, flags: Array.from(flags) };
}

export async function transformToKoravoSchema(
  rows: ProcessedRow[],
  mappings: Record<string, string>,
  schemaType:
    | 'sales'
    | 'inventory'
    | 'procurement'
    | 'returns'
    | 'waste'
    | 'opex'
    | 'mixed',
): Promise<KoravoIngestionPayload> {
  const errors: { index: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row.raw)) {
      const target = mappings[key] ?? key;
      let v: unknown = value;
      if (target.toLowerCase().includes('amount') || target.includes('price')) {
        const num = Number(value);
        v = Number.isFinite(num) ? Math.round(num * 100) : null;
      } else if (target.toLowerCase().includes('pct')) {
        const num = Number(value);
        v = Number.isFinite(num) ? num / 100 : null;
      } else if (target.toLowerCase().includes('date')) {
        v = value ? new Date(value).toISOString() : null;
      }
      normalized[target] = v;
    }

    row.normalized = normalized;

    if (!normalized['sku'] && !normalized['product_id']) {
      errors.push({ index, message: 'Missing SKU/product_id' });
    }
  });

  return {
    type: schemaType,
    rows,
    errors,
  };
}

export async function persistIngestion(
  payload: KoravoIngestionPayload,
  ingestionLogId: string,
  userId: string,
): Promise<PersistResult> {
  let inserted = 0;
  const errors: { index: number; message: string }[] = [...payload.errors];

  const chunkSize =
    Number(process.env.CSV_CHUNK_SIZE ?? 500) || (500 as number);

  if (payload.type === 'sales') {
    const chunks: ProcessedRow[][] = [];
    for (let i = 0; i < payload.rows.length; i += chunkSize) {
      chunks.push(payload.rows.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.salesTransaction.create({
            data: {
              transactionCode: String(
                row.normalized['transaction_id'] ?? '',
              ),
              locationId: String(row.normalized['location_id'] ?? ''),
              channel: 'DIRECT',
              totalAmountPaise: Number(row.normalized['total_value'] ?? 0),
              discountPaise: 0,
              discountPct: 0,
              transactedAt: new Date(
                String(row.normalized['date'] ?? new Date().toISOString()),
              ),
              ingestionLogId,
            },
          }),
        ),
      );
      inserted += chunk.length;
    }
  }

  await prisma.ingestionLog.update({
    where: { id: ingestionLogId },
    data: {
      userId,
      rowCount: inserted,
      status: 'COMPLETE',
    },
  });

  return {
    inserted,
    skipped: payload.rows.length - inserted,
    errors,
  };
}

