const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const CLIENT_ID = 100067;
const CLIENT_SECRET = "2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3";
const BASE = "https://ffmconnect.live.gop.garenanow.com";
const REGISTER_URL = `${BASE}/api/v2/oauth/guest:register`;
const GRANT_URL = `${BASE}/api/v2/oauth/guest/token:grant`;
const MAJOR_REGISTER_URL = "https://loginbp.ppmainecoonghj.com/MajorRegister";
const MAJOR_LOGIN_URL = "https://loginbp.ppmainecoonghj.com/MajorLogin";
const CHOOSE_REGION_URL = "https://loginbp.ggblueshark.com/ChooseRegion";

const AES_KEY = Buffer.from([89, 103, 38, 116, 99, 37, 68, 69, 117, 104, 54, 37, 90, 99, 94, 56]);
const AES_IV = Buffer.from([54, 111, 121, 90, 68, 114, 50, 50, 69, 51, 121, 99, 104, 106, 77, 37]);

const EXTRA_FIELD_22_B64 = "R0dSRQEBAQBWAgAArhbVZtbNkM+QIEGH/9prP/niipobXnjyW+abgEZRdSRIo5NSlyT4YCawjMYlLZG7tUtHgdZug9v7tlCTE4epGXkQWJ5SaPhsEpCCtOZyJt77sLfw3+tOCk1b0oCRc6GRAFHvhjBjGXVT66A+FZLeitrOTHRtq2zN5RVcDx7/WNn5yduS95cjmLWUtB65w71ALDSQjktZQzdHvdv3SLBCZYxQCIIctzRQH43gSjbxuGr1kMkpIvXkJ0DSuotLmlMzrAlrH9jn3Ip5k6TYyfN7KQvJVhhZZFZcIvlbxhgYUEVjh6KYTEyjxoXl0Tu1cFv/SyKo28Hc5/TmKvORsLsi4OUq9ZFJnLE6SemwH8EVAXPIyaR+ab3vPpg6drd+MSygg2nXoYxgqQO/BgmHPgPltbUYhWsWrjdpmaYB2VVRV/ZTpogdbRsA2tv5NJK4oMNI32VnPG6mHyBrSMbDERlfC9Srz6zkzIAZU0Ze8GBTlQO7ySsSMmMn1wNMUezTbGPmXCJkSVSKYthMAXnSalPzbtWKOd/571i/u2NZ9uvM5ACdn8fz/tXZGn0rTeXbgyNqPvCkxMZfYlz1yrFo98bxHReis9ExqSqG50mPAzaeF5hBJHOvlPBLv/X4LQF+zfSugzo4LVgMMVI+/LOnDb4cdm++iRdLFfmuv1dzm1o0ROJvlIlyo3dkXE3uX4Fs26vI9WpsmPDtALGn7MSLlZSjtMwtMUY4GPs7b3BQZrYZKgHs5HeiumN6yjSLUNzL7A0O/ivdLw04mOCCWN4z7Pc5MSmnQz0uLa4xyc85h1CwxPY1MpM97X4EEv4YprctJGAe2hMv1GtetJ2eabEUJNE=";

const PORT = process.env.PORT || 3000;
const OUTPUT_FILE = path.join(__dirname, 'accs.json');
const LEGACY_OUTPUT_FILE = path.join(__dirname, 'output.txt');
const VALID_REGIONS = ['IND', 'BR', 'SG', 'ID', 'TH', 'VN', 'MY', 'PH', 'MX', 'US'];
const DEFAULT_REGION = 'IND';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function getRandomUserAgent() {
  const versions = ['4.0.18P6', '4.0.19P7', '4.0.20P1', '4.1.0P3'];
  const models = ['G011A', 'G012B', 'SM-G973F', 'Pixel 3', 'Redmi Note 8'];
  const androidVersions = ['8.1', '9', '10', '11', '12'];
  const languages = ['en', 'en-US', 'id', 'es', 'pt-BR'];
  const countries = ['USA', 'IND', 'IDN', 'BRA', 'MEX'];
  return `GarenaMSDK/${pick(versions)}(${pick(models)} ;Android ${pick(androidVersions)};${pick(languages)};${pick(countries)};app 1.126.2 2019120816;)`;
}

