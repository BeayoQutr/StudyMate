/* =============================================
   StudyMate - 个人学习任务看板
   主逻辑脚本（后端 API 版本）
   ============================================= */

// ==================== 数据管理 ====================

/**
 * 从后端 API 获取任务列表
 * @returns {Promise<Array>} 任务对象数组
 */
async function loadTasks() {
    try {
        const res = await fetch("/api/tasks");
        if (res.status === 401) {
            window.location.href = "/login";
            return [];
        }
        if (!res.ok) {
            throw new Error("获取任务失败：HTTP " + res.status);
        }
        const json = await res.json();
        if (!json.success) {
            throw new Error("获取任务失败：" + (json.error || "未知错误"));
        }
        return json.data;
    } catch (e) {
        console.error("❌ 加载任务失败:", e.message);
        return [];
    }
}

/**
 * 统一 fetch 封装，自动处理 JSON 响应和错误
 * 当 API 返回 401 时自动跳转到登录页
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function apiFetch(url, options) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        window.location.href = "/login";
        throw new Error("未登录");
    }
    const json = await res.json();
    if (!json.success && !res.ok) {
        throw new Error(json.error || "请求失败");
    }
    return json;
}

/** 当前任务列表（内存中，从后端加载） */
let tasks = [];

// ==================== DOM 元素引用 ====================

const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const categorySelect = document.getElementById("categorySelect");
const startAtInput = document.getElementById("startAtInput");
const dueAtInput = document.getElementById("dueAtInput");
const addBtn = document.getElementById("addBtn");

const filterPriority = document.getElementById("filterPriority");
const filterCategory = document.getElementById("filterCategory");
const clearDoneBtn = document.getElementById("clearDoneBtn");

const taskListEl = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");

const statTotal = document.getElementById("statTotal");
const statDone = document.getElementById("statDone");
const statRate = document.getElementById("statRate");
const statMiniBar = document.getElementById("statMiniBar");

// ==================== 核心函数 ====================

/**
 * 将 datetime-local 输入值转换为 ISO 字符串
 * @param {string} value - datetime-local input value (e.g. "2026-05-12T13:00")
 * @returns {string|null} ISO 字符串或 null
 */
function datetimeLocalToISO(value) {
    if (!value) return null;
    // datetime-local 的 value 格式为 "YYYY-MM-DDTHH:mm" 或 "YYYY-MM-DDTHH:mm:ss"
    // 浏览器默认不带时区，视为本地时间
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
}

/**
 * 将 ISO 日期字符串格式化为本地时间显示
 * @param {string|null} isoStr
 * @returns {string|null} 例如 "2026/5/12 13:00"
 */
function formatDateForDisplay(isoStr) {
    if (!isoStr) return null;
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return year + "/" + month + "/" + day + " " + hours + ":" + minutes;
}

/**
 * 添加任务（调用 POST /api/tasks）
 */
async function addTask() {
    const text = taskInput.value.trim();

    // 校验：不能为空
    if (!text) {
        taskInput.focus();
        taskInput.classList.add("error");
        setTimeout(function () {
            taskInput.classList.remove("error");
        }, 1500);
        return;
    }

    const priority = prioritySelect.value;
    const category = categorySelect.value;

    // 读取日期值
    const startAtRaw = startAtInput.value;
    const dueAtRaw = dueAtInput.value;
    const startAtISO = datetimeLocalToISO(startAtRaw);
    const dueAtISO = datetimeLocalToISO(dueAtRaw);

    // 前端校验：startAt 不能晚于 dueAt
    if (startAtISO && dueAtISO && startAtISO > dueAtISO) {
        alert("开始时间不能晚于截止时间");
        return;
    }

    // 构建请求体
    const body = { text: text, priority: priority, category: category };
    if (startAtISO) body.startAt = startAtISO;
    if (dueAtISO) body.dueAt = dueAtISO;

    try {
        const json = await apiFetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        // 后端返回新任务，插入到数组最前面
        tasks.unshift(json.data);
    } catch (e) {
        console.error("❌ 添加任务失败:", e.message);
        alert("添加任务失败：" + e.message);
        return;
    }

    // 清空输入框
    taskInput.value = "";
    startAtInput.value = "";
    dueAtInput.value = "";
    taskInput.focus();

    // 刷新界面
    refresh();
}

