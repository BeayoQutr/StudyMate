/* =============================================
   StudyMate - Express 后端服务
   数据存储: data/tasks.json
   ============================================= */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ==================== 启动前校验 ====================

const APP_PASSWORD = process.env.APP_PASSWORD;
const COOKIE_SECRET = process.env.COOKIE_SECRET;

if (!APP_PASSWORD) {
    console.error("❌ 缺少环境变量 APP_PASSWORD，请检查 .env 文件或系统环境变量");
    process.exit(1);
}
if (!COOKIE_SECRET) {
    console.error("❌ 缺少环境变量 COOKIE_SECRET，请检查 .env 文件或系统环境变量");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体
app.use(express.json());

// ==================== Cookie 工具函数 ====================

const COOKIE_NAME = "studymate_session";

/**
 * 签名数据
 * @param {string} payload - 要签名的字符串
 * @returns {string} base64url(payload).base64url(签名)
 */
function sign(payload) {
    const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
    hmac.update(payload);
    const sig = hmac.digest("base64url");
    const encoded = Buffer.from(payload, "utf8").toString("base64url");
    return encoded + "." + sig;
}

/**
 * 验证签名并解出原始数据
 * @param {string} signed - 签名后的字符串
 * @returns {string|null} 原始数据，验证失败返回 null
 */
function unsign(signed) {
    const lastDot = signed.lastIndexOf(".");
    if (lastDot === -1) return null;
    const encoded = signed.slice(0, lastDot);
    const sig = signed.slice(lastDot + 1);
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest("base64url");
    // 使用 timingSafeEqual 防止时序攻击
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    return payload;
}

/**
 * 解析请求中的 cookie
 * @param {string} cookieHeader
 * @returns {Object}
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(";").forEach(function (pair) {
        const idx = pair.indexOf("=");
        if (idx > -1) {
            const key = pair.slice(0, idx).trim();
            const val = pair.slice(idx + 1).trim();
            cookies[key] = val;
        }
    });
    return cookies;
}

// ==================== 认证中间件 ====================

/**
 * 解析并验证登录 cookie，设置 req.isAuthenticated
 */
app.use(function (req, res, next) {
    req.isAuthenticated = false;
    const cookies = parseCookies(req.headers.cookie || "");
    const signed = cookies[COOKIE_NAME];
    if (signed) {
        const payload = unsign(signed);
        if (payload === "1") {
            req.isAuthenticated = true;
        }
    }
    next();
});

/**
 * 要求登录的中间件（用于 API 路由）
 */
function requireAuth(req, res, next) {
    if (!req.isAuthenticated) {
        return res.status(401).json({ success: false, error: "未登录，请先登录" });
    }
    next();
}

// ==================== 静态文件 & 页面路由 ====================

// 首页保护：未登录跳转到 /login
app.get("/", function (req, res) {
    if (!req.isAuthenticated) {
        return res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 登录页面
app.get("/login", function (req, res) {
    // 如果已登录，跳回首页
    if (req.isAuthenticated) {
        return res.redirect("/");
    }
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 托管 public 静态文件（CSS、JS 等，注意要在页面路由之后避免覆盖）
app.use(express.static(path.join(__dirname, "public")));

// ==================== 工具函数 ====================

/** 任务数据文件路径 */
const DATA_FILE = path.join(__dirname, "data", "tasks.json");

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 标准化并验证日期字段（startAt / dueAt）
 * @param {any} value - 请求中传入的值
 * @returns {{ value: string|null, error: string|null }}
 */
function normalizeDateField(value) {
    // 空字符串、null 或 undefined → 保存为 null
    if (value === null || value === undefined || value === "") {
        return { value: null, error: null };
    }
    // 不是字符串则视为非法
    if (typeof value !== "string") {
        return { value: null, error: "invalid date" };
    }
    // 校验是否为合法日期
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return { value: null, error: "invalid date" };
    }
    return { value: date.toISOString(), error: null };
}

/**
 * 读取任务数据
 * @returns {Array} 任务对象数组
 */
function readTasks() {
    try {
        // 如果数据文件不存在，创建并写入空数组
        if (!fs.existsSync(DATA_FILE)) {
            const dir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(DATA_FILE, "[]", "utf8");
            return [];
        }
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        console.error("读取 tasks.json 失败:", e.message);
        return [];
    }
}

/**
 * 写入任务数据
 * @param {Array} tasks - 任务对象数组
 */
function writeTasks(tasks) {
    try {
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
    } catch (e) {
        console.error("写入 tasks.json 失败:", e.message);
        throw e;
    }
}

// ==================== 认证 API ====================

/**
 * POST /api/login
 * 登录接口：验证密码，设置 httpOnly cookie
 * 请求体: { password }
 */
app.post("/api/login", function (req, res) {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, error: "请输入密码" });
    }

    if (password !== APP_PASSWORD) {
        return res.status(401).json({ success: false, error: "密码错误" });
    }

    // 生成签名 cookie
    const signedValue = sign("1");
    res.cookie(COOKIE_NAME, signedValue, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
        path: "/",
    });

    res.json({ success: true, message: "登录成功" });
});

/**
 * POST /api/logout
 * 退出登录：清除 cookie
 */
app.post("/api/logout", function (req, res) {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ success: true, message: "已退出登录" });
});

/**
 * GET /api/me
 * 检查当前登录状态
 */
app.get("/api/me", function (req, res) {
    if (req.isAuthenticated) {
        res.json({ success: true, data: { loggedIn: true } });
    } else {
        res.json({ success: true, data: { loggedIn: false } });
    }
});

// ==================== 任务 API 路由（需要登录） ====================

