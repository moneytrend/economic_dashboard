// ============================================================
// Realistic Mock Data (FRED API Fallback)
// Used when FRED API is unreachable (preview/offline)
// ============================================================

const MOCK_DATA_ACTIVE = false; // set true to force mock mode
let _useMock = false;

function enableMockMode() {
  _useMock = true;
  console.info('[EconDash] Using demo data — FRED API unavailable in this environment');
}

// ---- Seeded pseudo-random (deterministic) ----
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- Date sequence generators ----
function dailyDates(startYear, endYear) {
  const dates = [];
  const d = new Date(`${startYear}-01-02`);
  const end = new Date(`${endYear}-12-31`);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) { // weekdays only
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function weeklyDates(startYear, endYear) {
  const dates = [];
  const d = new Date(`${startYear}-01-07`); // first Saturday
  const end = new Date(`${endYear}-12-31`);
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

function monthlyDates(startYear, endYear) {
  const dates = [];
  for (let y = startYear; y <= endYear; y++) {
    const maxM = y === endYear ? new Date().getMonth() + 1 : 12;
    for (let m = 1; m <= maxM; m++) {
      dates.push(`${y}-${String(m).padStart(2, '0')}-01`);
    }
  }
  return dates;
}

function quarterlyDates(startYear, endYear) {
  const dates = [];
  for (let y = startYear; y <= endYear; y++) {
    for (const m of [1, 4, 7, 10]) {
      const date = `${y}-${String(m).padStart(2, '0')}-01`;
      if (new Date(date) <= new Date()) dates.push(date);
    }
  }
  return dates;
}

// ---- Value generators ----
function trendLine(dates, startVal, endVal) {
  return dates.map((_, i) => startVal + (endVal - startVal) * (i / (dates.length - 1)));
}

function addNoise(values, volatility, seed = 42) {
  const rand = seededRand(seed);
  let prev = 0;
  return values.map(v => {
    // Brownian-ish noise
    prev = prev * 0.85 + (rand() - 0.5) * 2 * volatility;
    return v + prev;
  });
}

function addShock(values, dates, shockDate, shockAmt, recovery = 0.05) {
  // Add a shock at a specific date and gradual recovery
  const shockIdx = dates.findIndex(d => d >= shockDate);
  if (shockIdx < 0) return values;
  return values.map((v, i) => {
    if (i < shockIdx) return v;
    const t = i - shockIdx;
    const effect = shockAmt * Math.exp(-recovery * t);
    return v + effect;
  });
}

// ---- Build FRED-format observations ----
function obs(dates, values) {
  return dates.map((date, i) => ({
    date,
    value: Math.round(values[i] * 1000) / 1000,
  }));
}

// ---- Series Generators ----
const SY = 2014, EY = 2025; // data range

function genGDPC1() {
  const dates = quarterlyDates(SY, EY);
  let vals = trendLine(dates, 17300, 23100);
  vals = addNoise(vals, 150, 10);
  vals = addShock(vals, dates, '2020-04-01', -2800, 0.5); // COVID crash
  return obs(dates, vals.map(v => Math.max(v, 15000)));
}

function genGDP() {
  const dates = quarterlyDates(SY, EY);
  let vals = trendLine(dates, 18000, 29700);
  vals = addNoise(vals, 200, 11);
  vals = addShock(vals, dates, '2020-04-01', -2500, 0.5);
  return obs(dates, vals.map(v => Math.max(v, 16000)));
}

function genA191RL1Q225SBEA() {
  const dates = quarterlyDates(SY, EY);
  const rand = seededRand(13);
  return obs(dates, dates.map((d, i) => {
    if (d >= '2020-04-01' && d < '2020-07-01') return -29.9;
    if (d >= '2020-07-01' && d < '2020-10-01') return 35.3;
    if (d >= '2022-01-01' && d < '2022-04-01') return -1.6;
    if (d >= '2022-04-01' && d < '2022-07-01') return -0.6;
    return 2.0 + (rand() - 0.5) * 2.5;
  }));
}

function genWEI() {
  const dates = weeklyDates(SY, EY);
  const rand = seededRand(7);
  let val = 2.0;
  return obs(dates, dates.map(d => {
    if (d >= '2020-03-01' && d < '2020-05-01') return -12.5 + rand() * 2;
    if (d >= '2020-05-01' && d < '2021-01-01') return -4 + rand() * 4;
    val = val * 0.9 + (2.5 + (rand() - 0.5) * 3) * 0.1;
    return Math.round(val * 100) / 100;
  }));
}

function genINDPRO() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 101, 103);
  vals = addNoise(vals, 1.2, 15);
  vals = addShock(vals, dates, '2020-04-01', -14, 0.3);
  return obs(dates, vals.map(v => Math.max(v, 85)));
}