const randomPassword = () => crypto.randomBytes(32).toString('hex').toUpperCase();
const randomDeviceId = () => `02-${crypto.randomUUID()}`;
const randomUsername = () => `V-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const DATADOME_COOKIES = [
  "datadome=d9oHgUqjPDjp9zn0xyOUihzGF1ze4gPUeLaT46xJLH4hgfQEI4Lyf0t4ET1_19PVbNa0azwG9KeCdTcPbrpXLhrRiYl~aX3R7DD_GIocARE_4cVunoWwMNZIF~kheXB6",
];
const pickCookie = () => pick(DATADOME_COOKIES);

async function postJSON(url, bodyObj, extraHeaders = {}) {
  const body = JSON.stringify(bodyObj);
  const signature = crypto.createHmac('sha256', CLIENT_SECRET).update(body).digest('hex');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Authorization': `Signature ${signature}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': getRandomUserAgent(),
      ...extraHeaders,
    },
    body,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, text, json };
}

const CHAR_MAP = { a: 81, b: 82, c: 83, d: 84, e: 85, f: 86 };

function genPlatformInfo(openId) {
  if (openId.length !== 32) throw new Error("open_id must be 32 chars");
  const out = new Array(32);
  for (let i = 0; i < 32; i++) {
    const ch = openId[i];
    const lower = ch.toLowerCase();
    const isDigit = ch >= '0' && ch <= '9';
    const isChar = lower in CHAR_MAP;
    if (!isDigit && !isChar) throw new Error(`bad char '${ch}'`);
    const base = isChar ? CHAR_MAP[lower] : ch.charCodeAt(0) - 48;
    out[i] = applyIndexLogic(i, base, lower, isChar);
  }
  return out;
}

function applyIndexLogic(index, base, ch, isChar) {
  const d = isChar ? -1 : (ch.charCodeAt(0) - 48);

  switch (index) {
    case 3: case 12: case 21: case 30:
      if (isChar) return 'ade'.includes(ch) ? base + 2 : base - 2;
      return [0, 1, 4, 5, 8, 9].includes(d) ? base + 2 : base - 2;

    case 5: case 14: case 23:
      if (isChar) return 'bdf'.includes(ch) ? base + 1 : base - 1;
      return d % 2 === 0 ? base + 1 : base - 1;

    case 6: case 15: case 24:
      if (isChar) {
        return { a: base + 5, b: base + 3, c: base + 1, d: base - 1, e: base - 3, f: base - 5 }[ch];
      }
      return [base + 7, base + 5, base + 3, base + 1, base - 1, base - 3, base - 5, base - 7, base + 7, base + 5][d];

    default:
      return base;
  }
}

function varint(n) {
  const out = [];
  while (n > 0x7f) { out.push((n & 0x7f) | 0x80); n >>>= 7; }
  out.push(n);
  return Buffer.from(out);
}

function tag(field, wire) { return varint((field << 3) | wire); }

function fieldString(field, str) {
  const b = Buffer.isBuffer(str) ? str : Buffer.from(str, 'latin1');
  return Buffer.concat([tag(field, 2), varint(b.length), b]);
}

function fieldVarint(field, val) {
  return Buffer.concat([tag(field, 0), varint(val)]);
}

