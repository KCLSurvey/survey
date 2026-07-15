'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PROXY_VERSION = '2.4.0';
const { normalizeActions } = require('./action-normalizer-v2');

function loadDotEnv(file = path.join(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const pos = text.indexOf('=');
    if (pos < 1) continue;
    const key = text.slice(0, pos).trim();
    let value = text.slice(pos + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const PROVIDER = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase();
const MODEL = process.env.AI_MODEL || (PROVIDER === 'openai' ? 'gpt-4.1' : 'z-ai/glm-5.2');
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGIN || 'https://kclsurvey.github.io,http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(x => x.trim().replace(/\/$/, '')).filter(Boolean);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 25000000);
const MAX_REQUESTS_PER_MINUTE = Number(process.env.MAX_REQUESTS_PER_MINUTE || 30);
const buckets = new Map();

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/$/, '');
}
function isAllowedOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  return !normalized || normalized === 'null' || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(normalized);
}
function corsHeaders(origin) {
  const normalized = normalizeOrigin(origin);
  const allow = ALLOWED_ORIGINS.includes('*') ? '*' : ((normalized === 'null' || isAllowedOrigin(normalized)) ? (normalized || ALLOWED_ORIGINS[0]) : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}
function sendJson(res, status, body, origin = '') {
  if (res.writableEnded || res.destroyed) return;
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length });
  res.end(data);
}
function rateAllowed(ip) {
  const now = Date.now();
  const item = buckets.get(ip);
  if (!item || now - item.started >= 60000) {
    buckets.set(ip, { started: now, count: 1 });
    return true;
  }
  item.count += 1;
  return item.count <= MAX_REQUESTS_PER_MINUTE;
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error(`Request body is too large: ${size} bytes; limit ${MAX_BODY_BYTES}`), { statusCode: 413, bodyBytes: size }));
        return;
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        Object.defineProperty(body, '__bodyBytes', { value: size, enumerable: false });
        resolve(body);
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400, bodyBytes: size }));
      }
    });
    req.on('error', reject);
  });
}

const actionTypes = ['none','set_input','set_param','set_global','set_product','set_channel','set_expense','set_sku','set_cash'];
const instructions = `Ты — AI-консультант внутри калькуляторов маржи v9.1 и бизнес-модели v10.1.
Отвечай по-русски, простыми словами и только на основании snapshot калькулятора.
Проверь все разделы snapshot: продукты/SKU, каналы, расходы, налоги, кэш, P&L, денежный поток, price decision, предупреждения и итоговые показатели.
Не придумывай отсутствующие расходы, рыночные цены, законы или факты.
Если вопрос о показателе, используй разделы: Что это; Текущий показатель; Как рассчитывается; На что влияет; Что будет при ошибке или пропуске; Как использовать; Где найти.
Если вопрос об общей выгодности или целевой цене, используй разделы: Главный вывод; Текущий результат; Расчёт целевого результата; Рекомендуемая РРЦ; Почему такой вывод; Риски и недостающие данные; Что делать.
Если пользователь просит подобрать РРЦ под заданную прибыль или сумму собственнику, рассчитай диапазон и центральный ориентир по данным snapshot.
Всегда различай Gross profit, Net profit, Free cash flow и деньги, потенциально доступные собственнику.
Не называй рассчитанную цену рыночной без рыночных данных.
Предпочтительно верни JSON {"answer":"полный ответ","warnings":[],"actions":[]}. Каждое действие должно содержать type, target, field и value_text. Для изменения статуса расхода используй, например: {"type":"set_expense","target":"customs_cert","field":"status","value_text":"include"}. Не возвращай действие без поля или нового значения.
Если JSON мешает сформировать ответ, верни обычный полный финальный текст. Не выводи внутренние рассуждения.`;