function genTCU() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 77, 78.5);
  vals = addNoise(vals, 0.8, 16);
  vals = addShock(vals, dates, '2020-04-01', -9, 0.3);
  return obs(dates, vals.map(v => Math.max(v, 60)));
}

function genCPIAUCSL() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 234, 320);
  // COVID-era surge 2021-2022
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-06-01' && d < '2023-01-01') return v * 1.04;
    return v;
  });
  vals = addNoise(vals, 0.5, 17);
  return obs(dates, vals);
}

function genCPILFESL() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 240, 325);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-06-01' && d < '2023-06-01') return v * 1.03;
    return v;
  });
  vals = addNoise(vals, 0.4, 18);
  return obs(dates, vals);
}

function genPCEPI() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 108, 124);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-06-01' && d < '2023-06-01') return v * 1.025;
    return v;
  });
  vals = addNoise(vals, 0.2, 19);
  return obs(dates, vals);
}

function genPCEPILFE() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 107, 122);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-06-01' && d < '2023-06-01') return v * 1.02;
    return v;
  });
  vals = addNoise(vals, 0.15, 20);
  return obs(dates, vals);
}

function genPPIACO() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 140, 200);
  vals = addNoise(vals, 5, 21);
  // PPI spike 2021-2022
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-01-01' && d < '2022-07-01') return v * 1.12;
    return v;
  });
  return obs(dates, vals.map(v => Math.max(v, 100)));
}

function genPPIFID() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 112, 150);
  vals = addNoise(vals, 3, 22);
  return obs(dates, vals.map(v => Math.max(v, 100)));
}

function genDGS10() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(5);
  let val = 2.2;
  return obs(dates, dates.map(d => {
    // Key rate regimes
    if (d < '2016-01-01') { val = 2.2 + (rand() - 0.5) * 0.1; }
    else if (d < '2018-10-01') { val = val * 0.99 + 2.5 * 0.01 + (rand()-0.5)*0.05; }
    else if (d < '2019-09-01') { val = val * 0.99 + 2.9 * 0.01 + (rand()-0.5)*0.05; }
    else if (d < '2020-04-01') { val = val * 0.99 + 1.8 * 0.01 + (rand()-0.5)*0.05; }
    else if (d < '2021-01-01') { val = val * 0.98 + 0.65 * 0.02 + (rand()-0.5)*0.03; }
    else if (d < '2022-01-01') { val = val * 0.97 + 1.5 * 0.03 + (rand()-0.5)*0.08; }
    else if (d < '2023-10-01') { val = val * 0.97 + 4.5 * 0.03 + (rand()-0.5)*0.08; }
    else if (d < '2024-07-01') { val = val * 0.98 + 4.8 * 0.02 + (rand()-0.5)*0.06; }
    else { val = val * 0.98 + 4.35 * 0.02 + (rand()-0.5)*0.05; }
    return Math.max(Math.round(val * 100) / 100, 0.4);
  }));
}

function genDGSN(target, seed, offset = 0) {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(seed);
  let val = target - 0.5 + offset;
  const base10 = genDGS10();
  return obs(dates, base10.map(o => {
    return Math.max(parseFloat(o.value) + offset + (rand() - 0.5) * 0.1, 0.1);
  }));
}

function genFEDFUNDS() {
  const dates = monthlyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2015-12-01') return 0.12;
    if (d < '2018-12-01') return Math.min(0.12 + (new Date(d) - new Date('2015-12-01')) / (1000*60*60*24*365) * 0.6, 2.4);
    if (d < '2019-10-01') return 2.40;
    if (d < '2020-03-01') return 1.75;
    if (d < '2022-03-01') return 0.09;
    if (d < '2023-08-01') {
      const months = (new Date(d) - new Date('2022-03-01')) / (1000*60*60*24*30);
      return Math.min(0.09 + months * 0.27, 5.33);
    }
    return 5.33;
  }));
}

