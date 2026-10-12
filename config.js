/* 抽象玩具铺 · 全局配置
 *
 * window.SHOP_API —— 联网排行榜后端地址（Cloudflare Worker）
 *   留空 ''    → 只用本机榜，一切照常，不联网也能跑
 *   填上地址   → 自动切换成联网榜（失败会自动退回本机榜）
 *
 * 例：window.SHOP_API = 'https://useless-toys-scores.abc123.workers.dev';
 * 后端怎么搭见 server/README.md
 */
window.SHOP_API = '';
