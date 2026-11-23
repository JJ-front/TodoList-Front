# TodoList · 每周待办

React + Vite 写的周视图待办面板：每天一列，显示日期、完成进度，支持把任务卡片**拖到任意一天**重新排期。数据不放在浏览器里，而是**直接读写项目目录中的 `data/todos.json`**。

![预览](./preview.png)

## 运行

```bash
npm install      # 已装好可跳过
npm run dev      # http://localhost:5173
```

打包预览（同样能读写数据文件）：

```bash
npm run build
npm run preview  # http://localhost:4173
```

## 数据存储

数据文件：**`data/todos.json`**

浏览器不能直接写本地文件，所以用 Vite 插件在开发/预览服务器上挂了一个极小的接口（`vite.config.js` 里的 `todosFileApiPlugin`）：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/api/todos` | 返回 `data/todos.json` 内容 |
| `PUT` | `/api/todos` | 用请求体覆盖写入 `data/todos.json`，并带上 `updatedAt` |

前端每次改动（勾选、新增、拖动、删除、重命名）都会在 320ms 抖动后整表写回文件，右上角状态灯会显示「保存中… / 已写入 data/todos.json」。

数据结构：

```json
{
  "version": 1,
  "updatedAt": "2026-11-17T08:53:31.018Z",
  "taskFields": [
    { "key": "cost", "label": "耗时", "type": "text" },
    { "key": "reason", "label": "原因", "type": "text", "hideWhenDone": true },
    { "key": "followup", "label": "后续安排", "type": "text", "hideWhenDone": true }
  ],
  "residentFields": [
    { "key": "progress", "label": "进度", "type": "text" },
    { "key": "url", "label": "链接", "type": "link" }
  ],
  "residentGroupBy": null,   // 常驻任务按哪个字段分组（字段 key；null = 不分组）
  "todos": [
    {
      "id": "seed-1",
      "title": "梳理本周 OKR 与优先级",
      "date": "2026-11-17",   // null = 未安排（左侧收集箱）
      "done": false,
      "values": {              // 自定义字段的值，键名对应 taskFields[].key
        "cost": "1.5h"
      },
      "order": 0,
      "createdAt": "2026-11-17T08:00:00.000Z"
    },
    {
      "id": "seed-2",
      "title": "投递简历",
      "date": "2026-11-17",
      "done": true,
      "cost": "0.5h",          // 旧数据兼容：平铺的 cost / reason / followup 仍能读取
      "order": 1,
      "createdAt": "2026-11-17T08:10:00.000Z"
    },
    {
      "id": "company-1",
      "title": "某公司",        // 常驻任务：公司名
      "date": "__resident__",
      "values": {              // 常驻任务：字段值，键名对应 residentFields[].key
        "progress": "一面",
        "url": "zhipin.com/job_detail/xxx"
      },
      "order": 0,
      "createdAt": "2026-11-17T08:20:00.000Z"
    }
  ]
}
```

> `taskFields` 是「未安排 / 每日任务卡」的自定义字段（列头「字段」里修改），对所有任务卡生效；`hideWhenDone` 表示任务完成后隐藏该字段（默认的「原因 / 后续安排」保留了这个行为）。`residentFields` 是「常驻任务」列的自定义字段，只对常驻卡片生效。两者都没有配置时，分别退回默认的「耗时 / 原因 / 后续安排」和「进度 / 链接」。旧数据里平铺的 `cost`、`reason`、`followup`、`progress`、`url` 都能读取，改动后会写进 `values`。`residentGroupBy` 记录常驻任务当前按哪个字段的值分组，只影响「常驻任务」这一列的显示，不会改动任务数据；对应字段被删除时会自动清空。

> 直接用 `file://` 打开 `dist/index.html`（没有服务器）时，接口不可用，会自动退回 `localStorage`，页面底部会标明「浏览器 localStorage」。

## 功能与交互