function genDFEDTARU() {
  const dates = dailyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2015-12-17') return 0.25;
    if (d < '2018-12-20') return Math.min(0.5 + Math.floor((new Date(d) - new Date('2015-12-17')) / (1000*60*60*24*90)) * 0.25, 2.5);
    if (d < '2019-08-01') return 2.5;
    if (d < '2019-10-31') return 2.25;
    if (d < '2019-12-12') return 2.0;
    if (d < '2020-03-04') return 1.75;
    if (d < '2020-03-16') return 1.25;
    if (d < '2022-03-17') return 0.25;
    if (d < '2022-05-05') return 0.5;
    if (d < '2022-06-16') return 1.0;
    if (d < '2022-07-28') return 1.75;
    if (d < '2022-09-22') return 2.5;
    if (d < '2022-11-03') return 3.25;
    if (d < '2022-12-15') return 4.0;
    if (d < '2023-02-02') return 4.5;
    if (d < '2023-03-23') return 4.75;
    if (d < '2023-05-04') return 5.25;
    if (d < '2023-07-27') return 5.25;
    if (d < '2024-09-19') return 5.5;
    if (d < '2024-11-08') return 5.0;
    if (d < '2024-12-19') return 4.75;
    return 4.5;
  }));
}

function genMORTGAGE30US() {
  const dates = weeklyDates(SY, EY);
  const rand = seededRand(30);
  return obs(dates, dates.map(d => {
    if (d < '2020-01-01') return 3.8 + (rand() - 0.5) * 0.5;
    if (d < '2021-01-01') return 3.0 + (rand() - 0.5) * 0.4;
    if (d < '2022-01-01') return 3.1 + (rand() - 0.5) * 0.3;
    if (d < '2023-01-01') return 5.5 + (rand() - 0.5) * 1.2;
    if (d < '2024-01-01') return 7.0 + (rand() - 0.5) * 0.6;
    return 6.8 + (rand() - 0.5) * 0.4;
  }));
}

function genSOFR() {
  const dates = dailyDates(SY, EY);
  const fed = genDFEDTARU();
  return obs(dates, fed.map(o => Math.max(parseFloat(o.value) - 0.05, 0.01)));
}

function genT10Y2Y() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(99);
  return obs(dates, dates.map(d => {
    if (d < '2022-01-01') return 1.0 + (rand() - 0.5) * 0.5;
    if (d < '2022-07-01') return 0.3 + (rand() - 0.5) * 0.4;
    if (d < '2023-03-01') return -0.5 + (rand() - 0.5) * 0.4;
    if (d < '2024-01-01') return -0.85 + (rand() - 0.5) * 0.3;
    return -0.35 + (rand() - 0.5) * 0.3;
  }));
}

function genT10Y3M() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(100);
  return obs(dates, dates.map(d => {
    if (d < '2022-06-01') return 1.5 + (rand() - 0.5) * 0.5;
    if (d < '2023-01-01') return 0.5 + (rand() - 0.5) * 0.5;
    if (d < '2024-01-01') return -1.3 + (rand() - 0.5) * 0.4;
    return -0.7 + (rand() - 0.5) * 0.4;
  }));
}

function genBreakeven(yr, seed) {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(seed);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 2.0 + (rand() - 0.5) * 0.4;
    if (d < '2020-07-01') return 0.8 + (rand() - 0.5) * 0.3;
    if (d < '2022-04-01') return 2.5 + (rand() - 0.5) * 0.5;
    if (d < '2022-10-01') return 3.0 + (rand() - 0.5) * 0.4;
    if (d < '2023-06-01') return 2.3 + (rand() - 0.5) * 0.3;
    return 2.4 + (rand() - 0.5) * 0.25;
  }));
}

function genUNRATE() {
  const dates = monthlyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 4.7 - (new Date(d) - new Date('2014-01-01')) / (1000*60*60*24*365) * 0.3;
    if (d < '2020-05-01') return 14.7;
    if (d < '2021-01-01') {
      const months = (new Date(d) - new Date('2020-05-01')) / (1000*60*60*24*30);
      return Math.max(14.7 - months * 0.8, 6.7);
    }
    if (d < '2023-01-01') {
      const months = (new Date(d) - new Date('2021-01-01')) / (1000*60*60*24*30);
      return Math.max(6.7 - months * 0.15, 3.4);
    }
    if (d < '2024-01-01') return 3.6;
    return 4.0;
  }));
}

