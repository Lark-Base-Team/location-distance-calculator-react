# 地理位置距离计算 (Location Distance Calculator) - React 版

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FVinfall%2Flocation-distance-calculator-react.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FVinfall%2Flocation-distance-calculator-react?ref=badge_shield)

这是一个为[飞书多维表格](https://feishu.cn/product/base)设计的插件（使用 React 重构），用于计算两个指定地理位置字段之间的距离和预估时间。

原版插件链接（基于 UIBuilder）：https://lq0ffyd8fx.feishu.cn/base/extension/replit_3efac8be7421a3e5

## ✨ 功能特性

- **选择数据表:** 用户可以选择当前 Base 中的任意数据表。
- **选择起点和终点:** 用户需要指定两个「地理位置」类型的字段作为计算的起点和终点。
- **多种计算模式:** 支持计算两点间的：
  - 直线距离
  - 驾车路线距离和时间
  - 步行路线距离和时间
  - 骑行路线距离和时间
  - 公交路线距离和时间 (需要指定城市)
- **选择输出字段:** 用户可以选择两个「数字」类型的字段，分别用于写入计算出的距离（单位：公里）和时间（单位：分钟）。输出距离和时间字段至少需要选择一个（TODO：支持留空）。
- **自动计算与填充:** 插件会遍历所选表格中的所有记录，根据选定的模式计算距离和时间，并将结果自动填充到指定的输出字段中。
- **使用高德地图 API:** 插件通过调用高德地图 Web 服务 API 来获取距离和路线信息。
- **自定义 API Key:** 支持用户在插件界面输入自己的高德地图 Web 服务 API Key，优先使用用户提供的 Key，若不提供则使用插件内置 Key（内置 Key 有调用次数限制）。
- **加载状态显示与中断:** 计算过程中会显示加载状态（TODO: 添加中断功能）。
- **国际化支持:** UI 文本支持中英文切换。

## 📋 示例与指南

- **示例多维表格:** [点击查看](https://lq0ffyd8fx.feishu.cn/base/HXBtbSS8zaERQ2svkfHcf2RsnTb?table=tblCe0djHFc8Kwen&view=vewHR920NB)
- **使用指南:** [「地理位置距离计算」插件使用指南](https://fexakcngwi.feishu.cn/docx/TDb1dc7uIoD4IXx0QYHcn7yQnxb) (与原版基本一致)

## 🚀 开始使用

1.  **安装依赖:**
    ```bash
    npm install
    # 或者
    yarn install
    ```
2.  **运行开发环境:**

    ```bash
    npm run dev
    # 或者
    yarn dev
    ```

    在飞书多维表格中加载插件进行调试。

3.  **构建生产版本:**
    ```bash
    npm run build
    # 或者
    yarn build
    ```
    构建产物将位于 `dist` 目录下。

## 🛠️ 开发

- **技术栈:** React, TypeScript, Semi UI, Zustand (用于状态管理), i18next (用于国际化)
- **主要入口文件:** `src/App.tsx`
- **核心逻辑:**
  - UI 构建和交互在 `src/App.tsx` 中。
  - 状态管理使用 Zustand，定义在 `src/store/`。
  - 地理计算相关逻辑封装在 `src/utils/geo.ts` (待迁移或确认)。
  - 与多维表格 SDK (`@lark-base-open/js-sdk`) 的交互分散在组件和状态管理中。
- **API Key:** 高德地图 API Key 当前可能硬编码在代码中或通过用户输入提供。为了安全和灵活性，建议后续进行更安全的管理。
- **国际化:** 语言资源文件位于 `src/locales/`。

**注意:**

- 内置的高德地图 API Key 有调用次数限制。如果遇到 API 错误或需要更高频率的调用，建议使用自己的 API Key。
- 了解更多关于飞书多维表格插件开发，请查阅 [官方 JS SDK 文档](https://lark-base-team.github.io/js-sdk-docs/zh/)。

## TODO

1.  处理中的时候应该有一个停止处理的选项，让用户可以随时停止。
2.  两个输出字段（距离和时间）应该允许用户只选择一个或都不选。
3.  修复新 API 未获取到时间的 Bug (确认是否还存在)。
4.  将核心地理计算逻辑从 `App.tsx` 迁移到 `src/utils/geo.ts` 或类似模块。
5.  增加更多的计算模式或选项（例如：避免高速等）。
6.  优化错误处理和用户提示。
7.  完善或移除 `src/CityCodes.ts`。
8.  考虑 API Key 的更安全管理方式（例如：通过配置或其他方式）。

## 发布

请先 `npm run build`，连同 `dist` 目录一起提交，然后填写表单：
[共享表单](https://feishu.feishu.cn/share/base/form/shrcnGFgOOsFGew3SDZHPhzkM0e)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FVinfall%2Flocation-distance-calculator-react.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FVinfall%2Flocation-distance-calculator-react?ref=badge_large)
