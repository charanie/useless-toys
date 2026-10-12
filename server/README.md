# 排行榜后端 · 部署说明

给「抽象消消乐」的**联网排行榜**用的后端：一个 Cloudflare Worker + 一个 KV 命名空间。
**不用装任何东西，不用命令行**，全程在网页上点 5 分钟。

免费额度：每天 100,000 次读、1,000 次写。一个玩具榜单绰绰有余。

---

## 一步一步来

### 1. 注册 Cloudflare

打开 <https://dash.cloudflare.com/sign-up>，邮箱注册，免费计划即可（不用绑卡）。

### 2. 建一个 Worker

左侧菜单 **Workers & Pages** → **Create application** → **Create Worker** → 起个名字（比如 `useless-toys-scores`）→ **Deploy**。

### 3. 把代码贴进去

点 **Edit code**（编辑代码）→ 把编辑器里的默认内容**全部删掉** → 打开本仓库的 [`worker.js`](worker.js)，
全选复制、粘贴进去 → 右上角 **Deploy**。

### 4. 建一个 KV 命名空间并绑定

1. 左侧 **Storage & Databases** → **KV** → **Create instance** → 名字随便（比如 `useless-toys-scores-kv`）→ Create
2. 回到你刚建的那个 Worker → **Settings** → **Variables and Bindings**（变量和绑定）
3. 找到 **KV Namespace Bindings** → **Add binding**
   - **Variable name（变量名）**：`SCORES` ← **必须一字不差**
   - **KV namespace**：选刚才建的那个
4. **Save / Deploy**

### 5. 把地址给我

Worker 页面顶部/概览里能看到它的地址，形如：

```
https://useless-toys-scores.你的子域.workers.dev
```

浏览器打开它 + `/scores?mode=normal`，应该返回一段 JSON（`{"ok":true,...}`）就说明活了。

**把这个地址发我**，我填进 `config.js` 推上去，联网榜就生效了。

> 也可以自己改：仓库根目录的 `config.js`，把地址填进 `window.SHOP_API` 即可，两边游戏都会自动切到联网榜。

---

## 自己验证一下

```bash
# 读榜
curl "https://你的地址.workers.dev/scores?mode=normal&limit=10"

# 交一条成绩
curl -X POST "https://你的地址.workers.dev/scores" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"normal","name":"测试","score":1234,"lines":0,"date":"2026-10-12"}'
```

---

## 说明与限制

- **公开可写**：接口是开放的，任何人都可以提交成绩（这是玩具榜的常态）。Worker 里做了基础校验
  （分数 0 ~ 1000 万、名字 ≤ 12 字、模式白名单），但没有身份验证。想更严可以加 Cloudflare Turnstile。
- **跨域**：默认 `Access-Control-Allow-Origin: *`。想收紧，把 `worker.js` 顶部的 `ALLOW_ORIGIN`
  改成 `https://charanie.github.io` 再 Deploy。
- **数据在你自己的 Cloudflare 账号下**，随时可以在 KV 控制台里查看/清空。
- 没有配 `SHOP_API` 时，游戏会自动退回**本机榜**（存在浏览器里），功能不缺席。