function genU6RATE() {
  const urate = genUNRATE();
  return obs(urate.map(o => o.date), urate.map(o => parseFloat(o.value) * 1.85 + 0.5));
}

function genPAYEMS() {
  const dates = monthlyDates(SY, EY);
  let level = 139000;
  const rand = seededRand(50);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') { level += 180 + (rand() - 0.5) * 80; }
    else if (d === '2020-04-01') { level -= 20500; }
    else if (d === '2020-05-01') { level += 2500; }
    else if (d < '2021-01-01') { level += 1000 + (rand() - 0.5) * 300; }
    else if (d < '2022-01-01') { level += 550 + (rand() - 0.5) * 200; }
    else { level += 200 + (rand() - 0.5) * 100; }
    return Math.round(Math.max(level, 130000));
  }));
}

function genUSPRIV() {
  const payems = genPAYEMS();
  return obs(payems.map(o => o.date), payems.map(o => Math.round(parseFloat(o.value) * 0.843)));
}

function genCIVPART() {
  const dates = monthlyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 63.2 + (new Date(d) - new Date('2014-01-01')) / (1000*60*60*24*365) * 0.1;
    if (d < '2020-06-01') return 60.2;
    if (d < '2022-01-01') {
      const months = (new Date(d) - new Date('2020-06-01')) / (1000*60*60*24*30);
      return Math.min(60.2 + months * 0.15, 61.9);
    }
    return 62.5;
  }));
}

function genICSA() {
  const dates = weeklyDates(SY, EY);
  const rand = seededRand(167);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-22') return 220 + (rand() - 0.5) * 40;
    if (d === '2020-03-28') return 6606;
    if (d < '2020-07-01') return 1000 + (rand() - 0.5) * 200;
    if (d < '2021-01-01') return 700 + (rand() - 0.5) * 100;
    if (d < '2022-01-01') { return 350 + (rand() - 0.5) * 80; }
    return 215 + (rand() - 0.5) * 25;
  }));
}

function genCCSA() {
  const dates = weeklyDates(SY, EY);
  const rand = seededRand(168);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-22') return 1750 + (rand() - 0.5) * 200;
    if (d < '2020-07-01') return 15000 + (rand() - 0.5) * 2000;
    if (d < '2021-01-01') return 5000 + (rand() - 0.5) * 1000;
    if (d < '2022-01-01') return 2800 + (rand() - 0.5) * 300;
    return 1850 + (rand() - 0.5) * 150;
  }));
}

function genJTSJOL() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(192);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 5500 + (rand() - 0.5) * 500;
    if (d < '2021-01-01') return 4500 + (rand() - 0.5) * 500;
    if (d < '2022-04-01') return 9000 + (rand() - 0.5) * 800;
    if (d < '2023-01-01') return 10800 + (rand() - 0.5) * 600;
    if (d < '2024-01-01') return 8500 + (rand() - 0.5) * 500;
    return 7300 + (rand() - 0.5) * 400;
  }));
}

function genJTSQUR() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(193);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 2.3 + (rand() - 0.5) * 0.3;
    if (d < '2021-01-01') return 1.6 + (rand() - 0.5) * 0.3;
    if (d < '2022-07-01') return 2.9 + (rand() - 0.5) * 0.4;
    if (d < '2023-06-01') return 2.5 + (rand() - 0.5) * 0.3;
    return 2.1 + (rand() - 0.5) * 0.2;
  }));
}

function genCES0500000003() { // Avg Hourly Earnings
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 24.5, 36.0);
  vals = addNoise(vals, 0.1, 23);
  return obs(dates, vals);
}

function genAWHMAN() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(24);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 40.8 + (rand() - 0.5) * 0.5;
    if (d < '2020-08-01') return 39.0 + (rand() - 0.5) * 0.5;
    return 40.5 + (rand() - 0.5) * 0.4;
  }));
}

function genSAHMREALTIME() {
  const dates = monthlyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 0.05;
    if (d < '2020-06-01') return 3.9;
    if (d < '2021-01-01') {
      const months = (new Date(d) - new Date('2020-06-01')) / (1000*60*60*24*30);
      return Math.max(3.9 - months * 0.5, 0.0);
    }
    return 0.05;
  }));
}

function genM1SL() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 3100, 18500);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2020-01-01' && d < '2021-06-01') return v * 1.25;
    return v;
  });
  return obs(dates, vals);
}