function buildRegisterProto({ username, accessToken, openId, platformBytes, extraField22 }) {
  const fields = [
    fieldString(1, username),
    fieldString(2, accessToken),
    fieldString(3, openId),
    fieldVarint(5, 102000007),
    fieldVarint(6, 4),
    fieldVarint(7, 1),
    fieldVarint(13, 1),
    fieldString(14, platformBytes),
    fieldString(15, "en"),
    fieldVarint(16, 1),
  ];

  if (extraField22) {
    const bytes22 = Buffer.isBuffer(extraField22)
      ? extraField22
      : Buffer.from(extraField22, 'base64');
    fields.push(fieldString(22, bytes22));
  }

  return Buffer.concat(fields);
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function buildLoginProto({ openId, accessToken, platform }) {
  return Buffer.concat([
    fieldString(3, nowStr()),
    fieldString(4, 'free fire'),
    fieldVarint(5, 1),
    fieldString(7, '2.133.6'),
    fieldString(8, 'Android OS 9 / API-28 (PQ3A.190605.06171433/3793265)'),
    fieldString(9, 'Handheld'),
    fieldString(10, 'Vodafone IN'),
    fieldString(11, 'WIFI'),
    fieldVarint(12, 1334),
    fieldVarint(13, 750),
    fieldString(14, '240'),
    fieldString(15, 'x86-64 SSE3 SSE4.1 SSE4.2 AVX | 2865 | 6'),
    fieldVarint(16, 5955),
    fieldString(17, 'Adreno (TM) 750'),
    fieldString(18, 'OpenGL ES 3.1 v1'),
    fieldString(19, 'Google|13b00015-be2c-4599-a9c3-f364dbc5b348'),
    fieldString(20, '49.47.131.246'),
    fieldString(21, 'en'),
    fieldString(22, openId),
    fieldString(23, String(platform)),
    fieldString(24, 'Handheld'),
    fieldString(25, 'samsung SM-N960N'),
    fieldString(26, 'IND'),
    fieldString(29, accessToken),
    fieldVarint(30, 1),
    fieldString(41, 'Vodafone IN'),
    fieldString(42, 'WIFI'),
    fieldString(57, '1ac4b80ecf0478a44203bf8fac6120f5'),
    fieldVarint(60, 59938),
    fieldVarint(61, 54945),
    fieldVarint(62, 2519),
    fieldVarint(63, 732),
    fieldVarint(64, 27619),
    fieldVarint(65, 32203),
    fieldVarint(66, 57547),
    fieldVarint(67, 59938),
    fieldVarint(73, 1),
    fieldString(74, '/data/app/com.dts.freefiremax-vD0gmtKATM0lunfrN5TyJA==/lib/arm64'),
    fieldVarint(76, 2),
    fieldString(77, '38f4751a330688ab124c2c804cec90a5|/data/app/com.dts.freefiremax-vD0gmtKATM0lunfrN5TyJA==/base.apk'),
    fieldVarint(78, 2),
    fieldVarint(79, 2),
    fieldString(81, '64'),
    fieldString(83, '2019118527'),
    fieldVarint(85, 3),
    fieldString(86, 'OpenGLES3'),
    fieldVarint(87, 4095),
    fieldVarint(88, 11),
    fieldVarint(92, 13895),
    fieldString(93, 'android_max'),
    fieldString(94, 'KqsHTyt8jUJJdrZMarDAGYXlupZQ+rKU5u8cxDL5+VzLeY3RkRHhKNoF/l2CZwJvS77m9S78T4Hygk1LMztOhafXWhgF1Un/nFGGIv7Xks8246WL'),
    fieldVarint(95, 111207),
    fieldString(96, '{"cur_rate":null,"support_etc2":true}'),
    fieldVarint(97, 1),
    fieldVarint(98, 1),
    fieldString(99, String(platform)),
    fieldString(100, String(platform)),
    fieldString(102, ''),
    fieldVarint(104, 71081),
    fieldVarint(105, 1),
    fieldString(106, 'https://dl-tata.freefireind.in/live/ABHotUpdates/|https://core-tata.freefireind.in/live/ABHotUpdates/|211c933168f55902c7dfbfd8c4e2957d'),
    fieldString(107, 'c8e41b7a93f02d56e1a94c7b8203f5d1'),
  ]);
}

function buildChooseRegionProto(region) {
  return fieldString(1, region);
}

function encrypt(plaintext) {
  const padLen = 16 - (plaintext.length % 16);
  const padded = Buffer.concat([plaintext, Buffer.alloc(padLen, padLen)]);
  const cipher = crypto.createCipheriv('aes-128-cbc', AES_KEY, AES_IV);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(padded), cipher.final()]);
}

async function majorRegister({ accessToken, openId, username, platformBytes, extraField22 }) {
  const ciphertext = encrypt(buildRegisterProto({
    username,
    accessToken,
    openId,
    platformBytes,
    extraField22,
  }));

  const res = await fetch(MAJOR_REGISTER_URL, {
    method: 'POST',
    headers: {
      'User-Agent': "Dalvik/2.1.0 (Linux; U; Android 13; SM-M526B Build/TP1A.220624.014)",
      'Accept-Encoding': "gzip",
      'X-GA-SV': '1789569019',
      'Content-Type': "application/octet-stream",
      'X-Unity-Version': "2018.4.11f1",
      'X-GA': "v1 1",
      'ReleaseVersion': "OB55",
    },
    body: ciphertext,
  });

  return { status: res.status, text: await res.text() };
}