/**
 * GET /api/tasks
 * 获取所有任务列表
 */
app.get("/api/tasks", requireAuth, function (req, res) {
    const tasks = readTasks();
    // 标准化旧任务：没有 startAt/dueAt 的返回 null
    const normalized = tasks.map(function (t) {
        return {
            id: t.id,
            text: t.text,
            priority: t.priority || "medium",
            category: t.category || "其他",
            completed: t.completed || false,
            startAt: t.startAt !== undefined ? t.startAt : null,
            dueAt: t.dueAt !== undefined ? t.dueAt : null,
            createdAt: t.createdAt || null,
            updatedAt: t.updatedAt || null,
        };
    });
    res.json({ success: true, data: normalized });
});

/**
 * POST /api/tasks
 * 新增一个任务
 * 请求体: { text, priority, category }
 */
app.post("/api/tasks", requireAuth, function (req, res) {
    const { text, title, priority, category, startAt, dueAt } = req.body;
    const taskText = text || title;

    // 校验必填字段
    if (!taskText || !taskText.trim()) {
        return res.status(400).json({ success: false, error: "任务内容不能为空" });
    }

    // 标准化并验证 startAt
    const startResult = normalizeDateField(startAt);
    if (startResult.error) {
        return res.status(400).json({ success: false, error: "Invalid startAt" });
    }

    // 标准化并验证 dueAt
    const dueResult = normalizeDateField(dueAt);
    if (dueResult.error) {
        return res.status(400).json({ success: false, error: "Invalid dueAt" });
    }

    // 如果两者都存在且 startAt 晚于 dueAt，返回 400
    if (startResult.value && dueResult.value && startResult.value > dueResult.value) {
        return res.status(400).json({ success: false, error: "startAt cannot be later than dueAt" });
    }

    const now = new Date().toISOString();
    const newTask = {
        id: generateId(),
        text: taskText.trim(),
        priority: priority || "medium",
        category: category || "其他",
        completed: false,
        startAt: startResult.value,
        dueAt: dueResult.value,
        createdAt: now,
        updatedAt: now,
    };

    const tasks = readTasks();
    tasks.unshift(newTask);
    writeTasks(tasks);

    res.status(201).json({ success: true, data: newTask });
});

/**
 * PATCH /api/tasks/:id
 * 修改任务（只更新请求体中传入的字段）
 * 请求体可包含: { text, priority, category, completed }
 */
app.patch("/api/tasks/:id", requireAuth, function (req, res) {
    const { id } = req.params;
    const allowedFields = ["text", "priority", "category", "completed"];
    const dateFields = ["startAt", "dueAt"];

    const tasks = readTasks();
    const index = tasks.findIndex(function (t) { return t.id === id; });

    if (index === -1) {
        return res.status(404).json({ success: false, error: "任务不存在" });
    }

    // 只更新传入的常规字段
    allowedFields.forEach(function (field) {
        if (req.body[field] !== undefined) {
            tasks[index][field] = req.body[field];
        }
    });

    // 处理日期字段 (startAt, dueAt)
    for (var di = 0; di < dateFields.length; di++) {
        var field = dateFields[di];
        if (req.body[field] !== undefined) {
            var result = normalizeDateField(req.body[field]);
            if (result.error) {
                return res.status(400).json({ success: false, error: "Invalid " + field });
            }
            tasks[index][field] = result.value;
        }
    }

    // startAt 和 dueAt 交叉验证：都非 null 时 startAt 不能晚于 dueAt
    var currentStartAt = tasks[index].startAt;
    var currentDueAt = tasks[index].dueAt;
    if (currentStartAt && currentDueAt && currentStartAt > currentDueAt) {
        return res.status(400).json({ success: false, error: "startAt cannot be later than dueAt" });
    }

    // 如果传了 text，去掉首尾空格
    if (req.body.text !== undefined) {
        tasks[index].text = tasks[index].text.trim();
    }

    tasks[index].updatedAt = new Date().toISOString();
    writeTasks(tasks);

    res.json({ success: true, data: tasks[index] });
});

/**
 * DELETE /api/tasks/completed
 * 清空所有已完成任务（必须在 :id 路由之前注册）
 */
app.delete("/api/tasks/completed", requireAuth, function (req, res) {
    const tasks = readTasks();
    const remaining = tasks.filter(function (t) { return !t.completed; });
    const deletedCount = tasks.length - remaining.length;

    // 如果没有可删除的，也返回成功（幂等操作）
    if (deletedCount === 0) {
        return res.json({ success: true, data: { deleted: 0, message: "没有已完成的任务" } });
    }

    writeTasks(remaining);
    res.json({ success: true, data: { deleted: deletedCount, message: "已删除 " + deletedCount + " 个已完成任务" } });
});

/**
 * DELETE /api/tasks/:id
 * 删除指定 id 的任务
 */
app.delete("/api/tasks/:id", requireAuth, function (req, res) {
    const { id } = req.params;
    const tasks = readTasks();
    const index = tasks.findIndex(function (t) { return t.id === id; });

    if (index === -1) {
        return res.status(404).json({ success: false, error: "任务不存在" });
    }

    const deleted = tasks.splice(index, 1)[0];
    writeTasks(tasks);

    res.json({ success: true, data: deleted });
});

// ==================== 启动服务 ====================

app.listen(PORT, function () {
    console.log("✅ StudyMate 服务已启动 → http://localhost:" + PORT);
    console.log("📁 静态文件目录: " + path.join(__dirname, "public"));
    console.log("💾 数据存储文件: " + DATA_FILE);
    console.log("🔐 密码登录保护已启用");
});