function genM2SL() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 11700, 21100);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2020-01-01' && d < '2022-01-01') return v * 1.1;
    return v;
  });
  return obs(dates, vals);
}

function genBOGMBASE() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 3900, 5100);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2020-03-01' && d < '2022-06-01') return v * 1.5;
    return v;
  });
  return obs(dates, vals);
}

function genWALCL() {
  const dates = weeklyDates(SY, EY);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 4100000 + (new Date(d) - new Date('2014-01-01')) / (1000*60*60*24) * 500;
    if (d < '2022-04-01') {
      const weeks = (new Date(d) - new Date('2020-03-01')) / (1000*60*60*24*7);
      return Math.min(4100000 + weeks * 100000, 8900000);
    }
    if (d < '2024-01-01') {
      const weeks = (new Date(d) - new Date('2022-04-01')) / (1000*60*60*24*7);
      return Math.max(8900000 - weeks * 40000, 7000000);
    }
    return 7200000;
  }));
}

function genExchangeRate(start, mid2020, end, seed) {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(seed);
  return obs(dates, dates.map(d => {
    const progress = (new Date(d) - new Date('2014-01-01')) / (new Date('2025-01-01') - new Date('2014-01-01'));
    const base = start + (end - start) * progress;
    return Math.max(base + (rand() - 0.5) * (end - start) * 0.15, 0.5);
  }));
}

function genDTWEXBGS() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(160);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 118 + (rand() - 0.5) * 8;
    if (d < '2021-01-01') return 125 + (rand() - 0.5) * 8;
    if (d < '2022-01-01') return 117 + (rand() - 0.5) * 6;
    if (d < '2023-01-01') return 128 + (rand() - 0.5) * 8;
    return 122 + (rand() - 0.5) * 6;
  }));
}

function genGOLD() {
  const dates = dailyDates(SY, EY);
  let vals = trendLine(dates.map((_, i) => i), 1200, 2300);
  const rand = seededRand(170);
  return obs(dates, vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2020-01-01' && d < '2020-09-01') return v * 1.25;
    return v + (rand() - 0.5) * 60;
  }));
}

function genRSAFS() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 420000, 710000);
  vals = addNoise(vals, 5000, 190);
  vals = addShock(vals, dates, '2020-04-01', -100000, 0.25);
  return obs(dates, vals.map(v => Math.max(v, 300000)));
}

function genRRSFS() {
  const rsafs = genRSAFS();
  return obs(rsafs.map(o => o.date), rsafs.map(o => Math.round(parseFloat(o.value) * 0.72)));
}

function genPCE() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 12000, 19000);
  vals = addShock(vals, dates, '2020-04-01', -2500, 0.3);
  return obs(dates, vals);
}

function genPI() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 15000, 24000);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2020-04-01' && d < '2020-06-01') return v * 1.2;
    if (d >= '2021-01-01' && d < '2021-03-01') return v * 1.15;
    return v;
  });
  return obs(dates, vals);
}

function genDSPIC96() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 14000, 19000);
  return obs(dates, vals);
}

function genPSAVERT() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(54);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 7.5 + (rand() - 0.5) * 1.5;
    if (d < '2020-05-01') return 33.8;
    if (d < '2020-08-01') return 19.0 + (rand() - 0.5) * 3;
    if (d < '2021-04-01') return 14.0 + (rand() - 0.5) * 3;
    if (d < '2022-01-01') return 11.0 + (rand() - 0.5) * 2;
    return 5.5 + (rand() - 0.5) * 1.5;
  }));
}

function genUMCSENT() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(144);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 95 + (rand() - 0.5) * 8;
    if (d < '2020-07-01') return 72 + (rand() - 0.5) * 8;
    if (d < '2021-07-01') return 84 + (rand() - 0.5) * 6;
    if (d < '2022-07-01') return 68 + (rand() - 0.5) * 8;
    if (d < '2023-06-01') return 62 + (rand() - 0.5) * 6;
    return 70 + (rand() - 0.5) * 6;
  }));
}

function genTOTALSL() {
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 3200000, 5000000);
  return obs(dates, vals);
}

