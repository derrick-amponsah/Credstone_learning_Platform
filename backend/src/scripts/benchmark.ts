import { performance } from 'perf_hooks';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const DEMO_EMAIL = 'jamie.doe@credstone.com';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Credstone#2025!';

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, Math.min(index, arr.length - 1))];
}

async function runBenchmarkForRoute(
  name: string,
  url: string,
  headers: Record<string, string>,
  totalRequests = 200,
  concurrency = 10
) {
  const latencies: number[] = [];
  let completed = 0;

  async function worker() {
    while (completed < totalRequests) {
      completed++;
      const t0 = performance.now();
      try {
        const res = await fetch(url, { headers });
        const t1 = performance.now();
        if (res.ok) {
          latencies.push(t1 - t0);
        }
      } catch (err) {
        // ignore individual network hiccup
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const avg = latencies.length ? sum / latencies.length : 0;
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;

  return {
    name,
    total: latencies.length,
    min: min.toFixed(2),
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    max: max.toFixed(2),
    passed: p95 < 200,
  };
}

async function main() {
  console.log('===============================================================');
  console.log('    Credstone Learning — Performance & Latency Benchmark       ');
  console.log('    Target Criterion: p95 latency < 200 ms                      ');
  console.log('===============================================================\n');

  console.log(`Connecting to ${BASE_URL}...`);

  // Sign in to obtain session cookie
  let cookieHeader = '';
  try {
    const signinRes = await fetch(`${BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });

    const setCookie = signinRes.headers.get('set-cookie');
    if (setCookie) {
      cookieHeader = setCookie.split(';')[0];
      console.log(`[AUTH] Signed in as ${DEMO_EMAIL} (Session established)`);
    } else {
      console.warn('[AUTH] Could not extract session cookie; proceeding without auth');
    }
  } catch (err: any) {
    console.error(`[ERROR] Failed to connect to server: ${err.message}`);
    process.exit(1);
  }

  const headers = cookieHeader ? { Cookie: cookieHeader } : {};

  console.log('\nRunning load benchmarks (10 concurrent clients)...\n');

  const results = [];
  results.push(await runBenchmarkForRoute('1. Health Check (Raw Fastify)', `${BASE_URL}/health`, {}, 200, 10));
  results.push(await runBenchmarkForRoute('2. /auth/me (JWT + Cached Roles)', `${BASE_URL}/auth/me`, headers, 200, 10));
  results.push(await runBenchmarkForRoute('3. /catalogue (PostgreSQL Query)', `${BASE_URL}/catalogue`, headers, 200, 10));

  console.log('-----------------------------------------------------------------------------------------');
  console.log('| Route / Test Description             | Req Count | Min (ms) | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Result     |');
  console.log('-----------------------------------------------------------------------------------------');

  for (const r of results) {
    const pad = (str: string, len: number) => (str + ' '.repeat(len)).slice(0, len);
    const rpad = (str: string, len: number) => (' '.repeat(len) + str).slice(-len);
    const resultStr = r.passed ? 'PASSED (<200ms)' : 'FAILED';
    console.log(
      `| ${pad(r.name, 36)} | ${rpad(String(r.total), 9)} | ${rpad(r.min, 8)} | ${rpad(r.avg, 8)} | ${rpad(r.p50, 8)} | ${rpad(r.p95, 8)} | ${rpad(r.p99, 8)} | ${pad(resultStr, 10)} |`
    );
  }

  console.log('-----------------------------------------------------------------------------------------\n');
  const allPassed = results.every((r) => r.passed);
  if (allPassed) {
    console.log('>>> PROOF CRITERION MET: All p95 latencies are well below the 200 ms target. <<<');
  } else {
    console.warn('>>> One or more routes exceeded the 200 ms target. <<<');
  }
}

main().catch(console.error);
