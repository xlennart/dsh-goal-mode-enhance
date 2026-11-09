# dsh-goal-mode

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面提供**可视化 goal 模式**的插件。

把原本只能靠对话命令（`/goal`）和模型工具（`create_goal` / `get_goal` / `update_goal`）操作的目标系统，变成**看得见、点得动**的界面。

[English](README.md) | 中文

## 两种形态

本仓库同时提供两种形态，推荐使用 **A（正式插件，稳定、可注册安装）**：

| 形态 | 说明 | 适合 |
|---|---|---|
| **A. 正式插件包**（推荐） | 独立 npm 包结构（`dsh.plugin.json` + `cordis.patch.yml` + 构建产物），`dsh plugin add` 安装，页面刷新/重启不丢 | 日常使用、分享给他人 |
| **B. 动态插件源码**（保留） | 会话内 `cordis_define` + `cordis_run` 加载（`host.js` / `client.js`） | 快速试玩、调试 |

## 功能（形态 A）

- **完整生命周期目标栏**（composer 上方，`conversation.input.dock`，替换内置 goal 条）：
  - 无目标时：`◎` 按钮展开「设定目标」创建表单
  - 有目标时：状态标签 + 目标文本 + **轮次进度条与 n/上限** + **已达上限**徽标
  - 图标按钮：⏸ 暂停 / ▶ 恢复 / ✎ 编辑（多行）/ ✓ 完成 / 🗑 清除 / 收起
  - 已完成：完成横幅 + 「开始新目标」
- **多行编辑/创建**：目标内容用多行文本框（自动换行、可拖高、`Ctrl+Enter` 提交），可同框设置轮次上限
- **Composer 工具行入口**（`conversation.input.left`）：`◎` 目标按钮 + 阶段色点（绿=进行中 / 黄=暂停 / 红=阻塞），点击展开/收起目标栏；目标栏可折叠为内容自适应胶囊
- **General 设置开关**（`settings.general.item`）：「在输入框工具行显示目标入口」，经 `ui-goal-mode` 设置段持久化
- **独立「目标」设置页**（`settings.section`）：展示当前会话的目标状态、轮次和紧凑目标预览，长目标可按需展开，并附使用说明
- **零空闲干扰**：未设置目标时，composer 上方不渲染任何内容（除非创建表单显式打开）

## 截图

**目标栏——完成态（与原生任务条同屏共存）**

![goal dock with native todo strip](assets/screenshot-goal-dock.png)

**创建表单（多行目标 + 轮次上限）**

![goal create form](assets/screenshot-goal-create.png)

**折叠胶囊（工具行入口点击展开/收起）**

![collapsed goal chip](assets/screenshot-goal-chip.png)

## 原理

| 部分 | 实现 |
|---|---|
| 数据展示 | `useProjection('goal')` 实时投影（含实时 `roundsStarted`），零轮询 |
| 操作通道 | `ctx.remote.goals`（web 装配的 api-remotes 挂载的 Remote 命名空间），带 CAS revision 乐观并发 |
| 偏好持久化 | host 半以 `ui-goal-mode` 条目 `Config` 暴露设置表单，client 经 `configForms` 镜像 Host 段落 |
| UI 落点 | `conversation.input.dock`（goal 单元，priority -10 覆盖内置条）、`conversation.input.left`、`settings.general.item`、`settings.section` |
| 图标 | 内联 SVG 线条图标（Feather 风格，`currentColor` 随主题） |

数据本身存储在会话日志（`goal/change` 事件），持久化由引擎保证，插件只负责展示与操作。

## 安装

- **形态 A（正式插件）**：推荐直接使用 [Release 预构建 tarball](https://github.com/xlennart/dsh-goal-mode-enhance/releases/latest/download/dsh-goal-mode-0.2.1.tgz)——`dsh plugin --profile web add <tgz 路径>` 后重启即可；开发者本地构建方式见 [INSTALL.md](./INSTALL.md)。已验证的 DSH 版本兼容性结论见 [COMPATIBILITY.md](./COMPATIBILITY.md)。
- **形态 B（动态插件）**：见 `host.js` / `client.js` 顶部注释，会话内 `cordis_define` + `cordis_run` 加载。

## 仓库结构

```
dsh-goal-mode/
├── src/                      # 形态 A 插件源码
│   ├── index.ts              # host 半：ui-goal-mode 条目 Config + 设置页策略
│   ├── settings-contract.ts  # 浏览器安全的设置常量/类型（host 与 client 共享）
│   └── client/
│       ├── index.ts          # 插件主体：注册 dock 条 / composer 入口 / 设置行
│       ├── GoalBar.tsx       # 目标栏 / 创建 / 编辑 / 胶囊 / composer 按钮
│       ├── ComposerEntryRow.tsx  # 设置开关行
│       ├── GoalSettingsSection.tsx # 独立目标设置页（主视图会话）
│       ├── settings-policy.ts    # 偏好策略（configForms 镜像）
│       ├── store.ts          # 查看状态（页面内）
│       ├── slots.ts / locales.ts / styles.ts
├── build.mjs                 # esbuild 单文件构建（host ESM + client CJS bundle）
├── dsh.plugin.json           # 插件清单
├── cordis.patch.yml          # web profile patch 挂载（条目 id：ui-goal-mode = 设置段名）
├── package.json / tsconfig.json / pnpm-workspace.yaml
├── host.js                   # 形态 B 动态插件 host 半（保留，未随 0.2 适配）
├── client.js                 # 形态 B 动态插件 client 半（保留，未随 0.2 适配）
├── INSTALL.md                # 安装指南
└── README.md
```

> 0.2.0 起不发布运行库不变式伴生（`./invariant`）：插件只有槽位注册（HMR 安全性已
> 由宿主规范约束）与设置表单投影（归 settings 服务所有），没有可独立分叉的观测点，
> 空 installer 在 0.2 纪律下不再合规。

## 要求

- DeepSeek Harness（Web GUI，`web` profile）`@deepseek-ai/*` **0.2.2-rc.1及以上**（Session 标准 props 由 `dsh-client-ui-session` 提供，兼容性由 `engines.dsh` 判定；插件 0.2.0 对应 0.2.0-rc.2，0.1.0 对应 0.1.1-rc.2）
- 目标系统内置（`goals` 服务 + `goal` 投影）

## License

MIT