function genEXHOSLUSM495S() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(456);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 5500 + (rand() - 0.5) * 600;
    if (d < '2021-01-01') return 5000 + (rand() - 0.5) * 500;
    if (d < '2022-01-01') return 6200 + (rand() - 0.5) * 600;
    if (d < '2023-06-01') return 4200 + (rand() - 0.5) * 400;
    return 4000 + (rand() - 0.5) * 300;
  }));
}

function genHSN1F() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(336);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 640 + (rand() - 0.5) * 80;
    if (d < '2021-01-01') return 820 + (rand() - 0.5) * 100;
    if (d < '2023-01-01') return 660 + (rand() - 0.5) * 80;
    return 680 + (rand() - 0.5) * 60;
  }));
}

function genTOTALSA() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(10);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 17.1 + (rand() - 0.5) * 1.5;
    if (d < '2020-07-01') return 9.0 + (rand() - 0.5) * 1.5;
    if (d < '2021-01-01') return 14 + (rand() - 0.5) * 1;
    if (d < '2022-01-01') return 13 + (rand() - 0.5) * 1;
    return 15.5 + (rand() - 0.5) * 1;
  }));
}

function genDRCCLACBS() {
  const dates = quarterlyDates(SY, EY);
  const rand = seededRand(83);
  return obs(dates, dates.map(d => {
    if (d < '2020-01-01') return 2.5 + (rand() - 0.5) * 0.3;
    if (d < '2020-07-01') return 2.7 + (rand() - 0.5) * 0.3;
    if (d < '2022-01-01') return 1.6 + (rand() - 0.5) * 0.3;
    if (d < '2024-01-01') return 2.5 + (rand() - 0.5) * 0.4;
    return 3.2 + (rand() - 0.5) * 0.3;
  }));
}

function genHOUST() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(234);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 1300 + (rand() - 0.5) * 200;
    if (d < '2020-07-01') return 900 + (rand() - 0.5) * 100;
    if (d < '2022-04-01') return 1600 + (rand() - 0.5) * 200;
    if (d < '2023-06-01') return 1200 + (rand() - 0.5) * 200;
    return 1380 + (rand() - 0.5) * 150;
  }));
}

function genPERMIT() {
  const houst = genHOUST();
  const rand = seededRand(235);
  return obs(houst.map(o => o.date), houst.map(o => Math.round(parseFloat(o.value) * 1.05 + (rand()-0.5)*50)));
}

function genBOPGSTB() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(51);
  return obs(dates, dates.map(d => {
    return -60000 + (rand() - 0.5) * 15000;
  }));
}

function genVIXCLS() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(16);
  let val = 15;
  return obs(dates, dates.map(d => {
    if (d >= '2020-02-20' && d <= '2020-03-20') return 60 + rand() * 22;
    val = val * 0.95 + (15 + rand() * 5) * 0.05 + (rand() - 0.5) * 1.5;
    return Math.max(Math.round(val * 100) / 100, 9);
  }));
}

function genSTLFSI4() {
  const dates = weeklyDates(SY, EY);
  const rand = seededRand(200);
  return obs(dates, dates.map(d => {
    if (d >= '2020-02-15' && d <= '2020-05-01') return 5 + rand() * 2;
    return (rand() - 0.5) * 0.6;
  }));
}

function genNFCI() {
  const stlfsi = genSTLFSI4();
  const rand = seededRand(201);
  return obs(stlfsi.map(o => o.date), stlfsi.map(o => {
    return parseFloat(o.value) * 0.8 + (rand() - 0.5) * 0.15;
  }));
}

function genKCFSI() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(202);
  return obs(dates, dates.map(d => {
    if (d >= '2020-03-01' && d <= '2020-06-01') return 3 + rand() * 2;
    return (rand() - 0.5) * 0.5;
  }));
}

function genBAMLH0A0HYM2() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(203);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 3.5 + (rand() - 0.5) * 1;
    if (d < '2020-05-01') return 9.5 + rand() * 1;
    if (d < '2021-01-01') return 4.5 + (rand() - 0.5) * 0.8;
    if (d < '2022-01-01') return 3.2 + (rand() - 0.5) * 0.5;
    if (d < '2023-01-01') return 5.5 + (rand() - 0.5) * 1;
    return 3.5 + (rand() - 0.5) * 0.7;
  }));
}