- **每日日期**：周一至周日各一列，列头显示星期、`M 月 D 日`，以及「昨天 / 今天 / 明天 / 后天」标记；今天那列有高亮底色。
- **完成状态**：未完成卡片左侧是**红色叉叉**，完成后变成实心勾（蓝绿渐变），文字加删除线、卡片置灰；每列底部有 `已完成/总数` 进度条。
- **原因 / 后续安排 / 耗时**：卡片下方是**双击才可编辑**的字段区 —— 「耗时」无论完成与否都能填（如 `1.5h`、`40 分钟`），「原因」「后续安排」只在未完成卡片上出现。折叠态只显示文字（空值显示 `—`，过长省略、悬停看全文），双击进入编辑、回车或点卡片外面收起，改动即时写进数据文件。
- **自定义字段**：点「未安排」列头的「字段」按钮可改字段名、添加 / 删除字段、在「文本 / 链接」之间切换类型（如新增「来源」「JD」「优先级」）；这套字段对所有任务卡（未安排 + 每日列）生效，拖到别的日期也会保留字段值。
- **拖拽排期**：按住卡片拖到任意一天的列里即改日期；拖进列内不同位置可调整顺序（拖动时有插入位置指示线和目标列高亮）；拖回「未安排」列即取消排期。
- **新增 / 重命名 / 删除**：列底「＋ 添加任务」回车保存、Esc 取消；双击标题改文字；双击卡片下方字段区改自定义字段；悬停卡片右侧出现删除按钮。
- **周切换**：← / → 翻上一周/下一周，「回到本周」一键跳回；若有任务落在别的周，顶部会提示「另有 N 项在其他周」。
- **未安排收集箱**：横向滚动时固定在左侧（sticky），方便随时把任务拖到当前可见的某一天。
- **常驻任务**：日期列之外的固定一列，用来每天跟进简历投递进度。列底「＋ 添加公司」输入公司名回车保存；卡片显示公司名和自定义字段，双击字段区可编辑。点列头的「字段」可**自定义字段**：改字段名、添加 / 删除字段、在「文本 / 链接」之间切换类型（所有卡片共用这套字段）；链接字段填 `zhipin.com/xxx` 这种省略协议的地址也能直接点开（自动补 `https://`）。常驻任务不参与拖拽排期，也不计入「今日 / 全部完成」，只在顶部单独统计「常驻跟进」数量。
- **按字段值分组**：点常驻任务列头的「分组」按钮，可选择按某个文本字段的值分组（例如「状态」→ 待反馈 / 挂掉），组内卡片按公司排列、组头显示组名和数量；组按数量从多到少排序，没填值的归到「未填写」。选「不分组」即可还原，选择结果会写进数据文件的 `residentGroupBy`，刷新后仍保留。
- 跟随系统深浅色（`prefers-color-scheme`），窄屏自动切为可横向滑动 + scroll-snap 的单列浏览。

## 目录结构

```
TodoList-Front/
├─ data/todos.json          # 数据文件（唯一数据源）
├─ index.html
├─ vite.config.js           # React 插件 + data/todos.json 读写中间件
└─ src/
   ├─ main.jsx
   ├─ App.jsx               # 状态、周视图、增删改移逻辑
   ├─ styles.css
   ├─ components/
   │  ├─ DayColumn.jsx      # 一列（含拖拽落点计算、内联添加、未安排列的字段设置）
   │  ├─ FieldManager.jsx   # 自定义字段面板（改名、增删、文本/链接类型）
   │  ├─ ResidentColumn.jsx # 常驻任务列（添加公司、自定义字段、按字段值分组）
   │  ├─ ResidentItem.jsx   # 常驻任务卡片（公司名 + 自定义字段值）
   │  └─ TodoItem.jsx       # 任务卡片（勾选、双击重命名、拖拽源、自定义字段）
   └─ lib/
      ├─ date.js            # 本地时区日期工具（周一为周起点）
      ├─ fields.js          # 字段默认值、规范化、链接工具
      └─ store.js           # /api/todos 读写 + localStorage 兜底
```

## 说明

- `data/todos.json` 里预置了几条示例任务（日期落在 2026-11-16 ~ 11-22 这一周），可以直接改成你自己的数据，或全部删掉重新添加。
- 日期一律按**本地时区**格式化为 `YYYY-MM-DD`，避免 `toISOString()` 的 UTC 偏移把深夜任务算到前一天。
