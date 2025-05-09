# 地理位置距离计算 (Location Distance Calculator)

⚡️ **简介**

这是一个为[飞书多维表格](https://feishu.cn/product/base)设计的插件，可以帮助你轻松计算两个指定地理位置字段之间的距离和预估时间，并将结果自动写回表格。

插件链接：https://lq0ffyd8fx.feishu.cn/base/extension/replit_3efac8be7421a3e5

## 📋 示例与指南

- **示例多维表格:** [点击查看](https://lq0ffyd8fx.feishu.cn/base/HXBtbSS8zaERQ2svkfHcf2RsnTb?table=tblCe0djHFc8Kwen&view=vewHR920NB)
- **使用指南:** [「地理位置距离计算」插件使用指南](https://fexakcngwi.feishu.cn/docx/TDb1dc7uIoD4IXx0QYHcn7yQnxb)

## ✨ 演示

![插件演示 GIF](assets/plugin-demo.gif)

## ✨ 功能特性

- **灵活选择:** 支持选择当前 Base 中的任意数据表，并指定两个「地理位置」类型的字段作为起点和终点。
- **多种计算模式:** 支持计算两点间的直线距离、驾车、步行、骑行、公交（需指定城市）的路线距离和预估时间。
  - 直线距离：仅输出距离。
  - 驾车/步行/骑行/公交：计算距离和时间（特定模式下，如骑行/步行，距离过远可能报错）。
- **自动回填:** 可选择两个「数字」类型的字段，用于自动写入计算出的距离（公里）和时间（分钟）。（输出字段至少选一个，也可都选）。
- **高德地图 API:** 借助高德地图 Web 服务 API 实现精准计算。
- **自定义 API Key:** 支持用户输入自己的高德地图 Web 服务 API Key，优先使用用户 Key，若无则使用内置 Key。
- **国际化:** UI 文本支持中英文切换。

## 📅 版本更新

**v1.1.0 (2025-04-24)**

- 🏗️ 使用 React 重构插件
- ✨ 输出距离和时间字段支持留空不选
- ✨ 添加计算中断功能
- ✨ 支持用户自定义高德地图 API Key
- ⬆️ 升级高德地图 API V3 至 V5
- ✨ 驾车和公交模式下新增多种策略选择
- ⚡️ 按需加载改造

**v1.0.0 (2023-03-28)**

- 🎉 首次发布，实现基础距离计算功能。

## 🚀 使用方法

1.  打开飞书多维表格。
2.  在插件市场安装本插件 (或通过上方插件链接添加)。
3.  在插件界面：
    - 选择需要操作的数据表。
    - 选择「地理位置」类型的起点字段。
    - 选择「地理位置」类型的终点字段。
    - 选择计算模式（如：驾车）。
    - （可选）选择用于写入距离（公里）的「数字」类型字段。
    - （可选）选择用于写入时间（分钟）的「数字」类型字段。（距离和时间字段至少选择一个）
    - （可选）输入你自己的高德地图 Web 服务 API Key。
4.  点击"开始计算"按钮。
5.  插件将遍历表格记录，计算结果并自动填充到指定的字段中。

## 📝 待办事项

- [ ] 优化 API Key 的管理方式，提高安全性。

## 🤝 联系我

如有问题或建议，欢迎通过飞书联系我：[加我飞书好友](https://www.feishu.cn/invitation/page/add_contact/?token=df298630-8825-4dd9-9d14-c4a5f683020f)

## 💡 注意

- **范围限制:** 本插件计算范围目前仅支持中国大陆内的地理位置。
- **网络问题:** 若遇到 API 错误（如 `Failed to fetch`），通常是网络原因导致无法连接高德地图服务。请确保在能够访问中国大陆互联网的环境下使用本插件。
- **关于 API Key:**
  - **内置 Key:** 插件自带作者的高德地图 Web 服务 API Key，每日有调用限额（目前为 10 万次），一般情况下足够使用。
  - **自定义 Key:** 如果使用量较大或遇到限额提示，建议申请并使用您自己的 Key 以获得更稳定的服务。获取步骤如下：
    1.  访问 [高德开放平台](https://lbs.amap.com/)。
    2.  进入 **控制台** > **应用管理** > **我的应用**，点击 **创建新应用** （名称类型随意）。
    3.  在创建的应用下，点击 **添加 KEY**，输入 Key 名称（随意），服务平台选择 **Web 服务**。
    4.  将获取到的 Key 填入插件界面的 "自定义高德 API Key" 输入框，插件将优先使用您的 Key。
- **飞书插件开发:** 了解更多关于飞书多维表格插件开发，请查阅 [官方 JS SDK 文档](https://lark-base-team.github.io/js-sdk-docs/zh/)。
