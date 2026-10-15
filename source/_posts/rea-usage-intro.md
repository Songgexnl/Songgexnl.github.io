---
title: 如何使用 REA：逆向一切的工具
date: 2026-10-15 18:30:00
tags:
  - REA
  - 逆向工程
  - MCP
  - 工具推荐
categories:
  - 工具推荐
---

你是否遇到过这样的场景：看到一个 App 的酷炫功能，心里想着「这到底是怎么实现的？」却苦于没有源码、无从下手。今天要介绍的 **REA（Reverse Engineer Anything，逆向一切）** 就是为解决这类问题而生的。

> 项目地址：<https://github.com/morluto/rea>
> 官方站点（含中文文档）：<https://rea.tools/zh-CN/>

## 什么是 REA

REA 是一个 **MCP（Model Context Protocol）服务**，它把 AI 智能体与一整套逆向分析工具连接起来，让你能够分析：

- 原生二进制文件（EXE、ELF、Mach-O 等）
- JavaScript / Electron 应用
- .NET 程序集
- 网站、网络抓包、Android APK、固件……

它的核心卖点是：**看到喜欢的功能，让智能体去查清它的工作原理，一直追溯到二进制层面，并附带可验证的「证据」**。换句话说，REA 不只是「反编译给你看」，而是把「找答案 → 给证据 → 复现实现」整条链路自动化。

几个关键特性：

- **本地分析**：目标文件在本机被解析，不会上传你的应用。
- **证据驱动**：每次结论都附带支撑它的代码、引用与限制，而非凭空猜测。
- **智能体 + 终端两套入口**：既能在 Claude Code、Cursor 等智能体里用，也能直接在命令行调用。
- **MCP 标准协议**：任何支持本地 MCP 的智能体都能接入。

## 环境要求

REA 基于 Node.js 运行，需要先装好 **Node.js 22.x（>=22.19）/ 24.x（>=24.11）/ 26+** 以及 npm。

> 原生的深度反汇编（如分析 EXE）还需要一个反编译引擎，例如 **Hopper、Ghidra 或 IDA**；但 **JavaScript / Electron 的静态分析不需要**任何原生引擎，开箱即用。

## 快速开始

### 1. 一条命令，把 REA 装进你的智能体

确保已安装 Node.js 与 npm 后，在终端运行：

```bash
npx rea-agents setup
```

它会让你选择要配置的智能体（支持 Claude Code、Codex、Cursor、Gemini CLI、Grok Build 等），然后**展示将要修改的计划**，你确认批准后，它会：

1. 为智能体注册 REA 的 MCP 服务；
2. 安装与之匹配的工作流（skill）指引；
3. 备份你已有的配置文件。

完成后**重启智能体**即可生效。

### 2. 直接问智能体问题

配置好之后，你不需要记任何命令，直接用自然语言提问即可。例如：

```text
弄清 Notes 应用的搜索功能如何工作，展示证据，并为我的项目实现类似功能。
```

把 `Notes` 换成你的目标应用，再描述你想了解的功能。智能体会调用 REA 去追踪相关代码、解释行为，甚至帮你写并测试一份复现实现。

### 3. 在终端里直接分析

如果你只想快速检查一个已解包的 JavaScript / Electron 应用目录或 ASAR 文件，可以不用智能体，直接在命令行跑：

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

返回结果包含：模块关系、导入、Electron 主进程/渲染进程边界、以及对应的证据。把路径换成你自己的目标，例如 Windows 上：

```bash
npx -y rea-agents@latest analyze-javascript-application "D:/apps/example" --json
```

### 4. 安装全局命令（可选）

如果经常用，建议装一个全局 `rea` 命令：

```bash
npm install --global rea-agents
rea --help
```

### 5. 保持更新

REA 更新很频繁，新版本常包含问题修复，建议保持最新：

```bash
# 全局安装的 CLI
rea update

# 用 npx 配置过智能体的，重新跑 setup 即可更新注册
npx rea-agents@latest setup
```

> 如果使用 Bun，`bunx rea-agents@latest` 等价于上面的 `npx rea-agents@latest`，全局更新需 Bun 1.2.17+。

## 它能分析什么（部分）

