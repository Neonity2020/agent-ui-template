# Pi Agent 极简 WebUI 构建指南

> 用最少的前端代码，把 Pi Agent（本地编码智能体）变成一个可以交互的 Web 聊天界面。

> **Info:** Pi Agent 本体是运行在本地的编码智能体（核心包 `@earendil-works/pi-coding-agent`，CLI 命令 `pi`）。它默认没有 HTTP 接口，本指南通过仓库中的 `apps/local-runner` 把 Pi Agent 封装成 HTTP + SSE 服务，再配一个零依赖的单 HTML 文件作为前端，即可完成一个极简 WebUI。

## 架构

```
浏览器（单 HTML 文件）
   │  fetch POST /v1/prompt（SSE 流式返回）
   ▼
Local Runner（127.0.0.1:4242）
   │  @earendil-works/pi-coding-agent
   ▼
Pi Agent Session
   ├── 默认工具：read / grep / find / ls（只读）
   ├── --allow-write 追加：edit / write
   └── --allow-bash 追加：bash
```

三个角色各司其职：

| 组件 | 职责 |
| --- | --- |
| Pi Agent core | 会话管理、工具调用、模型推理（复用 `~/.pi/agent` 的模型配置） |
| Local Runner | 把 Agent 能力暴露为 `GET /health` 和 `POST /v1/prompt` 两个 HTTP 接口，SSE 流式返回 |
| WebUI | 收集用户输入 → 请求 Runner → 解析 SSE 增量渲染回复 |

## 第一步：启动 Local Runner

进入 `apps/local-runner`，指定工作区目录启动：

```bash
cd apps/local-runner

# 最小启动（只读工具，端口默认 4242）
pnpm dev -- --workspace /absolute/path/to/your/project

# 允许修改文件 + 执行命令（按需开启，注意安全）
pnpm dev -- --workspace /absolute/path/to/your/project --allow-write --allow-bash --port 4242
```

直接运行脚本也可以：

```bash
node src/index.mjs --workspace /absolute/path [--allow-write] [--allow-bash] [--port 4242]
```

启动参数说明：

| 参数 | 说明 |
| --- | --- |
| `--workspace` | 必填。Agent 的工作目录（绝对路径），工具只在该目录内活动 |
| `--allow-write` | 开启 `edit` / `write` 工具（默认只有只读工具） |
| `--allow-bash` | 开启 `bash` 工具（可执行任意命令，风险最高） |
| `--port` | 监听端口，默认 `4242` |
| 环境变量 `PI_AGENT_DIR` | Agent 配置目录，默认 `~/.pi/agent` |
| 环境变量 `PI_RUNNER_ALLOWED_ORIGIN` | 额外允许的浏览器 Origin（默认只允许 localhost） |

启动成功后验证：

```bash
curl http://127.0.0.1:4242/health
# → {"status":"ok","workspace":"/abs/path","tools":["read","grep","find","ls"]}
```

> **Note:** Runner 只绑定 `127.0.0.1`，仅本机可访问；CORS 默认也只放行 `localhost` / `127.0.0.1` 来源的浏览器页面。

## 第二步：接口约定

### `GET /health`

返回 `{ status, workspace, tools }`，用于前端检测 Runner 是否在线。

### `POST /v1/prompt`

请求体（JSON）：

```json
{
  "sessionId": "conv-abc-123",
  "prompt": "帮我看看这个项目的结构",
  "messages": [
    { "role": "user", "parts": [{ "type": "text", "text": "你好" }] }
  ],
  "systemPrompt": "You are a helpful coding agent."
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sessionId` | string | 是 | 会话 ID。同一个 ID 复用同一个 Agent Session（多轮上下文），不同 ID 相互隔离 |
| `prompt` | string | 是* | 用户文本。若省略，则从 `messages` 中最后一条 user 消息的 `parts[].text` 拼接 |
| `messages` | array | 否 | 对话历史（AI SDK `UIMessage` 格式），用于服务端取最新用户输入 |
| `systemPrompt` | string | 否 | 覆盖系统提示词 |

响应为 **SSE 流**（`Content-Type: text/event-stream`），每行格式 `data: {json}\n\n`：

| 事件类型 | 数据字段 | 含义 |
| --- | --- | --- |
| `start` | — | 请求已受理 |
| `text-start` | `id` | 开始一段助手文本 |
| `text-delta` | `id`, `delta` | 增量文本片段（逐字/逐段追加渲染） |
| `text-end` | `id` | 当前文本段结束 |
| `finish` | — | 整个回复完成 |
| `error` | `errorText` | 出错，携带错误信息 |

示例流：

```
data: {"type":"start"}

data: {"type":"text-start","id":"pi-xxx"}

data: {"type":"text-delta","id":"pi-xxx","delta":"这个项目"}

data: {"type":"text-delta","id":"pi-xxx","delta":"是 monorepo"}

data: {"type":"text-end","id":"pi-xxx"}

data: {"type":"finish"}

```