function genBAMLC0A0CM() {
  const dates = dailyDates(SY, EY);
  const rand = seededRand(204);
  return obs(dates, dates.map(d => {
    if (d < '2020-03-01') return 1.1 + (rand() - 0.5) * 0.3;
    if (d < '2020-05-01') return 3.7 + rand() * 0.5;
    if (d < '2022-01-01') return 1.0 + (rand() - 0.5) * 0.2;
    return 1.3 + (rand() - 0.5) * 0.3;
  }));
}

function genDRSFRMACBS() {
  const dates = quarterlyDates(SY, EY);
  const rand = seededRand(84);
  return obs(dates, dates.map(d => {
    if (d < '2020-04-01') return 1.2 + (rand()-0.5)*0.2;
    if (d < '2021-01-01') return 2.5 + (rand()-0.5)*0.3;
    if (d < '2022-01-01') return 1.8 + (rand()-0.5)*0.3;
    return 1.1 + (rand()-0.5)*0.2;
  }));
}

function genMICH() {
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(144);
  return obs(dates, dates.map(d => {
    if (d < '2021-01-01') return 2.8 + (rand()-0.5)*0.4;
    if (d < '2022-07-01') return 4.8 + (rand()-0.5)*0.6;
    if (d < '2023-06-01') return 3.8 + (rand()-0.5)*0.5;
    return 3.1 + (rand()-0.5)*0.4;
  }));
}

function genPRIME() {
  const fedfunds = genFEDFUNDS();
  return obs(fedfunds.map(o => o.date), fedfunds.map(o => parseFloat(o.value) + 3.0));
}

function genCUIR0000SAH1() { // CPI Shelter
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 300, 430);
  vals = vals.map((v, i) => {
    const d = dates[i];
    if (d >= '2021-01-01') return v * 1.02;
    return v;
  });
  return obs(dates, vals);
}

function genCPIUFDSL() { // CPI Food
  const dates = monthlyDates(SY, EY);
  let vals = trendLine(dates, 244, 320);
  vals = addNoise(vals, 2, 25);
  return obs(dates, vals);
}

function genCPIENGSL() { // CPI Energy
  const dates = monthlyDates(SY, EY);
  const rand = seededRand(26);
  return obs(dates, dates.map(d => {
    return 200 + (rand()-0.5)*50 + (d >= '2021-01-01' && d < '2023-01-01' ? 80 : 0);
  }));
}

// ============================================================
// Master mock data registry
// ============================================================
const MOCK_GENERATORS = {
  GDPC1:           genGDPC1,
  A191RL1Q225SBEA: genA191RL1Q225SBEA,
  GDP:             genGDP,
  WEI:             genWEI,
  INDPRO:          genINDPRO,
  TCU:             genTCU,
  CPIAUCSL:        genCPIAUCSL,
  CPILFESL:        genCPILFESL,
  PCEPI:           genPCEPI,
  PCEPILFE:        genPCEPILFE,
  PPIACO:          genPPIACO,
  PPIFID:          genPPIFID,
  CUSR0000SAH1:    genCUIR0000SAH1,
  CPIUFDSL:        genCPIUFDSL,
  CPIENGSL:        genCPIENGSL,
  MICH:            genMICH,
  DGS10:           genDGS10,
  DGS2:            () => genDGSN(2, 31, -2.2),
  DGS1:            () => genDGSN(1, 32, -2.5),
  DGS5:            () => genDGSN(5, 33, -1.0),
  DGS30:           () => genDGSN(30, 34, 0.4),
  MORTGAGE30US:    genMORTGAGE30US,
  PRIME:           genPRIME,
  SOFR:            genSOFR,
  DFEDTARU:        genDFEDTARU,
  FEDFUNDS:        genFEDFUNDS,
  T10Y2Y:          genT10Y2Y,
  T10Y3M:          genT10Y3M,
  T5YIE:           () => genBreakeven(5, 60),
  T10YIE:          () => genBreakeven(10, 61),
  UNRATE:          genUNRATE,
  U6RATE:          genU6RATE,
  PAYEMS:          genPAYEMS,
  USPRIV:          genUSPRIV,
  CIVPART:         genCIVPART,
  ICSA:            genICSA,
  CCSA:            genCCSA,
  JTSJOL:          genJTSJOL,
  JTSQUR:          genJTSQUR,
  CES0500000003:   genCES0500000003,
  AWHMAN:          genAWHMAN,
  SAHMREALTIME:    genSAHMREALTIME,
  M1SL:            genM1SL,
  M2SL:            genM2SL,
  BOGMBASE:        genBOGMBASE,
  WALCL:           genWALCL,
  DEXUSEU:         () => genExchangeRate(1.18, 1.08, 1.09, 71),
  DEXJPUS:         () => genExchangeRate(115, 133, 152, 72),
  DEXUSUK:         () => genExchangeRate(1.52, 1.25, 1.27, 73),
  DEXCHUS:         () => genExchangeRate(6.2, 6.8, 7.25, 74),
  DTWEXBGS:        genDTWEXBGS,
  GOLDAMGBD228NLBM:genGOLD,
  RSAFS:           genRSAFS,
  RRSFS:           genRRSFS,
  PCE:             genPCE,
  PI:              genPI,
  DSPIC96:         genDSPIC96,
  PSAVERT:         genPSAVERT,
  UMCSENT:         genUMCSENT,
  TOTALSL:         genTOTALSL,
  EXHOSLUSM495S:   genEXHOSLUSM495S,
  HSN1F:           genHSN1F,
  TOTALSA:         genTOTALSA,
  DRCCLACBS:       genDRCCLACBS,
  HOUST:           genHOUST,
  PERMIT:          genPERMIT,
  BOPGSTB:         genBOPGSTB,
  VIXCLS:          genVIXCLS,
  STLFSI4:         genSTLFSI4,
  NFCI:            genNFCI,
  KCFSI:           genKCFSI,
  BAMLH0A0HYM2:    genBAMLH0A0HYM2,
  BAMLC0A0CM:      genBAMLC0A0CM,
  DRSFRMACBS:      genDRSFRMACBS,
};