function stripFence(text) {
  return String(text || '').trim().replace(/^```(?:json|text|javascript|js)?\s*/i, '').replace(/\s*```$/i, '').trim();
}
function safeParseResult(text, allowActions, snapshot) {
  const cleaned = stripFence(text);
  if (!cleaned) throw new Error('Model returned no final text');
  let parsed = null;
  try { parsed = JSON.parse(cleaned); }
  catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch {}
    }
  }
  if (!parsed || typeof parsed !== 'object') return { answer: cleaned, warnings: [], actions: [] };
  const answer = String(parsed.answer || parsed.message || parsed.text || cleaned);
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String).slice(0, 20) : [];
  const actions = normalizeActions(parsed.actions, snapshot, allowActions);
  return { answer, warnings, actions };
}
function contentToText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(part => {
    if (typeof part === 'string') return part;
    return part?.text || part?.content || part?.value || '';
  }).join('\n').trim();
  if (content && typeof content === 'object') return String(content.text || content.content || content.value || '').trim();
  return '';
}
function extractOpenRouterFinalText(data) {
  const choice = data?.choices?.[0];
  const msg = choice?.message || {};
  const candidates = [contentToText(msg.content), contentToText(msg.final), contentToText(msg.answer), contentToText(choice?.text), contentToText(data?.output_text)];
  return candidates.find(x => x && x.trim()) || '';
}
async function openRouterRequest(messages, maxTokens = 8000) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://kclsurvey.github.io/survey/margin-calculators/',
      'X-OpenRouter-Title': 'Margin Calculators v9.1 and v10.1'
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.1, max_tokens: maxTokens })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { data = { error: { message: raw.slice(0, 1000) } }; }
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `OpenRouter API error ${response.status}`), { statusCode: response.status >= 500 ? 502 : 400 });
  return data;
}
async function callOpenRouter(question, snapshot, allowActions) {
  if (!OPENROUTER_API_KEY) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured'), { statusCode: 503 });
  const userPayload = JSON.stringify({ question, allowActions, snapshot });
  const first = await openRouterRequest([{ role: 'system', content: instructions }, { role: 'user', content: userPayload }], 8000);
  let text = extractOpenRouterFinalText(first);
  if (!text) {
    console.warn(new Date().toISOString(), 'Empty final content from model; retrying', {
      finish_reason: first?.choices?.[0]?.finish_reason || null,
      native_finish_reason: first?.choices?.[0]?.native_finish_reason || null,
      has_reasoning: Boolean(first?.choices?.[0]?.message?.reasoning || first?.choices?.[0]?.message?.reasoning_details)
    });
    const retry = await openRouterRequest([
      { role: 'system', content: instructions + '\nВерни только финальный полезный ответ обычным текстом. Не используй JSON и не показывай внутренние рассуждения.' },
      { role: 'user', content: userPayload }
    ], 10000);
    text = extractOpenRouterFinalText(retry);
  }
  if (!text) throw Object.assign(new Error('GLM-5.2 returned no final answer after retry'), { statusCode: 502 });
  return safeParseResult(text, allowActions, snapshot);
}
async function callOpenAI(question, snapshot, allowActions) {
  if (!OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { statusCode: 503 });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, store: false, instructions, input: JSON.stringify({ question, allowActions, snapshot }), max_output_tokens: 5000 })
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { error: { message: raw.slice(0, 1000) } }; }
  if (!response.ok) throw Object.assign(new Error(data?.error?.message || `OpenAI API error ${response.status}`), { statusCode: response.status >= 500 ? 502 : 400 });
  let text = String(data.output_text || '').trim();
  if (!text) for (const item of data.output || []) for (const part of item.content || []) if (part?.type === 'output_text' && part.text) text += part.text;
  return safeParseResult(text, allowActions, snapshot);
}
async function callProvider(question, snapshot, allowActions) {
  if (PROVIDER === 'openrouter') return callOpenRouter(question, snapshot, allowActions);
  if (PROVIDER === 'openai') return callOpenAI(question, snapshot, allowActions);
  throw Object.assign(new Error('AI_PROVIDER must be openai or openrouter'), { statusCode: 503 });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  console.log(new Date().toISOString(), req.method, url.pathname, `origin=${origin || '(none)'}`, `content-length=${req.headers['content-length'] || 'unknown'}`);

  if (!isAllowedOrigin(origin)) {
    console.warn(new Date().toISOString(), 'Blocked origin', origin);
    return sendJson(res, 403, { error: 'Origin is not allowed', origin }, origin);
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    return res.end();
  }
  if (req.method === 'GET' && url.pathname === '/health') {
    const keyConfigured = PROVIDER === 'openai' ? Boolean(OPENAI_API_KEY) : Boolean(OPENROUTER_API_KEY);
    return sendJson(res, 200, { ok: true, proxyVersion: PROXY_VERSION, provider: PROVIDER, model: MODEL, keyConfigured, maxBodyBytes: MAX_BODY_BYTES }, origin);
  }
  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    if (!rateAllowed(req.socket.remoteAddress || 'unknown')) return sendJson(res, 429, { error: 'Too many requests. Try again in a minute.' }, origin);
    try {
      const body = await readJson(req);
      const question = String(body.question || '').trim();
      if (!question) throw Object.assign(new Error('question is required'), { statusCode: 400 });
      if (!body.snapshot || typeof body.snapshot !== 'object') throw Object.assign(new Error('snapshot is required'), { statusCode: 400 });
      console.log(new Date().toISOString(), 'AI request accepted', `bodyBytes=${body.__bodyBytes || 0}`, `snapshotKeys=${Object.keys(body.snapshot).join(',')}`);
      const result = await callProvider(question, body.snapshot, body.allowActions !== false);
      console.log(new Date().toISOString(), 'AI response ready', `answerChars=${String(result.answer || '').length}`, `actions=${result.actions.length}`);
      return sendJson(res, 200, result, origin);
    } catch (error) {
      console.error(new Date().toISOString(), error.message);
      return sendJson(res, error.statusCode || 500, { error: error.message || 'Internal server error' }, origin);
    }
  }
  return sendJson(res, 404, { error: 'Not found' }, origin);
});

server.listen(PORT, () => {
  console.log(`Calculator AI proxy v${PROXY_VERSION}: http://localhost:${PORT}`);
  console.log(`Provider: ${PROVIDER}; model: ${MODEL}`);
  console.log(`Key configured: ${PROVIDER === 'openai' ? Boolean(OPENAI_API_KEY) : Boolean(OPENROUTER_API_KEY)}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Max request body: ${MAX_BODY_BYTES} bytes`);
});