## 第三步：极简前端（单 HTML 文件）

零依赖、零构建，一个 `index.html` 即可。核心只有两点：

1. **POST 流式读取**：浏览器 `EventSource` 只支持 GET，而本接口是 POST，所以用 `fetch` + `ReadableStream` 手动解析 SSE。
2. **会话 ID**：用 `crypto.randomUUID()` 生成，同一标签页内多轮对话复用，上下文连续。

完整示例：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Pi Agent WebUI</title>
  <style>
    body { max-width: 720px; margin: 0 auto; padding: 24px; font-family: system-ui; }
    #log { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .msg { white-space: pre-wrap; padding: 10px 14px; border-radius: 10px; background: #f3f4f6; }
    .msg.user { background: #e0e7ff; align-self: flex-end; }
    .msg.assistant { align-self: flex-start; }
    .msg.error { background: #fee2e2; color: #b91c1c; }
    #form { display: flex; gap: 8px; }
    input { flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; }
    button { padding: 10px 18px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; }
    button:disabled { opacity: .5; }
  </style>
</head>
<body>
  <h1>Pi Agent</h1>
  <div id="log"></div>
  <form id="form">
    <input id="input" placeholder="输入指令，例如：查看这个项目的文件树" autocomplete="off" />
    <button id="send">发送</button>
  </form>

  <script>
    const RUNNER_URL = "http://127.0.0.1:4242";
    const sessionId = crypto.randomUUID(); // 标签页生命周期内复用，保持多轮上下文
    const log = document.getElementById("log");
    const form = document.getElementById("form");
    const input = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    function appendMessage(role, text) {
      const div = document.createElement("div");
      div.className = `msg ${role}`;
      div.textContent = text;
      log.appendChild(div);
      return div;
    }

    async function send(prompt) {
      const userDiv = appendMessage("user", prompt);
      const assistantDiv = appendMessage("assistant", "");
      sendBtn.disabled = true;

      try {
        // 1. 发起 POST，拿到流式响应体
        const res = await fetch(`${RUNNER_URL}/v1/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, prompt }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

        // 2. 逐块读取并解析 SSE 行
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const event = JSON.parse(line.slice(6));
            handleEvent(event, assistantDiv);
          }
        }
      } catch (error) {
        assistantDiv.className = "msg error";
        assistantDiv.textContent = `错误：${error.message}`;
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    }

    // 3. 按事件类型增量渲染
    function handleEvent(event, assistantDiv) {
      switch (event.type) {
        case "text-delta":
          assistantDiv.textContent += event.delta;
          break;
        case "error":
          assistantDiv.className = "msg error";
          assistantDiv.textContent = `错误：${event.errorText}`;
          break;
        // start / text-start / text-end / finish 无需额外处理
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text) { input.value = ""; void send(text); }
    });
  </script>
</body>
</html>
```

用任意静态服务器打开即可（或直接双击文件，`fetch` 目标地址允许 localhost 跨域）：

```bash
cd /path/to/html
python3 -m http.server 3000
# 浏览器访问 http://localhost:3000
```

> **Tip:** 多轮对话时，Runner 会按 `sessionId` 在内存中复用 Agent Session，历史上下文自动保留，前端无需重发历史消息。Runner 重启后会话丢失，需重新生成 `sessionId`。

## 第四步：安全检查清单

| 检查项 | 建议 |
| --- | --- |
| 端口暴露 | Runner 只监听 `127.0.0.1`，**不要**通过反代暴露到公网 |
| 工具权限 | 默认只读；`--allow-write` 慎开；`--allow-bash` 仅在完全信任的环境开启 |
| 会话隔离 | 每个用户/会话使用独立 `sessionId`，避免串上下文 |
| 前端校验 | 输入框做长度限制，防止超大 payload |
| 生产化 | 如需多用户，把 Runner 放在服务端进程管理（如 `pm2` / systemd）后面，由后端鉴权代理 |

## 进阶：接入本仓库的 Next.js 前端

`apps/web` 已经内置对 Local Runner 的对接：

1. 在 `apps/web/.env.local` 设置：

   ```
   NEXT_PUBLIC_PI_RUNNER_URL=http://127.0.0.1:4242
   ```

2. 聊天设置中把 runtime 切到 `pi`，前端即通过 AI SDK `useChat` + `DefaultChatTransport` 直接流式调用 Runner（见 `apps/web/components/chat/chat-client.tsx`）。
3. 登录用户的历史消息通过 `/api/chat/persist` 持久化到数据库（见 `apps/web/app/api/chat/persist/route.ts`）。

## 参考

| 文件 | 说明 |
| --- | --- |
| `apps/local-runner/src/index.mjs` | Runner 完整实现（HTTP + SSE + 会话管理） |
| `apps/web/components/chat/chat-client.tsx` | AI SDK 对接 Runner 的前端示例 |
| `~/.pi/agent/settings.json` | Pi Agent 模型 / Provider 配置（Runner 复用） |
