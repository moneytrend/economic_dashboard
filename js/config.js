// ============================================================
// FRED API Configuration
// ============================================================
const FRED_API_KEY = 'abf0f4764ba9e3e250d27364004f5d78';
// Route through local proxy (avoids CORS in sandboxed/preview environments)
const FRED_BASE = '/api/fred';
const CACHE_PREFIX = 'econ_';
const CACHE_VERSION = 'v2';

// ============================================================
// Series Definitions
// ============================================================
const SERIES = {
  // ---- Output / Macro ----
  GDPC1:           { name: '實質 GDP',           nameEn: 'Real GDP',                   units: '十億美元(2017)',  fmt: 'billions', freq: 'quarterly', changeType: 'pct',  page: ['home','macro'], releaseId: 53,  color: '#3b82f6' },
  A191RL1Q225SBEA: { name: 'GDP 年化增長率',      nameEn: 'Real GDP Growth (SAAR)',      units: '%',             fmt: 'pct',      freq: 'quarterly', changeType: 'abs',  page: ['macro'],        releaseId: 53,  color: '#60a5fa' },
  GDP:             { name: '名義 GDP',            nameEn: 'Nominal GDP',                units: '十億美元',        fmt: 'billions', freq: 'quarterly', changeType: 'pct',  page: ['macro'],        releaseId: 53,  color: '#93c5fd' },
  WEI:             { name: 'WEI 週度經濟指數',    nameEn: 'Weekly Economic Index',      units: '%',             fmt: 'pct2',     freq: 'weekly',    changeType: 'abs',  page: ['home','macro'], releaseId: 175, color: '#22d3ee' },
  INDPRO:          { name: '工業生產指數',         nameEn: 'Industrial Production',      units: '指數(2017=100)',  fmt: 'index',    freq: 'monthly',   changeType: 'pct',  page: ['home','macro'], releaseId: 13,  color: '#f59e0b' },
  TCU:             { name: '產能利用率',           nameEn: 'Capacity Utilization',       units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['macro'],        releaseId: 13,  color: '#fbbf24' },
  HOUST:           { name: '新屋開工',             nameEn: 'Housing Starts',             units: '千棟(年化)',      fmt: 'thousands',freq: 'monthly',   changeType: 'pct',  page: ['macro','consumption'], releaseId: 234, color: '#a78bfa' },
  PERMIT:          { name: '建築許可',             nameEn: 'Building Permits',           units: '千棟(年化)',      fmt: 'thousands',freq: 'monthly',   changeType: 'pct',  page: ['macro'],        releaseId: 234, color: '#c4b5fd' },
  BOPGSTB:         { name: '貿易差額',             nameEn: 'Trade Balance',              units: '百萬美元',        fmt: 'millions', freq: 'monthly',   changeType: 'abs',  page: ['macro'],        releaseId: 51,  color: '#f87171' },
  SAHMREALTIME:    { name: 'Sahm 衰退指標',        nameEn: 'Sahm Rule Indicator',        units: '%',             fmt: 'pct2',     freq: 'monthly',   changeType: 'abs',  page: ['macro','stress'],releaseId: 50, color: '#ef4444' },

  // ---- Rates ----
  DFEDTARU:        { name: '聯邦基金利率目標上限', nameEn: 'Fed Funds Target Upper',     units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#ef4444' },
  FEDFUNDS:        { name: '聯邦基金有效利率',     nameEn: 'Fed Funds Effective Rate',   units: '%',             fmt: 'pct2',     freq: 'monthly',   changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#f87171' },
  DGS1:            { name: '1年期國債殖利率',      nameEn: '1-Year Treasury Yield',      units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#fbbf24' },
  DGS2:            { name: '2年期國債殖利率',      nameEn: '2-Year Treasury Yield',      units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#f59e0b' },
  DGS5:            { name: '5年期國債殖利率',      nameEn: '5-Year Treasury Yield',      units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#34d399' },
  DGS10:           { name: '10年期國債殖利率',     nameEn: '10-Year Treasury Yield',     units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['home','rates'], releaseId: 18,  color: '#10b981' },
  DGS30:           { name: '30年期國債殖利率',     nameEn: '30-Year Treasury Yield',     units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#059669' },
  MORTGAGE30US:    { name: '30年期固定房貸利率',   nameEn: '30-Year Mortgage Rate',      units: '%',             fmt: 'pct2',     freq: 'weekly',    changeType: 'abs',  page: ['rates'],        releaseId: 363, color: '#a78bfa' },
  PRIME:           { name: '最優惠貸款利率',       nameEn: 'Bank Prime Loan Rate',       units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#c4b5fd' },
  SOFR:            { name: 'SOFR 隔夜融資利率',   nameEn: 'SOFR',                       units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates'],        releaseId: 18,  color: '#60a5fa' },
  T10Y2Y:          { name: '10Y-2Y 利差',          nameEn: '10Y-2Y Spread',              units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates','stress'],releaseId: 18, color: '#22d3ee' },
  T10Y3M:          { name: '10Y-3M 利差',          nameEn: '10Y-3M Spread',              units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates','stress'],releaseId: 18, color: '#06b6d4' },
  T5YIE:           { name: '5年期盈虧平衡通膨',    nameEn: '5Y Breakeven Inflation',     units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates','inflation'], releaseId: 18, color: '#fb923c' },
  T10YIE:          { name: '10年期盈虧平衡通膨',   nameEn: '10Y Breakeven Inflation',    units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['rates','inflation'], releaseId: 18, color: '#f97316' },

  // ---- Inflation ----
  CPIAUCSL:        { name: 'CPI 整體',            nameEn: 'CPI All Items',              units: '指數(1982-84=100)', fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 10,  color: '#ef4444' },
  CPILFESL:        { name: '核心 CPI',            nameEn: 'Core CPI (ex. Food&Energy)', units: '指數(1982-84=100)', fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['home','inflation'], releaseId: 10, color: '#f87171' },
  PCEPI:           { name: 'PCE 整體',            nameEn: 'PCE Price Index',            units: '指數(2017=100)',    fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 54,  color: '#fb923c' },
  PCEPILFE:        { name: '核心 PCE',            nameEn: 'Core PCE (ex. Food&Energy)', units: '指數(2017=100)',    fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['home','inflation'], releaseId: 54, color: '#f97316' },
  PPIACO:          { name: 'PPI 整體',            nameEn: 'PPI All Commodities',        units: '指數(1982=100)',    fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['home','inflation'], releaseId: 31, color: '#fbbf24' },
  PPIFID:          { name: 'PPI 最終需求',        nameEn: 'PPI Final Demand',           units: '指數(Nov2009=100)', fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 31,  color: '#f59e0b' },
  CUSR0000SAH1:    { name: 'CPI 住房',            nameEn: 'CPI Shelter',                units: '指數',             fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 10,  color: '#a78bfa' },
  CPIUFDSL:        { name: 'CPI 食品',            nameEn: 'CPI Food',                   units: '指數',             fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 10,  color: '#34d399' },
  CPIENGSL:        { name: 'CPI 能源',            nameEn: 'CPI Energy',                 units: '指數',             fmt:'index',  freq: 'monthly',   changeType: 'yoy',  page: ['inflation'],    releaseId: 10,  color: '#22d3ee' },
  MICH:            { name: 'U of M 通膨預期(1Y)', nameEn: 'UMich Inflation Exp. 1Y',    units: '%',               fmt:'pct1',   freq: 'monthly',   changeType: 'abs',  page: ['inflation'],    releaseId: 144, color: '#f472b6' },

  // ---- Employment ----
  UNRATE:          { name: '失業率',              nameEn: 'Unemployment Rate',           units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 50,  color: '#ef4444' },
  U6RATE:          { name: 'U-6 廣義失業率',     nameEn: 'U-6 Underemployment Rate',    units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 50,  color: '#f87171' },
  PAYEMS:          { name: '非農就業人數(NFP)',   nameEn: 'Nonfarm Payrolls',            units: '千人',           fmt: 'thousands',freq: 'monthly',   changeType: 'chg',  page: ['home','employment'], releaseId: 50, color: '#3b82f6' },
  USPRIV:          { name: '私人部門就業',        nameEn: 'Private Payrolls',            units: '千人',           fmt: 'thousands',freq: 'monthly',   changeType: 'chg',  page: ['employment'],   releaseId: 50,  color: '#60a5fa' },
  CIVPART:         { name: '勞動力參與率',        nameEn: 'Labor Force Participation',   units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 50,  color: '#34d399' },
  ICSA:            { name: '初領失業救濟金',      nameEn: 'Initial Jobless Claims',      units: '千人',           fmt: 'thousands',freq: 'weekly',    changeType: 'abs',  page: ['home','employment'], releaseId: 167, color: '#f59e0b' },
  CCSA:            { name: '續領失業救濟金',      nameEn: 'Continued Claims',            units: '千人',           fmt: 'thousands',freq: 'weekly',    changeType: 'abs',  page: ['employment'],   releaseId: 167, color: '#fbbf24' },
  JTSJOL:          { name: 'JOLTS 職缺',          nameEn: 'JOLTS Job Openings',          units: '千個',           fmt: 'thousands',freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 192, color: '#a78bfa' },
  JTSQUR:          { name: 'JOLTS 離職率',        nameEn: 'JOLTS Quits Rate',            units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 192, color: '#c4b5fd' },
  CES0500000003:   { name: '平均時薪',            nameEn: 'Avg Hourly Earnings',         units: '美元/時',         fmt: 'dollar2',  freq: 'monthly',   changeType: 'yoy',  page: ['employment'],   releaseId: 50,  color: '#22d3ee' },
  AWHMAN:          { name: '製造業平均週工時',    nameEn: 'Avg Weekly Hours (Mfg)',      units: '小時',            fmt: 'num1',     freq: 'monthly',   changeType: 'abs',  page: ['employment'],   releaseId: 50,  color: '#06b6d4' },

  // ---- Monetary ----
  M1SL:            { name: 'M1 貨幣供給',         nameEn: 'M1 Money Stock',             units: '十億美元',        fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['monetary'],     releaseId: 21,  color: '#3b82f6' },
  M2SL:            { name: 'M2 貨幣供給',         nameEn: 'M2 Money Stock',             units: '十億美元',        fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['monetary'],     releaseId: 21,  color: '#60a5fa' },
  BOGMBASE:        { name: '貨幣基礎',             nameEn: 'Monetary Base',              units: '十億美元',        fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['monetary'],     releaseId: 21,  color: '#93c5fd' },
  WALCL:           { name: '聯準會資產負債表',     nameEn: 'Fed Total Assets',           units: '百萬美元',        fmt: 'millionsB',freq: 'weekly',    changeType: 'yoy',  page: ['monetary'],     releaseId: 20,  color: '#22d3ee' },
  DEXUSEU:         { name: 'EUR/USD',             nameEn: 'USD per EUR',                units: '美元/歐元',        fmt: 'fx4',      freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#34d399' },
  DEXJPUS:         { name: 'USD/JPY',             nameEn: 'Yen per USD',                units: '日圓/美元',        fmt: 'fx2',      freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#f59e0b' },
  DEXUSUK:         { name: 'GBP/USD',             nameEn: 'USD per GBP',                units: '美元/英鎊',        fmt: 'fx4',      freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#a78bfa' },
  DEXCHUS:         { name: 'USD/CNY',             nameEn: 'Yuan per USD',               units: '人民幣/美元',       fmt: 'fx4',      freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#f472b6' },
  DTWEXBGS:        { name: '美元指數(廣義)',       nameEn: 'USD Broad Index',            units: '指數(Jan2006=100)', fmt:'index',  freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#ef4444' },
  GOLDAMGBD228NLBM:{ name: '黃金現貨價格',        nameEn: 'Gold Price (London PM)',      units: '美元/英兩',        fmt: 'dollar0',  freq: 'daily',     changeType: 'pct',  page: ['monetary'],     releaseId: 16,  color: '#fbbf24' },

  // ---- Consumption ----
  RSAFS:           { name: '零售銷售',            nameEn: 'Retail Sales',               units: '百萬美元',        fmt: 'millions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 190, color: '#3b82f6' },
  RRSFS:           { name: '實質零售銷售',        nameEn: 'Real Retail Sales',          units: '百萬美元(2012)',   fmt: 'millions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 190, color: '#60a5fa' },
  PCE:             { name: '個人消費支出(PCE)',   nameEn: 'Personal Consumption Exp.',  units: '十億美元',        fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 54,  color: '#34d399' },
  PI:              { name: '個人收入',            nameEn: 'Personal Income',            units: '十億美元',        fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 54,  color: '#22d3ee' },
  DSPIC96:         { name: '實質可支配個人收入',  nameEn: 'Real Disposable Income',     units: '十億美元(2017)',   fmt: 'billions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 54,  color: '#06b6d4' },
  PSAVERT:         { name: '個人儲蓄率',          nameEn: 'Personal Saving Rate',       units: '%',             fmt: 'pct1',     freq: 'monthly',   changeType: 'abs',  page: ['consumption'],  releaseId: 54,  color: '#f59e0b' },
  UMCSENT:         { name: '密歇根大學消費者信心', nameEn: 'UMich Consumer Sentiment',  units: '指數',            fmt: 'index',    freq: 'monthly',   changeType: 'abs',  page: ['consumption'],  releaseId: 144, color: '#fbbf24' },
  TOTALSL:         { name: '消費者信貸總額',      nameEn: 'Consumer Credit Outstanding',units: '百萬美元',        fmt: 'millions', freq: 'monthly',   changeType: 'yoy',  page: ['consumption'],  releaseId: 26,  color: '#a78bfa' },
  EXHOSLUSM495S:   { name: '成屋銷售',            nameEn: 'Existing Home Sales',        units: '千棟(年化)',       fmt: 'thousands',freq: 'monthly',   changeType: 'pct',  page: ['consumption'],  releaseId: 456, color: '#f472b6' },
  HSN1F:           { name: '新屋銷售',            nameEn: 'New Home Sales',             units: '千棟(年化)',       fmt: 'thousands',freq: 'monthly',   changeType: 'pct',  page: ['consumption'],  releaseId: 336, color: '#fb923c' },
  TOTALSA:         { name: '汽車銷售',            nameEn: 'Total Vehicle Sales',        units: '百萬輛(年化)',     fmt: 'num1',     freq: 'monthly',   changeType: 'pct',  page: ['consumption'],  releaseId: 10,  color: '#f97316' },
  DRCCLACBS:       { name: '信用卡違約率',        nameEn: 'Credit Card Delinquency',    units: '%',             fmt: 'pct2',     freq: 'quarterly', changeType: 'abs',  page: ['consumption','stress'], releaseId: 83, color: '#ef4444' },

  // ---- Stress ----
  VIXCLS:          { name: 'VIX 恐慌指數',        nameEn: 'CBOE VIX',                   units: '指數',           fmt: 'num2',     freq: 'daily',     changeType: 'pct',  page: ['home','stress'], releaseId: 16,  color: '#ef4444' },
  STLFSI4:         { name: '聖路易Fed金融壓力指數',nameEn: 'St. Louis FSSI',             units: '指數',           fmt: 'num3',     freq: 'weekly',    changeType: 'abs',  page: ['stress'],        releaseId: 16,  color: '#f87171' },
  NFCI:            { name: '芝加哥Fed金融狀況指數',nameEn: 'Chicago Fed NFCI',           units: '指數',           fmt: 'num3',     freq: 'weekly',    changeType: 'abs',  page: ['stress'],        releaseId: 16,  color: '#fb923c' },
  KCFSI:           { name: '堪薩斯城Fed壓力指數', nameEn: 'Kansas City FSSI',           units: '指數',           fmt: 'num3',     freq: 'monthly',   changeType: 'abs',  page: ['stress'],        releaseId: 16,  color: '#f59e0b' },
  BAMLH0A0HYM2:    { name: '高收益債信用利差',    nameEn: 'HY Credit Spread (OAS)',      units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['stress'],        releaseId: 16,  color: '#a78bfa' },
  BAMLC0A0CM:      { name: '投資級債信用利差',    nameEn: 'IG Credit Spread (OAS)',      units: '%',             fmt: 'pct2',     freq: 'daily',     changeType: 'abs',  page: ['stress'],        releaseId: 16,  color: '#c4b5fd' },
  DRSFRMACBS:      { name: '房貸違約率',          nameEn: 'Mortgage Delinquency Rate',   units: '%',             fmt: 'pct2',     freq: 'quarterly', changeType: 'abs',  page: ['stress'],        releaseId: 83,  color: '#22d3ee' },
};

// ============================================================
// Page Definitions
// ============================================================
const PAGES = {
  home: {
    title: '戰情室總覽',
    titleEn: 'WAR ROOM OVERVIEW',
    icon: 'fas fa-tachometer-alt',
    theme: 'home',
    description: '美國核心經濟數據即時監控中心',
  },
  macro: {
    title: '總體經濟',
    titleEn: 'MACROECONOMICS',
    icon: 'fas fa-globe-americas',
    theme: 'macro',
    description: '產出、工業生產、貿易與房市全覽',
    series: ['GDPC1','A191RL1Q225SBEA','GDP','WEI','INDPRO','TCU','HOUST','PERMIT','BOPGSTB','SAHMREALTIME'],
  },
  rates: {
    title: '利率',
    titleEn: 'INTEREST RATES',
    icon: 'fas fa-percentage',
    theme: 'rates',
    description: '聯邦基金利率、國債殖利率曲線及利差監控',
    series: ['DFEDTARU','FEDFUNDS','DGS1','DGS2','DGS5','DGS10','DGS30','MORTGAGE30US','PRIME','SOFR','T10Y2Y','T10Y3M','T5YIE','T10YIE'],
  },
  inflation: {
    title: '通膨',
    titleEn: 'INFLATION',
    icon: 'fas fa-fire',
    theme: 'inflation',
    description: 'CPI、PCE、PPI 及通膨預期全面追蹤',
    series: ['CPIAUCSL','CPILFESL','CUSR0000SAH1','CPIUFDSL','CPIENGSL','PCEPI','PCEPILFE','PPIACO','PPIFID','MICH','T5YIE','T10YIE'],
  },
  employment: {
    title: '就業',
    titleEn: 'EMPLOYMENT',
    icon: 'fas fa-briefcase',
    theme: 'employment',
    description: 'NFP、失業率、JOLTS 及薪資數據監控',
    series: ['UNRATE','U6RATE','PAYEMS','USPRIV','CIVPART','ICSA','CCSA','JTSJOL','JTSQUR','CES0500000003','AWHMAN','SAHMREALTIME'],
  },
  monetary: {
    title: '貨幣',
    titleEn: 'MONETARY',
    icon: 'fas fa-dollar-sign',
    theme: 'monetary',
    description: '貨幣供給、聯準會資產負債表及匯率監控',
    series: ['M1SL','M2SL','BOGMBASE','WALCL','DEXUSEU','DEXJPUS','DEXUSUK','DEXCHUS','DTWEXBGS','GOLDAMGBD228NLBM'],
  },
  consumption: {
    title: '消費',
    titleEn: 'CONSUMPTION',
    icon: 'fas fa-shopping-cart',
    theme: 'consumption',
    description: '零售銷售、消費信心、房市及信貸數據',
    series: ['RSAFS','RRSFS','PCE','PI','DSPIC96','PSAVERT','UMCSENT','TOTALSL','EXHOSLUSM495S','HSN1F','TOTALSA','DRCCLACBS'],
  },
  stress: {
    title: '壓力',
    titleEn: 'STRESS INDICATORS',
    icon: 'fas fa-heartbeat',
    theme: 'stress',
    description: 'VIX、金融壓力指數、信用利差及殖利率曲線',
    series: ['VIXCLS','STLFSI4','NFCI','KCFSI','BAMLH0A0HYM2','BAMLC0A0CM','T10Y2Y','T10Y3M','DRCCLACBS','DRSFRMACBS','SAHMREALTIME'],
  },
};

// ============================================================
// Home page key metrics (with category grouping)
// ============================================================
const HOME_METRICS = [
  { category: '📊 產出', seriesIds: ['GDPC1','WEI','INDPRO'] },
  { category: '🔥 物價', seriesIds: ['CPILFESL','PCEPILFE','PPIACO'] },
  { category: '📈 利率', seriesIds: ['DGS10'] },
  { category: '💼 就業', seriesIds: ['PAYEMS','ICSA'] },
  { category: '⚡ 市場', seriesIds: ['VIXCLS'] },
];

// Important FRED release IDs mapped to Chinese names
const RELEASE_NAMES = {
  10:  { zh: '消費者物價指數 (CPI)',    en: 'CPI',                  importance: 'high' },
  13:  { zh: '工業生產與產能利用率',   en: 'Ind. Production',       importance: 'high' },
  18:  { zh: '聯邦公開市場委員會',     en: 'FOMC',                  importance: 'high' },
  21:  { zh: '國內生產毛額 (GDP)',     en: 'GDP',                   importance: 'high' },
  31:  { zh: '生產者物價指數 (PPI)',   en: 'PPI',                   importance: 'high' },
  50:  { zh: '就業情況報告 (NFP)',     en: 'Employment Situation',  importance: 'high' },
  51:  { zh: '國際貿易差額',           en: 'Trade Balance',         importance: 'medium' },
  54:  { zh: '個人收入與消費支出',     en: 'Personal Income & PCE', importance: 'high' },
  83:  { zh: '消費者信貸',             en: 'Consumer Credit',       importance: 'medium' },
  144: { zh: '密歇根大學消費者信心',   en: 'UMich Sentiment',       importance: 'medium' },
  167: { zh: '申請失業救濟金',         en: 'Jobless Claims',        importance: 'high' },
  175: { zh: '週度經濟指數 (WEI)',     en: 'WEI',                   importance: 'low' },
  190: { zh: '零售銷售',               en: 'Retail Sales',          importance: 'high' },
  192: { zh: 'JOLTS 職缺調查',         en: 'JOLTS',                 importance: 'high' },
  234: { zh: '住宅建設',               en: 'Housing Starts',        importance: 'medium' },
  336: { zh: '新屋銷售',               en: 'New Home Sales',        importance: 'medium' },
  363: { zh: '房貸利率調查',           en: 'Mortgage Rates',        importance: 'low' },
  456: { zh: '成屋銷售',               en: 'Existing Home Sales',   importance: 'medium' },
};
