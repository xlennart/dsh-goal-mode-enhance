# 安装指南

本仓库提供两种形态：**A 正式插件包**（推荐，稳定、可注册安装）与 **B 动态插件源码**（备选，会话内加载）。

## 形态 A：正式插件（推荐）

### 方式 A1：GitHub Release 预构建包（推荐）

仓库的 Release 附带预构建 tarball（含 `lib/` 构建产物，无需本地构建）：

```sh
# 1. 从 Release 下载 tarball（最新或固定版本）：
#    https://github.com/KarlOfLaw/dsh-goal-mode-enhance/releases/latest/download/dsh-goal-mode-0.2.0.tgz

# 2. 装进 web profile（指向下载的 tgz 文件）
dsh plugin --profile web add E:\downloads\dsh-goal-mode-0.2.0.tgz

# 3. 重启 DSH Desktop（或重启 dsh web）
```

> 说明：插件运行所需的 `@deepseek-ai/dsh-*`（0.2.0-rc.2）不做公共 npm 版本锁定，
> 且本仓库的开发依赖以 `link:` 指向本地 deepseek-harness 源码克隆做类型解析，因此
> **从 GitHub 源码直接安装不可用**，预构建 tarball 是规范认可的正式安装路径。运行时
> 依赖（`@deepseek-ai/*`）全部以 optional peer 声明，由宿主 profile 提供，tarball 内
> 不含、也不需要它们。

### 方式 A2：本地构建后安装（开发者）

要求：Node.js + pnpm（插件依赖 deepseek-harness 源码克隆做类型解析，见 `package.json` 的 `link:` devDependencies；需将本仓库放在该克隆的旁侧目录，如 `E:\DSH_Work\dsh-side-chat\output\upstream\deepseek-harness`）。

```sh
# 1. 安装依赖并构建
pnpm install
pnpm run build

# 2. 装进 web profile
dsh plugin --profile web add file:/path/to/dsh-goal-mode

# 3. 重启 dsh web（或刷新页面）
```

卸载：

```sh
dsh plugin --profile web remove dsh-goal-mode
```

### 更新本地插件

`file:` 协议的本地依赖，pnpm 用 link 处理（不校验内容变化），`pnpm add --force` 不会刷新旧 bundle。更新请任选其一：

- **版本号递增**后重新 `add`；
- 先 `remove` 再 `add`；
- 或手动把构建产物（`lib/`）同步进 profile 的 `node_modules/dsh-goal-mode/`。

## 形态 B：动态插件（备选）

在任意 DSH 会话里，把 `host.js` / `client.js` 的内容分别作为 `code.host` / `code.client`，用 `cordis_define` + `cordis_run` 加载（idPrefix `goal`，name `goal-mode`）。详情见两个文件顶部注释。

> 形态 B 是会话级：每个会话需各自加载一次，页面刷新需重新激活。

## 两种形态的功能差异

形态 B 的 host 半额外包含：`goal_overview` 动态模型工具、包私有 RPC 与跨会话持久化历史合并。形态 A 当前注册设置命名空间与浏览器 UI，数据操作走 `ctx.remote.goals`。两条形态计划在后续版本统一（见 ROADMAP.md）。

## 注意事项

- 目标是**会话级**的：bar 显示的是当前会话的目标。
- 目标数据持久化在会话日志中，插件重启不丢失。
