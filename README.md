# 🎓 StudyMate — 个人学习任务看板

一个简洁美观的学习任务管理工具，支持添加、查看、修改、标记完成、删除和清空任务。已从纯前端 localStorage 版本升级为 Node.js + Express 后端版本，任务数据持久化到 JSON 文件。

---

## ✨ 功能一览

| 功能 | 说明 |
|------|------|
| ➕ 添加任务 | 输入任务内容，选择优先级和分类，一键添加 |
| ✅ 标记完成 | 点击复选框切换任务的完成/未完成状态 |
| 🗑 删除任务 | 每个任务都有独立的删除按钮 |
| 🔴🟡🟢 优先级 | 高/中/低三档，用不同颜色徽章区分 |
| 📚📝📖 任务分类 | 预设学习、作业、考试、项目、其他五大分类 |
| 📊 实时统计 | 顶部卡片显示总任务数、已完成数、完成率百分比 |
| 🔍 筛选 | 可按优先级和分类快速筛选任务 |
| 🧹 清空已完成 | 一键清除所有已完成任务（带确认弹窗） |
| 💾 数据持久化 | 任务保存到 `data/tasks.json`，重启不丢失 |
| 📱 响应式 | 在手机和平板上也能正常使用 |

---

## 🛠 技术栈

- **HTML5** — 页面结构
- **CSS3** — 样式与动画（Flexbox、Grid、CSS 变量）
- **原生 JavaScript** — 前端交互逻辑，使用 `fetch` 调后端 API
- **Node.js + Express** — 后端服务，提供 REST API
- **JSON 文件存储** — 任务数据保存在 `data/tasks.json`，不使用数据库

---

## 📁 项目结构

```
StudyMate/
├── server.js             ← Express 后端服务（API + 静态文件托管）
├── data/
│   └── tasks.json        ← 任务数据文件（JSON 格式）
├── public/               ← 前端静态文件
│   ├── index.html        ← 页面结构
│   ├── style.css         ← 全部样式
│   └── app.js            ← 前端交互逻辑（fetch 调用 API）
├── package.json          ← 项目配置与依赖
└── README.md             ← 本说明文档
```

---

## 🚀 安装与启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动项目

```bash
npm start
```

### 3. 打开浏览器

访问 **http://localhost:3000**

---

## 📡 API 接口说明

所有接口返回统一格式：

```json
{
  "success": true,
  "data": ...
}
```

### 获取全部任务

```
GET /api/tasks
```

### 新增任务

```
POST /api/tasks
Content-Type: application/json

{
  "text": "复习高等数学第三章",
  "priority": "high",
  "category": "考试"
}
```

- `text` 必填，`priority` 和 `category` 可选（分别默认 `medium` 和 `其他`）
- 返回 201 状态码

### 修改任务

```
PATCH /api/tasks/:id
Content-Type: application/json

{
  "text": "新内容",
  "priority": "low",
  "category": "其他",
  "completed": true
}
```

- 只需传要修改的字段，其他字段保持不变
- 自动更新 `updatedAt` 时间戳

### 删除单个任务

```
DELETE /api/tasks/:id
```

### 清空已完成任务

```
DELETE /api/tasks/completed
```

- 删除所有 `completed: true` 的任务
- 返回删除数量

---

## 🔗 前端如何调用后端

前端 `public/app.js` 使用 `fetch` 通过相对路径调用 API：

```javascript
// 获取任务
const res = await fetch("/api/tasks");
const tasks = await res.json();

// 新增任务
await fetch("/api/tasks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "新任务" }),
});

// 修改任务
await fetch("/api/tasks/demo_001", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ completed: true }),
});

// 删除任务
await fetch("/api/tasks/demo_001", { method: "DELETE" });

// 清空已完成
await fetch("/api/tasks/completed", { method: "DELETE" });
```

所有请求使用相对路径 `/api/...`，无需硬编码域名和端口。

---

## 💾 数据保存

- 任务数据文件：`data/tasks.json`
- 格式：JSON 数组，每个任务包含 `id`、`text`、`priority`、`category`、`completed`、`createdAt`、`updatedAt`
- 重启服务不会丢失数据
- 要清空所有数据，删除 `data/tasks.json` 或将其内容设为 `[]` 后重启

---

## 🧪 测试方法

### 浏览器测试

1. `npm start` 启动服务
2. 打开 http://localhost:3000
3. 添加、完成、删除任务，观察页面和统计数据变化
4. 刷新页面，验证任务数据是否持久化

### API 测试（使用 curl 或 Postman）

```bash
# 获取任务列表
curl http://localhost:3000/api/tasks

# 新增任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"复习高数\",\"priority\":\"high\",\"category\":\"考试\"}"

# 标记完成（替换 :id 为实际 ID）
curl -X PATCH http://localhost:3000/api/tasks/:id \
  -H "Content-Type: application/json" \
  -d "{\"completed\":true}"

# 删除单个任务
curl -X DELETE http://localhost:3000/api/tasks/:id

# 清空已完成
curl -X DELETE http://localhost:3000/api/tasks/completed
```

---

## 🔮 后续可扩展方向

- 接入 DeepSeek AI，根据学习目标自动生成任务清单
- 用户注册与登录
- 数据库（如 SQLite）替代 JSON 文件
- 学习统计图表（每日完成量、分类分布等）
- 任务截止日期与提醒

---

## 📄 许可

MIT License — 可自由用于学习和展示。

---

Made with ❤️ for students.