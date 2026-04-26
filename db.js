/* =============================================
   StudyMate - PostgreSQL 数据库连接模块
   ============================================= */

const { Pool } = require("pg");

let pool = null;

/**
 * 获取数据库连接池（懒初始化）
 * @returns {Pool|null}
 */
function getPool() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        return null;
    }
    if (!pool) {
        pool = new Pool({
            connectionString: dbUrl,
            // Render 等云平台需要 SSL
            ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")
                ? false
                : { rejectUnauthorized: false },
        });
        pool.on("error", function (err) {
            console.error("⚠️ 数据库连接池异常:", err.message);
        });
    }
    return pool;
}

/**
 * 执行 SQL 查询
 * @param {string} text - SQL 语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Object>} 查询结果
 */
async function query(text, params) {
    const currentPool = getPool();
    if (!currentPool) {
        throw new Error("DATABASE_URL 未配置，数据库不可用");
    }
    return currentPool.query(text, params);
}

/**
 * 初始化数据库表结构
 * 如果 tasks 表不存在则创建
 */
async function initDb() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.log("ℹ️  未配置 DATABASE_URL，将继续使用 JSON 文件存储");
        return;
    }

    try {
        await query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                category TEXT NOT NULL DEFAULT '默认',
                completed BOOLEAN NOT NULL DEFAULT false,
                start_at TIMESTAMPTZ,
                due_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        console.log("✅ 数据库表已就绪（tasks）");
    } catch (err) {
        console.error("❌ 数据库初始化失败:", err.message);
        console.log("ℹ️  将继续使用 JSON 文件存储");
    }
}

module.exports = { query, initDb };