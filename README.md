# StudyMate — 个人学习任务看板

一个简洁美观的学习任务管理工具，支持添加、查看、编辑、标记完成、删除和清空任务。前后端分离，数据持久化存储，已部署到 Render 线上服务。

线上地址：https://studymate-eiyw.onrender.com
GitHub 仓库：https://github.com/Beayoqutr/StudyMate

---

## ✨ 当前功能

| 功能 | 说明 |
|------|------|
| ➕ 添加任务 | 输入任务内容（text），选择优先级和分类，可选设置开始/截止时间 |
| ✅ 标记完成 | 点击复选框切换任务的完成/未完成状态 |
| 🗑 删除任务 | 每个任务都有独立的删除按钮 |
| 🔴🟡🟢 优先级 | 高／中／低三档，用不同颜色徽章区分 |
| 📚📝📖 分类 | 预设学习、作业、考试、项目、其他五大分类 |
| 📅 时间管理 | 支持可选开始时间 `startAt` 和截止时间 `dueAt`，自动提示"未开始"／"已过期" |
| 📊 实时统计 | 顶部卡片显示总任务数、已完成数、完成率百分比，附带迷你进度条 |
| 🔍 筛选 | 可按优先级和分类快速筛选任务 |
| 🧹 清空已完成 | 一键清除所有已完成任务（带确认弹窗） |
| 💾 数据持久化 | 任务保存到 `data/tasks.json`，重启服务不丢失 |
| 📱 响应式设计 | 在手机和平板上也能正常使用 |
| 🔐 单用户登录 | 基于 Cookie 的密码保护，httpOnly + 签名防篡改 |
| 📲 PWA 支持 | manifest 和图标已配置，可安装到桌面（service worker 当前未启用） |

---

## 🛠 技术栈

- **前端**：HTML5 + CSS3（Flexbox / Grid / CSS 变量）+ 原生 JavaScript（fetch API）
- **后端**：Node.js + Express
- **存储**：JSON 文件（`data/tasks.json`）
- **部署**：Render Web Service
- **认证**：HMAC-SHA256 签名 Cookie

---

## 📁 项目结构

```
StudyMate/
├── server.js                ← Express 后端服务（全部路由 + 认证中间件）
├── data/
│   └── tasks.json           ← 任务数据文件（JSON 数组）
├── public/                  ← 前端静态文件
│   ├── index.html           ← 主页面
│   ├── login.html           ← 登录页面
│   ├── app.js               ← 前端交互逻辑（fetch 调 API）
│   ├── style.css            ← 全部样式
│   ├── manifest.webmanifest ← PWA 清单文件
│   ├── service-worker.js    ← Service Worker（当前未启用）
│   └── icons/               ← PWA 图标资源
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/Beayoqutr/StudyMate.git
cd StudyMate
```

### 2. 创建 .env 文件

在项目根目录新建 `.env`，填入：

```
APP_PASSWORD=your_password
COOKIE_SECRET=your_random_secret
PORT=3000
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动服务

```bash
npm start
```

### 5. 打开浏览器

访问 http://localhost:3000，输入 `.env` 中设置的密码即可登录。

---

## 🔧 环境变量说明

| 变量 | 必填 | 说明 | 示例值（仅示例，不写真实值） |
|------|------|------|------|
| `APP_PASSWORD` | ✅ | 登录密码 | `your_password` |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥（随机字符串） | `your_random_secret` |
| `PORT` | 否 | HTTP 监听端口，默认 `3000` | `3000` |
| `DATABASE_URL` | 否 | PostgreSQL 连接串（预留，未来计划） | `your_postgres_url_optional_future` |

> **安全提醒**：请勿将 `.env` 文件提交到 Git。`.gitignore` 中已包含 `.env`。

---

## 📡 API 简要说明

所有 API 均需要登录（除 `/api/login`、`/api/logout`、`/api/me`）。未登录时返回 `401`。

响应格式统一为：

```json
{
  "success": true,
  "data": ...
}
```

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录，body: `{"password":"..."}` |
| POST | `/api/logout` | 登出 |
| GET | `/api/me` | 检查当前登录状态 |

### 任务

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 新建任务 |
| PATCH | `/api/tasks/:id` | 修改指定任务 |
| DELETE | `/api/tasks/:id` | 删除指定任务 |
| DELETE | `/api/tasks/completed` | 清空所有已完成任务 |

### 任务字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `text` | string | 任务内容（主字段，必填） |
| `priority` | string | 优先级：`high` / `medium` / `low`，默认 `medium` |
| `category` | string | 分类：`学习` / `作业` / `考试` / `项目` / `其他`，默认 `其他` |
| `completed` | boolean | 是否已完成，默认 `false` |
| `startAt` | string \| null | 开始时间（ISO 8601），可选，支持 `null` |
| `dueAt` | string \| null | 截止时间（ISO 8601），可选，支持 `null` |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 最后修改时间 |

### POST /api/tasks 请求示例

```json
{
  "text": "复习线性代数第三章",
  "priority": "high",
  "category": "考试",
  "startAt": "2026-05-10T08:00:00.000Z",
  "dueAt": "2026-05-15T23:59:00.000Z"
}
```

- `startAt` 和 `dueAt` 为可选字段，可传 `null` 或空字符串，后端会保存为 `null`
- 非法日期字符串会返回 `400`：`{"error": "Invalid startAt"}` 或 `{"error": "Invalid dueAt"}`
- 如果 `startAt` 晚于 `dueAt`，返回 `400`：`{"error": "startAt cannot be later than dueAt"}`
- 旧任务没有 `startAt`/`dueAt` 字段时，返回 `null`

### PATCH /api/tasks/:id 请求示例

```json
{
  "text": "更新后的任务内容",
  "dueAt": "2026-06-01T12:00:00.000Z"
}
```

- 只传需要修改的字段
- 同样支持 `startAt` 和 `dueAt` 的修改与校验

---

## ☁️ 部署说明

本项目部署在 [Render](https://render.com) Web Service，使用以下配置：

- **Build Command**：`npm install`
- **Start Command**：`node server.js`
- **Environment**：在 Render Dashboard 中设置所需环境变量（参考上方环境变量表）

部署后访问：https://studymate-eiyw.onrender.com

---

## ⚠️ 当前限制

1. **数据持久性有限**：当前使用 JSON 文件存储，Render 免费实例在闲置/重启后会重置文件系统，任务数据可能丢失。
2. **单用户**：仅支持一个全局密码登录，无多用户和注册功能。
3. **无数据库**：未接入真正的数据库，查询、并发、数据完整性和扩展性受限。
4. **前端未使用框架**：所有前端逻辑基于原生 JavaScript，后期可迁移到 React / Vue 以获得更好的维护性。

---

## 🔮 后续计划

- **迁移到 PostgreSQL**：使用 `DATABASE_URL` 环境变量接入 PostgreSQL，确保线上数据持久可恢复
- 接入 AI 辅助学习规划（如根据考试日期自动生成复习任务）
- 学习数据统计图表（每日/每周完成量、分类分布、时间热力图）
- 任务提醒通知（浏览器通知或邮件）
- 多用户支持（注册 / 登录 / 数据隔离）
- 迁移前端到现代框架（React / Vue）
- 单元测试与 CI/CD 流程

---

## 📄 许可

MIT License — 可自由用于学习和展示。

---

Made with ❤️ for students.