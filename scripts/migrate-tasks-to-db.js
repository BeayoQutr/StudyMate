/* =============================================
   StudyMate - 任务数据迁移脚本
   data/tasks.json → PostgreSQL tasks 表
   可重复运行（ON CONFLICT DO UPDATE）
   ============================================= */

require("dotenv").config();

const path = require("path");
const fs = require("fs");
const db = require("../db");

const DATA_FILE = path.join(__dirname, "..", "data", "tasks.json");

/**
 * 标准化日期值，无效则返回 null
 * @param {any} value
 * @returns {string|null}
 */
function normalizeDate(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    if (typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return null;
}

/**
 * 读取 tasks.json
 * @returns {Array}
 */
function readTasksFromFile() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            console.log("⚠️  data/tasks.json 不存在，没有任务需要迁移");
            return [];
        }
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const tasks = JSON.parse(raw);
        if (!Array.isArray(tasks)) {
            console.error("❌ data/tasks.json 格式错误（不是数组）");
            return [];
        }
        return tasks;
    } catch (err) {
        console.error("❌ 读取 data/tasks.json 失败:", err.message);
        return [];
    }
}

/**
 * 主迁移函数
 */
async function migrate() {
    console.log("==============================================");
    console.log("  StudyMate 任务数据迁移");
    console.log("  data/tasks.json → PostgreSQL");
    console.log("==============================================");
    console.log("");

    // 1. 初始化数据库（确保 tasks 表存在）
    console.log("📋 检查数据库连接...");
    try {
        await db.initDb();
    } catch (err) {
        console.error("❌ 数据库初始化失败:", err.message);
        process.exit(1);
    }

    // 2. 读取 JSON 文件
    const tasks = readTasksFromFile();
    console.log("📄 从 data/tasks.json 读取到 " + tasks.length + " 条任务");
    console.log("");

    if (tasks.length === 0) {
        console.log("✅ 没有任务需要迁移");
        process.exit(0);
    }

    // 3. 逐条导入
    let importedCount = 0;
    let skippedCount = 0;

    for (const task of tasks) {
        // 校验必填字段 text
        if (!task.text || (typeof task.text === "string" && task.text.trim() === "")) {
            skippedCount++;
            console.warn(
                "⚠️  跳过异常任务（text 为空）：id=" + (task.id || "(无 id)") +
                ", category=" + (task.category || "(无分类)")
            );
            continue;
        }

        const id = task.id;
        const text = task.text.trim();
        const priority = task.priority || "medium";
        const category = task.category || "默认";
        const completed = Boolean(task.completed);
        const startAt = normalizeDate(task.startAt);
        const dueAt = normalizeDate(task.dueAt);
        const createdAt = normalizeDate(task.createdAt) || new Date().toISOString();
        const updatedAt = normalizeDate(task.updatedAt) || new Date().toISOString();

        try {
            await db.query(
                `INSERT INTO tasks (id, text, priority, category, completed, start_at, due_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET
                     text = EXCLUDED.text,
                     priority = EXCLUDED.priority,
                     category = EXCLUDED.category,
                     completed = EXCLUDED.completed,
                     start_at = EXCLUDED.start_at,
                     due_at = EXCLUDED.due_at,
                     created_at = EXCLUDED.created_at,
                     updated_at = EXCLUDED.updated_at`,
                [id, text, priority, category, completed, startAt, dueAt, createdAt, updatedAt]
            );
            importedCount++;
        } catch (err) {
            skippedCount++;
            console.error("❌ 导入任务失败（id=" + id + "）:", err.message);
        }
    }

    // 4. 输出统计
    console.log("");
    console.log("==============================================");
    console.log("  迁移完成");
    console.log("==============================================");
    console.log("  读取任务数: " + tasks.length);
    console.log("  成功导入: " + importedCount);
    console.log("  跳过: " + skippedCount);
    console.log("==============================================");

    // 正常退出
    process.exit(0);
}

migrate().catch(function (err) {
    console.error("❌ 迁移过程异常:", err.message);
    process.exit(1);
});