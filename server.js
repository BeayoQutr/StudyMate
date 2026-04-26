/* =============================================
   StudyMate - Express 后端服务
   数据存储: data/tasks.json
   ============================================= */

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 请求体
app.use(express.json());

// 托管 public 静态文件
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

// ==================== API 路由 ====================

/**
 * GET /api/tasks
 * 获取所有任务列表
 */
app.get("/api/tasks", (req, res) => {
    const tasks = readTasks();
    res.json({ success: true, data: tasks });
});

/**
 * POST /api/tasks
 * 新增一个任务
 * 请求体: { text, priority, category }
 */
app.post("/api/tasks", (req, res) => {
    const { text, title, priority, category } = req.body;
    const taskText = text || title;

    // 校验必填字段
    if (!taskText || !taskText.trim()) {
        return res.status(400).json({ success: false, error: "任务内容不能为空" });
    }

    const now = new Date().toISOString();
    const newTask = {
        id: generateId(),
        text: taskText.trim(),
        priority: priority || "medium",
        category: category || "其他",
        completed: false,
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
app.patch("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const allowedFields = ["text", "priority", "category", "completed"];

    const tasks = readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: "任务不存在" });
    }

    // 只更新传入的字段
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            tasks[index][field] = req.body[field];
        }
    });

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
app.delete("/api/tasks/completed", (req, res) => {
    const tasks = readTasks();
    const remaining = tasks.filter((t) => !t.completed);
    const deletedCount = tasks.length - remaining.length;

    // 如果没有可删除的，也返回成功（幂等操作）
    if (deletedCount === 0) {
        return res.json({ success: true, data: { deleted: 0, message: "没有已完成的任务" } });
    }

    writeTasks(remaining);
    res.json({ success: true, data: { deleted: deletedCount, message: `已删除 ${deletedCount} 个已完成任务` } });
});

/**
 * DELETE /api/tasks/:id
 * 删除指定 id 的任务
 */
app.delete("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const tasks = readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: "任务不存在" });
    }

    const deleted = tasks.splice(index, 1)[0];
    writeTasks(tasks);

    res.json({ success: true, data: deleted });
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
    console.log(`✅ StudyMate 服务已启动 → http://localhost:${PORT}`);
    console.log(`📁 静态文件目录: ${path.join(__dirname, "public")}`);
    console.log(`💾 数据存储文件: ${DATA_FILE}`);
});