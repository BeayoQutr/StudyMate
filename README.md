# StudyMate — 个人学习任务看板

一个简洁美观的个人学习任务管理工具，支持添加、编辑、删除、标记完成和清空任务。带单用户登录保护，前后端分离，数据通过 Neon PostgreSQL 持久化存储，已部署到 Render 线上服务。

线上地址：https://studymate-eiyw.onrender.com
GitHub 仓库：https://github.com/Beayoqutr/StudyMate

---

## ✨ 当前功能

| 功能 | 说明 |
|------|------|
| ➕ 添加任务 | 输入任务内容（text），选择优先级和分类，可选设置开始/截止时间 |
| ✏️ 编辑任务 | 点击任务卡片上的编辑按钮，直接修改任务内容、优先级、分类和日期 |
| ✅ 标记完成 | 点击复选框切换任务的完成/未完成状态 |
| 🗑 删除任务 | 每个任务都有独立的删除按钮 |
| 🔴🟡🟢 优先级 | 高／中／低三档，用不同颜色徽章区分 |
| 📚📝📖 分类 | 预设学习、作业、考试、项目、其他五大分类 |
| 📅 时间管理 | 支持可选开始时间 `startAt` 和截止时间 `dueAt`，自动提示"未开始"／"已过期" |
| 📊 实时统计 | 顶部卡片显示总任务数、已完成数、完成率百分比，附带迷你进度条 |
| 🔍 筛选 | 可按优先级和分类快速筛选任务 |
| 🧹 清空已完成 | 一键清除所有已完成任务（带确认弹窗） |
| 💾 数据持久化 | 任务保存到 Neon PostgreSQL，重启服务不丢失 |
| 📱 响应式设计 | 在手机和平板上也能正常使用 |
| 🔐 单用户登录 | 基于 Cookie 的密码保护，httpOnly + HMAC-SHA256 签名防篡改 |
| 📲 PWA 支持 | manifest 和图标已配置，可安装到桌面（service worker 当前未启用） |

---

## 🛠 技术栈

- **前端**：HTML5 + CSS3（Flexbox / Grid / CSS 变量）+ 原生 JavaScript（fetch API）
- **后端**：Node.js + Express + REST API
- **数据库**：Neon PostgreSQL
- **部署**：Render Web Service
- **认证**：HMAC-SHA256 签名 Cookie
- **本地回退**：未配置 `DATABASE_URL` 时，自动使用 `data/tasks.json` 作为本地存储

---

## 📁 项目结构

```
StudyMate/
├── server.js                       ← Express 后端服务（全部路由 + 认证中间件）
├── db.js                           ← PostgreSQL 数据库连接模块（Pool + 表初始化）
├── data/
│   └── tasks.json                  ← 旧版本遗留 / 本地回退任务数据文件
├── public/                         ← 前端静态文件
│   ├── index.html                  ← 主页面
│   ├── login.html                  ← 登录页面
│   ├── app.js                      ← 前端交互逻辑（fetch 调 API）
│   ├── style.css                   ← 全部样式
│   ├── manifest.webmanifest        ← PWA 清单文件
│   ├── service-worker.js           ← Service Worker（当前未启用）
│   └── icons/                      ← PWA 图标资源
├── scripts/
│   └── migrate-tasks-to-db.js      ← 数据迁移脚本（tasks.json → PostgreSQL）
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 🗄️ 数据存储说明

本项目使用 **Neon PostgreSQL** 作为线上持久化存储，所有任务数据保存在 `tasks` 表中。

### 数据库字段映射

| 数据库字段（下划线） | 前端字段（驼峰） | 类型 | 说明 |
|---------------------|-----------------|------|------|
| `id` | `id` | TEXT PRIMARY KEY | 唯一标识 |
| `text` | `text` | TEXT NOT NULL | 任务内容（主字段） |
| `priority` | `priority` | TEXT | 优先级，默认 `medium` |
| `category` | `category` | TEXT | 分类，默认 `默认` |
| `completed` | `completed` | BOOLEAN | 是否已完成，默认 `false` |
| `start_at` | `startAt` | TIMESTAMPTZ | 开始时间，可为 null |
| `due_at` | `dueAt` | TIMESTAMPTZ | 截止时间，可为 null |
| `created_at` | `createdAt` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | `updatedAt` | TIMESTAMPTZ | 最后修改时间 |

### 为什么不用 Render 本地文件长期保存线上任务

Render Web Service 的运行时文件系统不适合作为长期可靠的数据存储：

- 免费实例在闲置后会释放文件系统，数据可能丢失
- 每次重新部署后文件系统会被重置
- 不支持持久化数据的备份和恢复

因此，线上任务数据应保存到 PostgreSQL（Neon），而不是依赖 Render 实例的本地文件。本项目在未配置 `DATABASE_URL` 时仍会回退到 `data/tasks.json`，但这仅适用于本地开发或临时场景。

---

## 🚀 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/Beayoqutr/StudyMate.git
cd StudyMate
```

