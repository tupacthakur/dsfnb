#!/usr/bin/env node
/**
 * Test stats/KPI and analytics API with mock data.
 * Run with: node scripts/test-api.mjs
 * Ensure the dev server is running (npm run dev) and DB is seeded (npm run db:seed).
 */

const BASE = process.env.API_BASE ?? 'http://localhost:3000';

async function get(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url);
  const body = await res.json();
  return { ok: res.ok, status: res.status, data: body };
}

async function main() {
  console.log('Testing API at', BASE, '\n');

  let failed = false;

  // 1. KPI / metrics (7d)
  const kpi7 = await get('/api/metrics/kpi?period=7d');
  if (!kpi7.ok) {
    console.log('❌ GET /api/metrics/kpi?period=7d failed:', kpi7.status, kpi7.data);
    failed = true;
  } else {
    const d = kpi7.data?.data;
    console.log('✅ GET /api/metrics/kpi?period=7d');
    console.log('   period:', d?.period, '| generatedAt:', d?.generatedAt);
    console.log('   revenue:', d?.revenue?.value != null ? `₹${d.revenue.value.toFixed(2)} (trend: ${d.revenue.trend?.toFixed(1)}%)` : 'N/A');
    console.log('   wasteCost:', d?.wasteCost?.value != null ? `₹${d.wasteCost.value.toFixed(2)} (${d.wasteCost.pctOfRevenue?.toFixed(2)}% of revenue)` : 'N/A');
    const fr = d?.fulfilmentRate?.value;
    console.log('   fulfilmentRate:', fr != null ? `${(Number(fr) * 100).toFixed(1)}%` : 'N/A');
    console.log('');
  }

  // 2. KPI 30d
  const kpi30 = await get('/api/metrics/kpi?period=30d');
  if (!kpi30.ok) {
    console.log('❌ GET /api/metrics/kpi?period=30d failed:', kpi30.status, kpi30.data);
    failed = true;
  } else {
    console.log('✅ GET /api/metrics/kpi?period=30d — success\n');
  }

  // 3. Analytics prompts
  const prompts = await get('/api/analytics/prompts');
  if (!prompts.ok) {
    console.log('❌ GET /api/analytics/prompts failed:', prompts.status, prompts.data);
    failed = true;
  } else {
    const list = prompts.data?.data?.prompts ?? [];
    console.log('✅ GET /api/analytics/prompts');
    console.log('   prompts:', list.length);
    list.slice(0, 3).forEach((p, i) => console.log(`   ${i + 1}. ${p.label} (${p.focus})`));
    console.log('');
  }

  if (failed) {
    process.exit(1);
  }
  console.log('All stats/API checks passed.');
}

main().catch((err) => {
  console.error('Request failed:', err.message);
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('Is the dev server running? Start with: npm run dev');
  }
  process.exit(1);
});
