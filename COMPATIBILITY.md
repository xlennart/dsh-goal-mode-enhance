# 兼容性 / Compatibility

## 已验证环境（Verified environment）

| 项 | 值 |
|---|---|
| 验证日期 | 2026-08-24 |
| 插件版本 | 0.1.0 |
| DSH 包版本 | `@deepseek-ai/*` **0.1.1-rc.2** |
| 宿主 | DSH Desktop 2.0.2（web profile，Windows 11） |
| 安装形态 | A（`dsh plugin --profile web add`，随宿主启动挂载） |

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

- 运行时 `@deepseek-ai/*` 依赖全部声明为 **optional peerDependencies `*`**：宿主 profile
  提供实际实现，插件不锁定 harness 版本；缺失时宿主按 optional peer 规则跳过。
- `@deepseek-ai/dsh-*` 未锁定公共 npm 版本，因此 CI 只做**构建门禁**
  （esbuild + `@deepseek-ai/schemastery`，所有 `@deepseek-ai/dsh-*` 导入保持 external），
  类型检查在本地 dsh 源码克隆旁侧开发时执行（`pnpm run check`）。