async function majorLogin({ openId, accessToken, platform = 4 }) {
  const ciphertext = encrypt(buildLoginProto({ openId, accessToken, platform }));

  const res = await fetch(MAJOR_LOGIN_URL, {
    method: 'POST',
    headers: {
      'X-Unity-Version': '2018.4.11f1',
      'ReleaseVersion': 'OB55',
      'X-GA-SV': '1789569019',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-GA': 'v1 1',
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 7.1.2; ASUS_Z01QD Build/QKQ1.190825.002)',
      'Accept-Encoding': 'gzip',
    },
    body: ciphertext,
  });

  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf };
}

async function chooseRegion({ jwt, region }) {
  const ciphertext = encrypt(buildChooseRegionProto(region));

  const res = await fetch(CHOOSE_REGION_URL, {
    method: 'POST',
    headers: {
      'User-Agent': "Dalvik/2.1.0 (Linux; U; Android 13; SM-M526B Build/TP1A.220624.014)",
      'Authorization': `Bearer ${jwt}`,
      'Accept-Encoding': "gzip",
      'Content-Type': "application/octet-stream",
      'X-Unity-Version': "2018.4.11f1",
      'X-GA': "v1 1",
      'ReleaseVersion': "OB55",
    },
    body: ciphertext,
  });

  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf };
}

async function getLoginData({ endpoint, openId, accessToken, jwt, platform = 4 }) {
  const ciphertext = encrypt(buildLoginProto({ openId, accessToken, platform }));

  const res = await fetch(`${endpoint}/GetLoginData`, {
    method: 'POST',
    headers: {
      'User-Agent': "Dalvik/2.1.0 (Linux; U; Android 13; SM-M526B Build/TP1A.220624.014)",
      'Authorization': `Bearer ${jwt}`,
      'Accept-Encoding': "gzip",
      'Content-Type': "application/octet-stream",
      'X-Unity-Version': "2018.4.11f1",
      'X-GA': "v1 1",
      'ReleaseVersion': "OB55",
    },
    body: ciphertext,
  });

  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buf };
}

function readVarint(buf, pos) {
  let result = 0n;
  let shift = 0n;
  let byte;
  do {
    byte = buf[pos++];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
  } while (byte & 0x80);

  return result <= BigInt(Number.MAX_SAFE_INTEGER)
    ? [Number(result), pos]
    : [result, pos];
}

function decodeProto(buf) {
  const out = {};
  let pos = 0;
  while (pos < buf.length) {
    let key;
    [key, pos] = readVarint(buf, pos);
    const keyNum = Number(key);
    const field = keyNum >>> 3;
    const wire = keyNum & 0x7;

    if (wire === 0) {
      let val;
      [val, pos] = readVarint(buf, pos);
      out[field] = val;
    } else if (wire === 2) {
      let len;
      [len, pos] = readVarint(buf, pos);
      const lenN = Number(len);
      const slice = buf.subarray(pos, pos + lenN);
      pos += lenN;

      const asString = slice.toString('utf8');
      const looksText = /^[\x20-\x7e]*$/.test(asString);

      let nested = null;
      if (!looksText && slice.length > 0 && slice.length < 200) {
        try { nested = decodeProto(slice); } catch { nested = null; }
      }

      if (nested && Object.keys(nested).length > 0) {
        out[field] = nested;
      } else {
        out[field] = asString;
      }
    } else if (wire === 5) {
      out[field] = buf.readUInt32LE(pos); pos += 4;
    } else if (wire === 1) {
      out[field] = buf.readBigUInt64LE(pos).toString(); pos += 8;
    } else {
      break;
    }
  }
  return out;
}

function parseLoginResponse(buf) {
  if (buf.length <= 64) return { raw: buf.toString('hex') };
  const body = buf.subarray(64);
  try {
    return { json: decodeProto(body) };
  } catch (e) {
    return { raw: buf.toString('hex'), error: e.message };
  }
}

function decodeJwt(jwt) {
  const [, payload] = jwt.split('.');
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
                        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function nowIsoIst() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return d.toISOString().replace('Z', ' IST');
}

function endpointFor(serverRegion) {
  if (serverRegion === 'IND') {
    return "https://client.ind.freefiremobile.com";
  } else if (['BR', 'US', 'SAC', 'NA'].includes(serverRegion)) {
    return "https://client.us.freefiremobile.com";
  } else {
    return "https://clientbp.ggblueshark.com";
  }
}

