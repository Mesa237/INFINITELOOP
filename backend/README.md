# Check Mark API

Node.js + Express 后端。解压后用 VS Code 打开 `check-mark-api-js` 文件夹。

| 文件 | 作用 |
|---|---|
| server.js | 启动服务、定义 API 路由和 HTTP 错误 |
| communityDirectory.js | 保存 4 条示例社区数据，处理搜索 |
| communityService.js | 处理规则协议、求助、评分、屏蔽和举报 |
| package.json / package-lock.json | 项目命令和依赖版本 |

## 启动

如果原来的 `node server.js` 还在占用 8081，在原窗口按 Ctrl + C。然后在 **新项目目录**打开 CMD，运行下面的命令。

```cmd
npm ci
npm start
```

保持窗口开着。在浏览器访问 http://localhost:8081/health，看到 `{"status":"ok"}` 表示服务已运行。

Postman 可以沿用之前的请求，把端口换成 8081。例如 `POST http://localhost:8081/communities/search`。

如果用 Expo Go 在手机上测试，先停止默认启动的服务，然后运行 `npm start -- 0.0.0.0 8081`。手机和电脑连同一 Wi-Fi，在 Expo 的请求地址里使用 `http://电脑的Wi-Fi-IPv4地址:8081`。可以先用手机浏览器测试 `/health`。

## 请求格式

除 `GET /health` 、`GET /policies/current` 和 `POST /communities/search` 外，请设置 `X-User-Id`。演示时用 `1` 表示求助者、`2` 表示志愿者。有 JSON 请求体时加上 `Content-Type: application/json`。

| 请求 | 谁调用 | 示例 JSON |
|---|---|---|
| GET /policies/current | 任何人 | — |
| POST /agreements | 用户 1 和用户 2 各调用一次 | `{"version":"1.0"}` |
| POST /help-requests | 用户 1 | `{"title":"Practice French","category":"language_exchange","description":"I'd like to practise a short conversation."}` |
| GET /help-requests?status=open | 用户 2 | — |
| POST /help-requests/1/accept | 用户 2 | — |
| POST /help-requests/1/complete | 用户 1 | — |
| POST /help-requests/1/reviews | 用户 1 | `{"stars":3,"reason":"The volunteer arrived late."}` |
| GET /users/2/rating | 已提供演示用户 ID | — |
| POST /blocks | 用户 1 | `{"userId":2}` |
| POST /reports | 用户 1 | `{"userId":2,"reason":"Inappropriate messages."}` |

将路径中的 `1` 换成创建求助时返回的实际 `id`。1–3 星必须写理由，4–5 星可以省略理由。屏蔽会隐藏双方新发布的开放求助并阻止接单，已匹配的任务仍可确认完成和评分。

此版本用于本地演示。数据保存在内存中，重启会清空。`X-User-Id` 用于切换演示身份，可以由客户端填写。多人部署前需要接入真实身份验证和持久化数据库。`language_exchange` 可以作为求助分类。群体活动、捐赠抽签、机构目录留待后续加入。

## Find My Community

App 调用 `POST /communities/search`，使用 `Content-Type: application/json`。城市、语言和分类可以单独选，也能组合筛选。传 `{}` 会显示全部社区。没有符合条件的社区时返回 `{"communities":[]}`。

```json
{"city":"Montreal","language":"fr","category":"language_exchange"}
```

支持的演示语言代码为 `fr`、`en` 和 `zh`。分类为 `language_exchange`、`newcomer_support` 和 `senior_support`。目录中的四个群组都是演示数据，响应中的 `isDemo` 为 `true`。此接口用于浏览社区，尚未接入真实社区数据或加入群组功能。
