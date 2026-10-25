---
description: "天鉴品牌在侧栏的占位实现，仅在 tianjian 构建生效；供选择或替换品牌展示的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-tianjian

[English](README.md) | 中文

## 摘要

本包让 `tianjian` 客户端构建在侧栏显示天鉴标记与名称，是官方 web 工作台薄壳的品牌缝（ADR-0011）。其他构建 profile 保留壳层兜底；对话 hero 恒为声明方包的动画鱼形兜底。唯一模块级状态是资产漂移的一次性告警标志；不参与模型请求。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与待办](#known-limitations-and-deferred-work)
- [开发者备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在天鉴壳层的浏览器 roster 中挂载本插件，并以 `tianjian` profile 构建客户端，占位才会注册。同一 roster 保留官方品牌行；两个包各自按构建 profile 自启停，因此同一时刻只渲染一组品牌。

### 选择 profile

`DSH_CLIENT_BUILD_PROFILE` 决定渲染哪组品牌：`tianjian` 构建显示天鉴标记与名称；其他取值保留壳层兜底。对话 hero 无论何种 profile 都显示 `dsh-client-ui-conversation` 的动画鱼形兜底。插件在两种情况下都会加载与校验，仅注册被 profile 门控。

### 替换品牌

需要自有品牌形象的部署可不挂本包，改由其他占位包接管侧栏 slot；占位是唯一组合路径，本包不提供品牌配置面。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 —— 点击展开</summary>

两个占位以一组「声明感知注册」安装：嵌套的 `ctx.slots.inject()` 等待侧栏声明，因此本行无论先于或晚于声明方激活都能生效；声明坍缩时两个占位一并撤回；HMR 期间不留半套品牌。浏览器半在 [`src/client/index.ts`](src/client/index.ts)；node 半为空 Loader 席位。浏览器标题由构建环境 `DSH_CLIENT_TITLE` 决定，不在 slot 系统内。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [ui-sidebar](../ui-sidebar/README.zh.md) —— 声明 `sidebar.brand.mark` / `sidebar.brand.name` 并渲染其兜底。
- [ui-conversation](../ui-conversation/README.zh.md) —— 在 hero 声明 `conversation.hero.brand.mark`。
- [Web client architecture](../../../docs/subsystems/web-client.zh.md) —— 浏览器插件行如何加载与注册 slot。

-----

<a id="model-experience"></a>
## 模型体验

无，本包仅提供浏览器侧展示，不进入任何模型请求。

#### KV 缓存影响

无；本包既不组装也不发送任何 provider 请求。

## 已知限制与待办

<a id="known-limitations-and-deferred-work"></a>

以下限制界定品牌展示的供给方式，属当前包约束而非品牌设计对比或任务积压。

- **单一占位组** —— 其他品牌呈现需另起 Cordis 包接管同一批 slot。
- **浏览器标题独立** —— 标题文字由构建期 `DSH_CLIENT_TITLE` 决定，不经由 UI slot。
- **资产漂移时降级、永不抛错** —— 若标记 SVG 丢失固定 `160px` 画布，渲染短名文本并只告警一次；`pnpm check:brand` 仍会拦发布。侧栏品牌 slot 之上没有 error boundary，渲染期抛错会带垮整行。

<a id="dev-note"></a>
### 开发者备注

<details>
<summary>维护者工作留痕 —— 点击展开</summary>

无。

</details>