async function generateFull(region) {
  const t0 = Date.now();

  const registerUrl = region === 'IND'
    ? REGISTER_URL
    : `${REGISTER_URL}?region=${region}`;

  const password = randomPassword();
  const reg = await postJSON(registerUrl, {
    app_id: CLIENT_ID, client_type: 2, password, source: 2,
  });
  if (!reg.json || reg.json.code !== 0 || !reg.json.data?.uid) {
    return { success: false, stage: 'register', response: reg.json ?? reg.text };
  }

  const uid = reg.json.data.uid;
  const deviceId = randomDeviceId();

  const grant = await postJSON(GRANT_URL, {
    client_id: CLIENT_ID, client_secret: CLIENT_SECRET, client_type: 2,
    device_id: deviceId, password, response_type: "token", uid,
  }, {
    'Cookie': pickCookie(),
  });
  const gdata = grant.json?.data ?? grant.json ?? {};
  const accessToken = gdata.access_token;
  const openId = gdata.open_id;
  if (!accessToken || !openId) {
    return { success: false, stage: 'grant', response: grant.json ?? grant.text };
  }

  const username = randomUsername();
  const platformBytes = Buffer.from(genPlatformInfo(openId));

  const extraField22 = Buffer.from(EXTRA_FIELD_22_B64, 'base64');

  const major = await majorRegister({
    accessToken,
    openId,
    username,
    platformBytes,
    extraField22,
  });
  if (major.status !== 200) {
    return { success: false, stage: 'majorRegister', response: major.text };
  }

  const login = await majorLogin({ openId, accessToken, platform: 4 });
  const parsed = parseLoginResponse(login.buf);
  if (!parsed.json) {
    return { success: false, stage: 'majorLogin', response: parsed.raw };
  }

  let jwt = parsed.json[8];
  let accountId = parsed.json[1];
  let serverRegion = region;

  if (jwt) {
    try {
      const decoded = decodeJwt(jwt);
      accountId = decoded.account_id;
      serverRegion = decoded.noti_region || decoded.country_code || region;
    } catch { /* ignore */ }
  }

  await chooseRegion({ jwt, region });

  const login2 = await majorLogin({ openId, accessToken, platform: 4 });
  const parsed2 = parseLoginResponse(login2.buf);
  if (parsed2.json && parsed2.json[8]) {
    jwt = parsed2.json[8];
    if (parsed2.json[1]) accountId = parsed2.json[1];
    if (jwt) {
      try {
        const decoded = decodeJwt(jwt);
        accountId = decoded.account_id;
        serverRegion = decoded.noti_region || decoded.country_code || serverRegion;
      } catch { /* ignore */ }
    }
  }

  const endpoint = parsed2.json?.[10] || endpointFor(serverRegion);

  await getLoginData({ endpoint, openId, accessToken, jwt, platform: 4 });

  const duration = Number(((Date.now() - t0) / 1000).toFixed(2));

  return {
    success: true,
    nickname: username,
    account_id: String(accountId),
    uid: String(uid),
    password,
    access_token: accessToken,
    registration_time: nowIsoIst(),
    duration_seconds: duration,
    region: serverRegion,
    token: jwt,
  };
}

function loadAccounts() {
  const accounts = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.assign(accounts, parsed);
      }
    } catch { /* rewrite on next save */ }
  }
  if (fs.existsSync(LEGACY_OUTPUT_FILE)) {
    for (const row of fs.readFileSync(LEGACY_OUTPUT_FILE, 'utf8').split(/\r?\n/)) {
      const line = row.trim();
      if (!line) continue;
      const splitAt = line.indexOf(':');
      if (splitAt <= 0) continue;
      const uid = line.slice(0, splitAt);
      const password = line.slice(splitAt + 1);
      if (uid && password && accounts[uid] == null) accounts[uid] = password;
    }
  }
  return accounts;
}