### 2. 创建 `.env` 文件

在项目根目录新建 `.env`，填入：

```
APP_PASSWORD=your-local-password
COOKIE_SECRET=your-random-cookie-secret
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

> `.env` 示例中均为占位值，请替换为你自己的配置。

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

| 变量 | 必填 | 说明 | 示例值（仅占位） |
|------|------|------|------|
| `APP_PASSWORD` | ✅ | 登录密码 | `your-local-password` |
| `COOKIE_SECRET` | ✅ | Cookie 签名密钥（随机字符串） | `your-random-cookie-secret` |
| `DATABASE_URL` | ✅ | PostgreSQL 连接串（Neon） | `postgresql://user:password@host/database?sslmode=require` |
| `PORT` | 否 | HTTP 监听端口，默认 `3000` | `3000` |

> **安全提醒**：请勿将 `.env` 文件提交到 Git。`.gitignore` 中已包含 `.env`。

---

## ☁️ 部署说明（Render）

本项目部署在 [Render](https://render.com) Web Service，使用以下配置：

- **Build Command**：`npm install`
- **Start Command**：`node server.js`

在 Render Dashboard 的环境变量中需要配置以下三项：

- `APP_PASSWORD`
- `COOKIE_SECRET`
- `DATABASE_URL`

部署后访问：https://studymate-eiyw.onrender.com

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

### 任务对象字段示例

```json
{
  "id": "xxx",
  "text": "任务内容",
  "priority": "medium",
  "category": "学习",
  "completed": false,
  "startAt": "2026-04-25T17:34:00.000Z",
  "dueAt": "2026-04-25T18:34:00.000Z",
  "createdAt": "时间",
  "updatedAt": "时间"
}
```

- 任务主字段为 `text`（不是 `title`）
- `startAt` 和 `dueAt` 为可选字段，可为 `null`
- 旧任务没有 `startAt`/`dueAt` 时，返回 `null`

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

### PATCH /api/tasks/:id 请求示例

```json
{
  "text": "更新后的任务内容",
  "dueAt": "2026-06-01T12:00:00.000Z"
}
```

- 只传需要修改的字段
- 传 `null` 可清空对应时间字段
- 非法日期字符串返回 `400`

---

## 📦 数据迁移

如果存在旧的 `data/tasks.json`，可以通过迁移脚本将其导入 PostgreSQL：

```bash
npm run migrate:tasks
```

迁移脚本特点：

- 可重复运行（使用 `ON CONFLICT (id) DO UPDATE`，不会重复插入）
- 自动跳过异常数据（text 为空的任务）
- 迁移完成后输出统计信息

> 请勿将包含个人真实任务数据的 `data/tasks.json` 提交到 GitHub。

---

## ⚠️ 当前限制

1. **单用户**：仅支持一个全局密码登录，无多用户和注册功能。
2. **前端未使用框架**：所有前端逻辑基于原生 JavaScript，后期可迁移到 React / Vue 以获得更好的维护性。
3. **数据回退依赖**：未配置 `DATABASE_URL` 时使用 `data/tasks.json`，本地重启/部署可能导致该文件丢失。

---

## 🔒 Git 注意事项

- **不提交 `.env`**：`.gitignore` 已包含，确保本地 `.env` 不会被推送到远程仓库。
- **不提交 `node_modules`**：已在 `.gitignore` 中忽略。
- **不提交真实密码**：所有敏感信息应通过环境变量注入，切勿硬编码。
- **不提交 `COOKIE_SECRET`**：Cookie 签名密钥必须保密。
- **不提交 `DATABASE_URL`**：数据库连接串包含凭据，不可写入仓库。
- **不提交 API Key**：任何第三方 API 密钥应通过环境变量管理。
- **谨慎提交 `data/tasks.json`**：该文件可能包含个人学习任务内容，建议提交空数组示例或不提交该文件。

---

## 📲 PWA 策略

- **保留 manifest 和图标**：`public/manifest.webmanifest` 和图标资源已配置好的 PWA 清单，支持将应用安装到桌面。
- **当前不注册 service worker**：为避免影响 API 调用的及时性，暂不启用 `public/service-worker.js`。
- **不缓存任何 `/api/*` 请求**：所有 API 请求直接到服务端，不经过 Cache Storage，确保任务数据始终为最新。

---

## 🔮 后续计划

- **UI 优化**：完善移动端、无障碍和交互动效。
- **任务排序 / 按时间排序**：支持按创建时间、优先级、截止时间等维度排序。
- **考试倒计时**：基于 `dueAt` 提供倒计时显示，在截止前发送浏览器通知。
- **任务提醒**：支持设置提醒时间，到期通过浏览器通知提醒。
- **DeepSeek AI 自动生成任务**：接入 AI 辅助学习规划，根据考试日期自动生成复习任务。
- **更完善的数据备份策略**：定期备份 PostgreSQL 数据，支持数据导出和恢复。

---

## 📄 许可

MIT License — 可自由用于学习和展示。

---

Made with ❤️ for students.