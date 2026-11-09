# 兼容性 / Compatibility

## 已验证环境（Verified environment）

| 项 | 值 |
|---|---|
| 验证日期 | 2026-08-24 |
| 插件版本 | 0.1.0 |
| DSH 包版本 | `@deepseek-ai/*` **0.1.1-rc.2** |
| 宿主 | DSH Desktop 2.0.2（web profile，Windows 11） |
| 安装形态 | A（`dsh plugin --profile web add`，随宿主启动挂载） |

## 0.2.1 适配（2026-11-09）

插件 0.2.1 适配 `@deepseek-ai/*` **0.2.2-rc.1**（DSH 宿主 0.2.2-rc.1）。相对 0.2.0 的破坏点与修法：

| 破坏点 | 0.2.0-rc.2 的形态 | 0.2.2-rc.1 的形态 | 本插件修法 |
|---|---|---|---|
| Session 标准 props 的归属 | 由 slots 包自带（`useProjection`、`sessionId`、`useAccess` 直接可用） | 迁到 `@deepseek-ai/dsh-client-ui-session`，靠该包的声明合并注入 | `import type {} from '@deepseek-ai/dsh-client-ui-session/client'`，并把该包写进 `dsh.client.inject` |
| `SessionReferenceSourceMap` 基座 | 含 `mainView` 等 UI 来源标签 | 基座只剩 `controllerOperation` / `gateway`；`mainView` 由 ui-session 声明 | 同上一处 type-only 导入即恢复 `retainedBy.mainView` 推导 |
| 插槽 `inject` 回调参数 | 固定 `SessionId` | `SessionIdOf`（取 `SessionStandardProps.sessionId`，未合并时回落 `string`） | 回调参数不再显式标注品牌类型，避免 TS2769 |
| 依赖形态 | `devDependencies` 为本地 `link:../dsh-src/...` | 同上，且 `dsh-client-runtime` / `dsh-invariants` / `dsh-client-ui-primitives` 已从发布线移除 | 全部改为公开发布版本 `0.2.2-rc.1`（cordis `^4.1.0`、schemastery `^3.19.0` 走各自版本线） |
| 兼容性判定来源 | peer `@deepseek-ai/dsh*` 声明 | 包自身 `engines.dsh` 单独决定（存在时 peer 被忽略） | 声明 `"engines": { "dsh": ">=0.2.2-rc.1 <0.3.0-0" }`：接受 0.2.2 及其后的 0.2.x，排除 0.2.2 之前的 rc 与 0.3.0 预发布 |

验证链（本地，2026-11-09）：

1. `npm install`（公开发布版依赖）→ `npx tsc --noEmit` 对 0.2.2-rc.1 类型零错误。
2. `node build.mjs` → `lib/index.js`（host 半，ESM）、`lib/client.js`（client 半，CJS 工厂 + banner 握手），并拦截 Host-only 依赖泄漏。
3. `node scripts/smoke-client.mjs` → 复现 `window.__ModuleLoader__.load({ id, factory })` 握手，用 stub client Context 跑插件体，断言 `conversation.input.dock:goal`、`conversation.input.left:goal-mode`、`settings.general.item:goal-mode`、`settings.section:goal-mode` 四处注册与 `inject` 服务面。
4. `node -e "import('./lib/index.js')"` → host 半可加载，导出 `apply` / `Config` / 设置常量。

## 0.2.0 适配（2026-09-30）

插件 0.2.0 适配 `@deepseek-ai/*` **0.2.0-rc.2**（DSH Desktop 0.2.0-rc.2）。主要 API 迁移：

| 0.1.1-rc.2 | 0.2.0-rc.2 |
|---|---|
| `settingsScope` 服务绑定 | `configForms` 服务（`ctx.configForms.get<GoalModeSettings>(ns)`） |
| host 半 `settings.register(namespace, schema)` | entry `Config`（volatile 字段）+ `settings.configure({ auto: false })` |
| `@deepseek-ai/dsh-client-runtime`（快照引擎） | `@deepseek-ai/dsh-client-store` |
| `SessionListState.current`（设置页当前会话） | `retainedBy.mainView > 0` 主视图会话（与 workspace 浏览器同款推导） |
| `RemoteResult` 宽松错误码 | 错误码强类型化；本地失败单列 `GoalModeLocalFailure`（`busy` / `no-current-goal`） |
| `RemoteResult` / `SessionId` 导入家 | `@deepseek-ai/dsh-api-remotes/client` / `@deepseek-ai/dsh-session/types` |
| `./invariant` 空 installer 伴随件 | 按 0.2 纪律移除（空伴随件无效，缘由记入 README） |

- 条目 id 改为 `ui-goal-mode`（= 设置段名）：旧 `settings.yaml` 的 `ui-goal-mode` 段由宿主
  `importLegacyDocument` 自动并入该条目 config override，偏好无感迁移。
- 0.2 的 client 加载契约不变（`window.__ModuleLoader__.load` CJS 工厂 + `/plugins/<entry id>/client.js`）；
  banner 模块 id 用包名 `dsh-goal-mode`（服务路由 id 与模块 id 在官方包本就分离）。
- rc.1 → rc.2 对本插件依赖的 16 个包只有版本位与 locale 增量，无 API 面。
- 插件 0.2.0 **需要** 0.2 运行时（`configForms` 服务 0.1 不存在）；运行 0.1.x 宿主请安装插件 0.1.0。

## 已知形态差异（Known form difference）

`goal_overview` 动态模型工具与包私有 RPC（跨会话持久化历史合并）目前只在**形态 B**
（`host.js` / `client.js` 动态加载）中注册；**形态 A**（本 tarball 安装的正式包）的 host 半
只声明设置 Config，数据操作走 `ctx.remote.goals`。形态 B 未随 0.2 适配（动态加载为
开发调试形态）。两条形态计划统一（见 ROADMAP.md）。

## 版本策略（Version policy）

- 兼容性由包自身 `engines.dsh` 声明（`>=0.2.2-rc.1 <0.3.0-0`）：0.2.2-rc.1 起的宿主按该字段单独判定，
  不接受 0.2.2 之前的 rc，也不接受 0.3.0 预发布。
- 运行时 `@deepseek-ai/*` 依赖仍全部声明为 **optional peerDependencies `*`**：宿主 profile 提供实际实现，
  插件不锁定 harness 版本；缺失时宿主按 optional peer 规则跳过。
- `devDependencies` 锁定公开发布版 `0.2.2-rc.1`（cordis / schemastery 走各自版本线），因此类型检查与构建
  不再需要本地 harness 源码克隆。
- CI 只做**构建门禁**+ **离线冒烟**（esbuild 打包、`scripts/smoke-client.mjs` 复现加载握手并断言注册），
  所有 `@deepseek-ai/dsh-*` 导入保持 external 由宿主提供。