function writeAccounts(accounts) {
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(accounts, null, 2)}\n`);
}

function saveOutput(obj) {
  if (!obj.success || !obj.uid || !obj.password) return;
  const accounts = loadAccounts();
  accounts[String(obj.uid)] = String(obj.password);
  writeAccounts(accounts);
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJSON(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJSON(res, 200, { status: 'ok', uptime: process.uptime() });
  }

  const isRegister =
    url.pathname === '/api/v2/guest:register' &&
    (req.method === 'GET' || req.method === 'POST');

  if (!isRegister) {
    return sendJSON(res, 404, { success: false, error: 'Not found' });
  }

  const body = req.method === 'POST' ? await readBody(req) : {};
  const rawRegion = url.searchParams.get('region') || body.region || DEFAULT_REGION;
  const region = String(rawRegion).toUpperCase();

  if (!VALID_REGIONS.includes(region)) {
    return sendJSON(res, 400, {
      success: false,
      error: `Invalid region '${rawRegion}'. Valid: ${VALID_REGIONS.join(', ')}`,
    });
  }

  try {
    const result = await generateFull(region);
    saveOutput(result);
    return sendJSON(res, result.success ? 200 : 502, result);
  } catch (e) {
    return sendJSON(res, 500, { success: false, error: e.message });
  }
});

const INTERVAL_MS = 10000;
const ERROR_DELAY_MIN_MS = 10000;
const ERROR_DELAY_MAX_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorDelayMs() {
  const span = ERROR_DELAY_MAX_MS - ERROR_DELAY_MIN_MS;
  return ERROR_DELAY_MIN_MS + Math.floor(Math.random() * (span + 1));
}

function countOutputIds() {
  return Object.keys(loadAccounts()).length;
}

function clock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function line(label, value) {
  return `  ${String(label).padEnd(12)} ${value}`;
}

function formatResult(n, json) {
  const head = `[${clock()}] #${n}`;
  if (json.success) {
    return [
      `${head}  OK`,
      line('uid', json.uid),
      line('password', json.password),
      line('nickname', json.nickname),
      line('account_id', json.account_id),
      line('region', json.region),
      line('took', `${json.duration_seconds}s`),
      line('saved', `${countOutputIds()} ids`),
    ].join('\n');
  }
  const err = json.response?.error || json.error || 'failed';
  const code = json.response?.code != null ? ` (${json.response.code})` : '';
  return [
    `${head}  FAIL  ${json.stage || 'request'}`,
    line('error', `${err}${code}`),
  ].join('\n');
}

function printResult(n, json) {
  console.log(formatResult(n, json));
  console.log('');
}

let onResult = null;
function setResultHandler(fn) {
  onResult = fn;
}

async function pollRegister(region) {
  const url = `http://127.0.0.1:${PORT}/api/v2/guest:register?region=${region}`;
  let n = 0;
  while (true) {
    const started = Date.now();
    n += 1;
    let failed = false;
    let json;
    try {
      const res = await fetch(url);
      json = await res.json();
      printResult(n, json);
      failed = !json.success;
    } catch (e) {
      json = { success: false, error: e.message };
      printResult(n, json);
      failed = true;
    }
    let retryMs = 0;
    if (failed) {
      retryMs = errorDelayMs();
      console.log(line('retry', `in ${Math.round(retryMs / 1000)}s`));
    }
    if (onResult) {
      Promise.resolve(onResult({ n, json, retryMs })).catch((e) => {
        console.log(line('telegram', e.message));
      });
    }
    if (failed) {
      await sleep(retryMs);
      continue;
    }
    const wait = INTERVAL_MS - (Date.now() - started);
    if (wait > 0) await sleep(wait);
  }
}

function start(regionArg) {
  require('./telegram.js').attach({
    setResultHandler,
    formatResult,
    line,
    sleep,
  });
  server.on('error', (e) => {
    console.log(e.message);
    process.exit(1);
  });
  server.listen(PORT, () => {
    const rawRegion = regionArg || process.argv[2] || DEFAULT_REGION;
    const region = String(rawRegion).toUpperCase();
    const useRegion = VALID_REGIONS.includes(region) ? region : DEFAULT_REGION;
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`1 id every 10s  |  error wait 10-20s  |  region ${useRegion}  |  ${OUTPUT_FILE}`);
    console.log('');
    pollRegister(useRegion);
  });
}

module.exports = {
  generateFull,
  saveOutput,
  countOutputIds,
  sleep,
  errorDelayMs,
  formatResult,
  setResultHandler,
  line,
  start,
  INTERVAL_MS,
  VALID_REGIONS,
  DEFAULT_REGION,
};

if (require.main === module) start();