// Cache for generated mock data (expensive to compute)
const _mockCache = {};

function getMockSeries(seriesId) {
  if (!_mockCache[seriesId]) {
    const gen = MOCK_GENERATORS[seriesId];
    if (!gen) return null;
    _mockCache[seriesId] = gen();
  }
  return _mockCache[seriesId];
}

// ---- Mock release calendar ----
function getMockReleaseDates(year, month) {
  // Simulate typical economic release dates for a given month
  const pad = n => String(n).padStart(2, '0');
  const dates = [];
  const releases = [
    // Week 1
    { day: 3,  release_id: 167, release_name: 'Unemployment Insurance Weekly Claims' },
    { day: 5,  release_id: 50,  release_name: 'Employment Situation' },
    // Week 2
    { day: 10, release_id: 167, release_name: 'Unemployment Insurance Weekly Claims' },
    { day: 11, release_id: 10,  release_name: 'Consumer Price Index' },
    { day: 14, release_id: 31,  release_name: 'Producer Price Index' },
    // Week 3
    { day: 15, release_id: 190, release_name: 'Advance Monthly Sales for Retail' },
    { day: 15, release_id: 234, release_name: 'Housing Starts' },
    { day: 17, release_id: 167, release_name: 'Unemployment Insurance Weekly Claims' },
    { day: 17, release_id: 13,  release_name: 'Industrial Production and Capacity Utilization' },
    // Week 4
    { day: 23, release_id: 192, release_name: 'Job Openings and Labor Turnover Survey' },
    { day: 24, release_id: 167, release_name: 'Unemployment Insurance Weekly Claims' },
    { day: 25, release_id: 54,  release_name: 'Personal Income and Outlays' },
    { day: 27, release_id: 336, release_name: 'New Residential Sales' },
    { day: 28, release_id: 456, release_name: 'Existing Home Sales' },
    // Quarterly GDP (late month)
    { day: 28, release_id: 21,  release_name: 'Gross Domestic Product' },
    { day: 22, release_id: 144, release_name: 'University of Michigan Consumer Sentiment' },
  ];

  const daysInMonth = new Date(year, month, 0).getDate();
  for (const r of releases) {
    if (r.day > daysInMonth) continue;
    const d = `${year}-${pad(month)}-${pad(r.day)}`;
    const dow = new Date(d).getDay();
    // Shift weekend to Monday
    let adjustedDay = r.day;
    if (dow === 6) adjustedDay = r.day + 2;
    if (dow === 0) adjustedDay = r.day + 1;
    if (adjustedDay > daysInMonth) continue;
    dates.push({
      release_id: r.release_id,
      release_name: r.release_name,
      date: `${year}-${pad(month)}-${pad(adjustedDay)}`,
    });
  }
  return dates;
}
