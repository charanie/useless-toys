/**
 * 抽象玩具铺 · 排行榜后端
 * Cloudflare Worker + KV（免费额度够用）
 *
 * 绑定要求：KV namespace，变量名必须是  SCORES
 *
 * 接口：
 *   GET  /scores?mode=normal|daily&limit=10   → { ok, mode, scores:[{name,score,lines,date,ts}, ...] }
 *   POST /scores  { mode, name, score, lines, date } → { ok, rank, total }
 *
 * 设计要点：每条成绩单独一个 key，key 里带「反向分数」，
 * 于是 KV 的 list() 天然按分数从高到低返回 —— 并发提交不会互相覆盖。
 */

const ALLOW_ORIGIN = '*';                 // 想收紧就改成 'https://charanie.github.io'
const MODES        = ['normal', 'daily'];
const MAX_SCORE    = 10_000_000;
const MAX_NAME     = 12;
const MAX_DATE     = 12;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json;charset=utf-8', ...corsHeaders() },
  });
}
function clean(v, max) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f]/g, '')   // 去掉控制字符
    .trim()
    .slice(0, max);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

    // ---- 读榜 ----
    if (req.method === 'GET' && url.pathname === '/scores') {
      const qMode = url.searchParams.get('mode');
      const mode  = MODES.includes(qMode) ? qMode : 'normal';
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));

      const l = await env.SCORES.list({ prefix: `sc:${mode}:`, limit });
      const scores = l.keys
        .map(k => ({ ...(k.metadata || {}) }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, limit);

      return json({ ok: true, mode, scores });
    }

    // ---- 交成绩 ----
    if (req.method === 'POST' && url.pathname === '/scores') {
      let body;
      try { body = await req.json(); }
      catch (e) { return json({ ok: false, error: 'bad json' }, 400); }

      const mode = MODES.includes(body.mode) ? body.mode : null;
      if (!mode) return json({ ok: false, error: 'bad mode' }, 400);

      const name  = clean(body.name, MAX_NAME) || '路人';
      const score = Math.floor(Number(body.score));
      const lines = Math.max(0, Math.floor(Number(body.lines) || 0));
      const date  = clean(body.date, MAX_DATE);

      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE)
        return json({ ok: false, error: 'bad score' }, 400);
      if (!name) return json({ ok: false, error: 'bad name' }, 400);

      // key 里放「反向分数」→ list 出来就是分数从高到低
      const inv = String(MAX_SCORE - score).padStart(9, '0');
      const key = `sc:${mode}:${inv}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      const meta = { name, score, lines, date, ts: Date.now() };

      await env.SCORES.put(key, '', { metadata: meta });

      // 顺手算个名次（并列时取第一条）
      const l = await env.SCORES.list({ prefix: `sc:${mode}:`, limit: 1000 });
      const arr = l.keys.map(k => k.metadata || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
      const rank = arr.findIndex(x => x.score === score && x.name === name) + 1;

      return json({ ok: true, rank: rank || null, total: arr.length, entry: meta });
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};