/**
 * 删除任务（调用 DELETE /api/tasks/:id）
 * @param {string} id - 任务 ID
 */
async function deleteTask(id) {
    try {
        await apiFetch("/api/tasks/" + id, { method: "DELETE" });
        tasks = tasks.filter(function (task) {
            return task.id !== id;
        });
    } catch (e) {
        console.error("❌ 删除任务失败:", e.message);
        alert("删除任务失败：" + e.message);
        return;
    }
    refresh();
}

/**
 * 切换任务完成状态（调用 PATCH /api/tasks/:id）
 * @param {string} id - 任务 ID
 */
async function toggleDone(id) {
    const task = tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    const newCompleted = !task.completed;

    try {
        const json = await apiFetch("/api/tasks/" + id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: newCompleted }),
        });
        // 用后端返回的数据更新本地任务
        tasks = tasks.map(function (t) {
            return t.id === id ? json.data : t;
        });
    } catch (e) {
        console.error("❌ 更新任务状态失败:", e.message);
        alert("更新任务状态失败：" + e.message);
        return;
    }
    refresh();
}

/**
 * 清空所有已完成任务（调用 DELETE /api/tasks/completed）
 */
async function clearDoneTasks() {
    const hasDone = tasks.some(function (task) {
        return task.completed;
    });

    if (!hasDone) {
        alert("没有已完成的任务可以清空哦～");
        return;
    }

    if (!confirm("确定要清空所有已完成的任务吗？此操作不可撤销。")) {
        return;
    }

    try {
        const json = await apiFetch("/api/tasks/completed", { method: "DELETE" });
        // 移除本地所有已完成任务
        tasks = tasks.filter(function (task) {
            return !task.completed;
        });
        console.log("✅ " + json.data.message);
    } catch (e) {
        console.error("❌ 清空已完成任务失败:", e.message);
        alert("清空已完成任务失败：" + e.message);
        return;
    }
    refresh();
}

/**
 * 获取当前筛选条件下的任务列表
 * @returns {Array}
 */
function getFilteredTasks() {
    const prio = filterPriority.value;
    const cat = filterCategory.value;

    return tasks.filter(function (task) {
        // 优先级筛选
        if (prio !== "all" && task.priority !== prio) {
            return false;
        }
        // 分类筛选
        if (cat !== "all" && task.category !== cat) {
            return false;
        }
        return true;
    });
}

/**
 * 计算统计信息
 * @param {Array} sourceTasks - 源任务列表
 * @returns {{ total: number, done: number, rate: string }}
 */
function calcStats(sourceTasks) {
    const total = sourceTasks.length;
    const done = sourceTasks.filter(function (t) {
        return t.completed;
    }).length;
    const rate = total === 0 ? "0%" : Math.round((done / total) * 100) + "%";
    return { total: total, done: done, rate: rate };
}

// ==================== 界面渲染 ====================

/**
 * 渲染整个界面
 */
function refresh() {
    updateStats();
    renderTaskList();
}

/**
 * 更新顶部统计卡片
 */
function updateStats() {
    const stats = calcStats(tasks); // 统计全部任务，不受筛选影响
    statTotal.textContent = stats.total;
    statDone.textContent = stats.done;
    statRate.textContent = stats.rate;
    // 更新迷你进度条
    if (statMiniBar) {
        statMiniBar.style.width = stats.rate;
    }
}

/**
 * 根据优先级返回对应的中文标签和样式类
 * @param {string} priority
 * @returns {{ label: string, badgeClass: string }}
 */
function getPriorityInfo(priority) {
    switch (priority) {
        case "high":
            return { label: "高", badgeClass: "badge-high" };
        case "medium":
            return { label: "中", badgeClass: "badge-medium" };
        case "low":
            return { label: "低", badgeClass: "badge-low" };
        default:
            return { label: "中", badgeClass: "badge-medium" };
    }
}

/**
 * 生成任务的时间信息 HTML 片段
 * @param {Object} task
 * @returns {string}
 */