| 目标 | REA 返回的内容 | 额外要求 |
| --- | --- | --- |
| 原生二进制文件 | 伪代码、汇编、字符串、符号、调用与引用 | Hopper / Ghidra / IDA |
| Go 二进制文件 | 编译器版本、模块、构建设置 | 内置，无需装 Go |
| JavaScript / Electron | 模块、导入、source map、路由、IPC 关系 | Node.js + npm |
| 网站 | 页面结构、脚本、网络观察、截图 | Chrome 系浏览器 |
| .NET 程序集 | 元数据、CIL 指令、原生依赖 | 静态检查，无需运行 |
| Android APK | 清单、类、反编译方法与引用 | JADX + JDK |
| 网络抓包（HAR / pcap） | 请求、端点、DNS、TLS SNI、协议分布 | tshark / mitmdump 等 |
| 固件 | 区域、提取结果、转交原生分析 | Binwalk / Unblob |

完整清单见官方文档的[工具目录](https://rea.tools/zh-CN/)。

## 工作原理

整个调查流程可以概括为一句话：**智能体通过 MCP 调用 REA → REA 调用底层分析工具检查并追踪目标 → 返回发现与证据 → 智能体据此追问、解释、编写并测试实现**。

```text
你 / 终端
   │  提问或命令
   ▼
智能体（支持 MCP 的任意客户端）
   │  MCP 调用
   ▼
REA（本机运行）
   │  调用
   ▼
分析工具（Hopper / Ghidra / IDA / JADX / tshark …）
   │  返回
   ▼
REA 汇总「发现 + 证据 + 限制」回传给智能体
```

CLI 命令走的是同一套工作流，所以无论你用智能体还是纯命令行，背后逻辑一致。

## 实战案例

官方给出了几个很直观的复现案例：

- **DX-Ball：重建声像计算** —— 顺着声音调用链，定位到根据位置计算声像的辅助函数，把不完整的伪代码还原成 C，重建结果通过了 3000+ 个原始 x86 测试用例。
- **Notion：追踪 Electron 剪贴板桥** —— 找到渲染进程的剪贴板 API，沿 preload 与 IPC 一路追到主进程，查清富格式剪贴板数据的来龙去脉。
- **TH04：恢复 DOS 环形子弹计算** —— 解析老 PC-98 游戏的 16 位指令，恢复固定角度与瞄准角度的计算，并把重建的 C++ 与当年的编译器输出做对比。

每个案例都配有完整的复现项目仓库，强烈建议去 [REA 案例页](https://rea.tools/zh-CN/showcase/) 看看。

## 常见问题

**Q：哪些智能体能用 REA？**
任何支持本地 MCP 服务的智能体都行。设置流程会配置官方支持的几种；其他客户端也可以手动注册 MCP 接入。

**Q：一定要装 Hopper / Ghidra / IDA 吗？**
做深入的原生反汇编时需要其中一个；而 **JavaScript 和 .NET 的静态检查不需要**任何原生引擎。设置流程在你批准后可以帮你装 Hopper，Ghidra / IDA 则复用你已有的安装。

**Q：REA 会把我的应用上传到云端吗？**
不会。REA 在本机分析目标；只有「工具结果」会交给智能体，而智能体背后的模型服务商有各自的数据政策，这部分需要你自行留意。

**Q：遇到报错怎么办？**
先更新（`rea update` 或重新跑 `setup`），多数问题在新版本已修复；若仍不行，到 GitHub 提交 issue，附上 REA 版本、目标类型、复现步骤和错误输出。

## 合法使用声明

REA 定位是**合法**的研究、教育、互操作性、软件保存，以及分析你**拥有或获准检查**的软件。对于 IDA Pro、Hopper、JEB 等商业工具，需要你自己合法取得使用授权——REA 不提供任何工具许可或激活，也明确禁止使用破解、盗版或绕过许可限制的方式。

## 小结

REA 把「逆向工程」这件过去门槛很高的事，变成了「用自然语言提问就能拿到可验证结论和实现草稿」的体验。对于想研究竞品功能、做软件互操作性、或单纯好奇「它是怎么做到的」开发者来说，是一个非常值得一试的工具。

要上手，记住三步走就够了：

```bash
# 1. 配置智能体
npx rea-agents setup

# 2. 在智能体里提问，或直接终端分析 JS/Electron
npx -y rea-agents@latest analyze-javascript-application /path/to/app --json

# 3. 保持更新
rea update
```

更多中文实操指南见 <https://rea.tools/zh-CN/guides/>。