function buildDateInfoHtml(task) {
    var now = new Date();
    var parts = [];

    // 开始时间
    if (task.startAt) {
        var startDisplay = formatDateForDisplay(task.startAt);
        if (startDisplay) {
            var isFuture = !task.completed && new Date(task.startAt) > now;
            var startCls = "task-date" + (isFuture ? " date-hint-future" : "");
            parts.push('<span class="' + startCls + '">开始：' + escapeHtml(startDisplay));
            if (isFuture) {
                parts.push(' <span class="date-hint-badge date-hint-future">未开始</span>');
            }
            parts.push("</span>");
        }
    }

    // 截止时间
    if (task.dueAt) {
        var dueDisplay = formatDateForDisplay(task.dueAt);
        if (dueDisplay) {
            var isOverdue = !task.completed && new Date(task.dueAt) < now;
            var dueCls = "task-date" + (isOverdue ? " date-hint-overdue" : "");
            parts.push('<span class="' + dueCls + '">截止：' + escapeHtml(dueDisplay));
            if (isOverdue) {
                parts.push(' <span class="date-hint-badge date-hint-overdue">已过期</span>');
            }
            parts.push("</span>");
        }
    }

    if (parts.length > 0) {
        return '<div class="task-dates">' + parts.join("") + "</div>";
    }
    return "";
}

/**
 * 渲染任务列表
 */
function renderTaskList() {
    const filtered = getFilteredTasks();

    // 清空列表
    taskListEl.innerHTML = "";

    // 处理空状态
    if (filtered.length === 0) {
        emptyState.classList.remove("hidden");
        // 如果没有任何任务，显示默认空状态
        if (tasks.length === 0) {
            emptyState.querySelector(".empty-title").textContent =
                "还没有任务";
            emptyState.querySelector(".empty-desc").textContent =
                "在上方添加你的第一个学习任务吧！";
        } else {
            // 有任务但被筛选掉了
            emptyState.querySelector(".empty-title").textContent =
                "没有匹配的任务";
            emptyState.querySelector(".empty-desc").textContent =
                "试试调整筛选条件吧～";
        }
        return;
    }

    // 有任务，隐藏空状态
    emptyState.classList.add("hidden");

    // 逐条渲染
    filtered.forEach(function (task) {
        var li = document.createElement("li");
        li.className = "task-item";

        // 优先级信息
        var prioInfo = getPriorityInfo(task.priority);

        // 设置 data-priority 属性，让 CSS 左侧色条生效
        li.setAttribute("data-priority", task.priority);

        // 构建 HTML 内容
        li.innerHTML =
            '<input type="checkbox" class="task-checkbox" ' +
            (task.completed ? "checked" : "") +
            ' data-id="' +
            task.id +
            '">' +
            '<span class="task-badge ' +
            prioInfo.badgeClass +
            '">' +
            prioInfo.label +
            "</span>" +
            '<span class="task-category">' +
            escapeHtml(task.category) +
            "</span>" +
            '<span class="task-text' +
            (task.completed ? " done" : "") +
            '">' +
            escapeHtml(task.text) +
            "</span>" +
            '<button class="task-delete" data-id="' +
            task.id +
            '" title="删除任务">✕</button>' +
            buildDateInfoHtml(task);

        // 绑定复选框事件
        var checkbox = li.querySelector(".task-checkbox");
        checkbox.addEventListener("change", function () {
            toggleDone(this.getAttribute("data-id"));
        });

        // 绑定删除按钮事件
        var deleteBtn = li.querySelector(".task-delete");
        deleteBtn.addEventListener("click", function () {
            deleteTask(this.getAttribute("data-id"));
        });

        taskListEl.appendChild(li);
    });
}

/**
 * HTML 转义，防止 XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// ==================== 事件绑定 ====================

// 点击 "添加任务" 按钮
addBtn.addEventListener("click", addTask);

// 在输入框中按回车键也能添加任务
taskInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addTask();
    }
});

// 筛选条件变化时重新渲染
filterPriority.addEventListener("change", renderTaskList);
filterCategory.addEventListener("change", renderTaskList);

// 清空已完成任务
clearDoneBtn.addEventListener("click", clearDoneTasks);

// ==================== 初始化 ====================

// 页面加载时从后端拉取任务并渲染
loadTasks().then(function (data) {
    tasks = data;
    refresh();
}).catch(function (e) {
    console.error("❌ 初始化失败:", e.message);
    refresh(); // 即使失败也渲染空状态
});