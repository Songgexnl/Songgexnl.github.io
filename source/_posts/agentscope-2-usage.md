---
title: 如何使用 AgentScope 2.0：从零搭建生产级智能体
date: 2026-10-19 10:00:00
tags:
  - AgentScope
  - 智能体框架
  - LLM
  - Agent
  - 多智能体
categories:
  - 技术教程
---

在 1.x 时代，AgentScope 已经是一个友好的多智能体框架。而 **AgentScope 2.0** 是一次彻底的重构：它把「安全、高效、灵活、完备」作为核心目标，原生支持**多租户、多会话管理与分布式部署**，并补齐了工具审计、人机协同（HITL）、沙箱隔离等企业在生产环境中真正需要的能力。

本文基于官方文档（[AgentScope 2.0.10 中文文档](https://docs.agentscope.io/zh/versions/2.0.10)）整理，带你从安装到跑通多智能体团队，一步步上手这个框架。

> 官方文档：<https://docs.agentscope.io/zh/versions/2.0.10>
> 注意：**2.0 与 1.x 存在破坏性变更，请勿混用 API**。

## 一、AgentScope 2.0 是什么

一句话概括：它是一款**安全、高效、灵活且完备的生产级智能体框架**。

- **安全**：工具审计 + 人机协同（HITL）权限系统 + 沙箱隔离，三位一体。
- **高效**：按工具特性柔性编排，支持多工具并发或顺序智能调度。
- **灵活**：智能体与工具双重中间件，无侵入地定制运行时行为。
- **完备**：从轻量 UI、开箱 SDK 到多租户后端及分布式部署，工具链完整。
- **全栈**：覆盖单智能体推理到企业级应用的全生命周期。

它的核心模块包括：消息与事件、智能体（Agent）、模型（Model）、工具（Tool）、上下文管理、流水线（Pipeline）、权限系统、工作区、RAG、长期记忆，以及开箱即用的「智能体即服务（AaaS）」部署能力。

## 二、安装

AgentScope 2.0 要求 **Python 3.11 及以上**，推荐使用 `uv` 包管理器。

```bash
# 通过 PyPI 安装
uv pip install agentscope

# 验证安装
python -c "import agentscope; print(agentscope.__version__)"
```

如需额外能力（语音、RAG、沙箱等），可安装完整依赖：

```bash
# Windows
uv pip install agentscope[full]

# Mac / Linux
uv pip install agentscope\[full\]
```

也可以从源码安装：

```bash
git clone -b main https://github.com/agentscope-ai/agentscope
cd agentscope
uv pip install -e .
```

## 三、核心概念速览

在写代码前，先建立几个关键心智模型：

| 概念 | 作用 |
| --- | --- |
| **Model（模型）** | 通过「凭证 Credential」接入各家大模型 API，如 `DashScopeChatModel`、`OpenAIChatModel` |
| **Agent（智能体）** | 无状态的推理-行动（ReAct）循环引擎，由 `name` + `system_prompt` + `model` + `toolkit` 组装 |
| **Tool（工具）** | 智能体可调用的能力，支持原生 Python 函数、`MCP` 服务与外部 `Skill` |
| **Msg / Event（消息与事件）** | 智能体通信基本单元；`reply_stream` 通过事件流向前端增量推送 |
| **Context（上下文）** | 智能体的「工作记忆」，可压缩、卸载、主动检索 |
| **Pipeline（流水线）** | 固化多智能体协作逻辑，如团队流水线 `TeamPipeline` |

## 四、5 分钟快速开始

下面这个例子已经跑通「创建模型 → 创建智能体 → 运行对话」的完整链路。运行前请先设置环境变量 `DASHSCOPE_API_KEY`。

```python
import asyncio
import os

from agentscope.agent import Agent
from agentscope.credential import DashScopeCredential
from agentscope.event import EventType
from agentscope.message import UserMsg
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit, Bash, Read, Write, Edit


async def main() -> None:
    agent = Agent(
        name="Friday",
        system_prompt="You are a helpful assistant named Friday.",
        model=DashScopeChatModel(
            credential=DashScopeCredential(
                api_key=os.getenv("DASHSCOPE_API_KEY"),
            ),
            model="qwen-plus",
        ),
        toolkit=Toolkit(tools=[Bash(), Read(), Write(), Edit()]),
    )

    user_msg = UserMsg(name="user", content="Hello, who are you?")

    # 方式一：等待最终回复
    reply_msg = await agent.reply(user_msg)
    ...

    # 方式二：流式获取增量事件（文本片段、工具调用等）
    async for event in agent.reply_stream(user_msg):
        match event.type:
            case EventType.TEXT_BLOCK_DELTA:
                ...  # 流式文本片段，追加到界面或标准输出
            case EventType.TOOL_CALL_START:
                ...  # 智能体即将调用工具，展示调用信息
            case _:
                ...  # 其他事件：思考块、工具结果、回复结束等


asyncio.run(main())
```

## 五、接入大模型（Model）

所有模型类都遵循 `Model(credential=..., model=...)` 的模式，切换厂商只需替换凭证与模型类：

```python
# DashScope（通义千问）
from agentscope.model import DashScopeChatModel
from agentscope.credential import DashScopeCredential
model = DashScopeChatModel(
    credential=DashScopeCredential(api_key="YOUR_API_KEY"),
    model="qwen-max",
)

# OpenAI
from agentscope.model import OpenAIChatModel
from agentscope.credential import OpenAICredential
model = OpenAIChatModel(
    credential=OpenAICredential(api_key="YOUR_API_KEY"),
    model="gpt-4o",
)

# Anthropic / Gemini / Ollama 同理
from agentscope.model import AnthropicChatModel, GeminiChatModel, OllamaChatModel
from agentscope.credential import AnthropicCredential, GeminiCredential, OllamaCredential
claude = AnthropicChatModel(credential=AnthropicCredential(api_key="..."), model="claude-sonnet-4-5")
gemini = GeminiChatModel(credential=GeminiCredential(api_key="..."), model="gemini-2.5-pro")
ollama = OllamaChatModel(credential=OllamaCredential(host="http://localhost:11434"), model="qwen3:8b")
```

模型还支持流式、重试、专属参数等配置：

```python
model = DashScopeChatModel(
    credential=DashScopeCredential(api_key=os.environ["DASHSCOPE_API_KEY"]),
    model="qwen-plus",
    stream=True,            # 是否流式输出
    max_retries=3,          # API 失败最大重试次数
    parameters=DashScopeChatModel.Parameters(
        parallel_tool_calls=False,
    ),
)
```

也可以直接调用模型（不套智能体）：

```python
msgs = [UserMsg(name="user", content="Count from 1 to 5.")]
async for chunk in await model(msgs):
    if chunk.is_last:
        print("Final:", chunk.content)   # 完整累积内容
    else:
        print("Delta:", chunk.content)   # 仅增量
```

## 六、配置智能体（Agent）

`Agent(...)` 的必填参数是 `name`、`system_prompt`、`model`，其余皆可按需配置：

| 参数 | 说明 |
| --- | --- |
| `name` / `system_prompt` / `model` | 必填：标识、系统提示、推理模型 |
| `toolkit` | 管理工具、MCP 客户端、技能与工具组 |
| `context_config` | 上下文压缩阈值、图片数量、工具结果长度限制 |
| `react_config` | 最大迭代次数、结构化输出宽限、拒绝处理策略 |
| `middlewares` | 在回复/推理/行动/模型调用等钩子上做无侵入扩展 |
| `state` | 保存上下文、权限上下文与会话状态（多轮/持久化） |

**最简配置：**

```python
agent = Agent(
    name="my_agent",
    system_prompt="你是一个有帮助的助手。",
    model=DashScopeChatModel(
        credential=DashScopeCredential(api_key="YOUR_API_KEY"),
        model="qwen-max",
    ),
)
```

**接入工具 / MCP / 技能：**

```python
import os
from agentscope.agent import Agent
from agentscope.tool import Toolkit, Bash, Edit, Grep, Read, Write
from agentscope.mcp import MCPClient, HttpMCPConfig
from agentscope.model import DashScopeChatModel
from agentscope.credential import DashScopeCredential

agent = Agent(
    name="my_agent",
    system_prompt="你是一个有帮助的助手。",
    model=DashScopeChatModel(
        credential=DashScopeCredential(api_key="YOUR_API_KEY"),
        model="qwen-max",
    ),
    toolkit=Toolkit(
        tools=[Bash(), Edit(), Grep(), Read(), Write()],
        mcps=[
            MCPClient(
                name="amap",
                is_stateful=False,
                mcp_config=HttpMCPConfig(
                    url=f"https://mcp.amap.com/mcp?key={os.environ['AMAP_API_KEY']}",
                ),
            ),
        ],
        skills_or_loaders=["./skills"],
    ),
)
```

**上下文与 ReAct 调优：**

```python
agent = Agent(
    name="my_agent",
    system_prompt="你是一个有帮助的助手。",
    model=DashScopeChatModel(
        credential=DashScopeCredential(api_key="YOUR_API_KEY"),
        model="qwen-max",
    ),
    context_config=ContextConfig(
        trigger_ratio=0.7,      # 使用 70% 上下文时触发压缩
        reserve_ratio=0.2,      # 压缩后保留最近 20% 内容
        tool_result_limit=1000, # 工具结果超过 1000 token 时截断
        max_image_num=5,        # 只保留最近 5 张图片
    ),
    react_config=ReActConfig(
        max_iters=30,                       # 最多 30 轮推理-行动迭代
        structured_output_grace_iters=3,     # 为结构化输出追加的迭代
        stop_on_reject=True,                # 工具调用被拒绝时停止
    ),
)
```

## 七、运行智能体

### 1. 等待最终回复 `reply`

```python
import asyncio
from agentscope.message import UserMsg

async def main():
    msg = UserMsg(name="user", content="当前目录有哪些文件？")
    result = await agent.reply(msg)
    print(result.get_text_content())

asyncio.run(main())
```

返回的 `Msg` 关键字段：

- `content`：本次回复的全部内容块（文本、思考、工具调用与结果）
- `finished_reason`：`completed` / `interrupted` / `exceed_max_iters` / `error`（`None` 表示暂停中）
- `structured_output`：传入 `structured_schema` 时校验后的结构化结果
- `usage`：累计 token 数

### 2. 流式回复 `reply_stream`

```python
async def main():
    msg = UserMsg(name="user", content="总结一下 README 的内容。")
    async for event in agent.reply_stream(msg):
        if hasattr(event, "delta"):
            print(event.delta, end="", flush=True)

asyncio.run(main())
```

如需在流末额外产出最终 `Msg`，传 `yield_final_msg=True`：

```python
async for chunk in agent.reply_stream(msg, yield_final_msg=True):
    if isinstance(chunk, Msg):
        print("最终消息:", chunk.get_text_content())
```

### 3. 结构化输出

传入 Pydantic 模型，智能体会装配内置工具来提交符合 schema 的结果：

```python
from pydantic import BaseModel, Field
from agentscope.message import UserMsg

class WeatherReport(BaseModel):
    city: str = Field(description="城市名")
    temperature: float = Field(description="摄氏温度")

result = await agent.reply(
    UserMsg(name="user", content="杭州今天天气怎么样？"),
    structured_schema=WeatherReport,
)
print(result.structured_output)  # {"city": "杭州", "temperature": ...}
```

### 4. 多轮对话与状态持久化

进程内多轮可直接用 `reply(None)` 从当前状态继续；跨进程/分布式则需要借助 `AgentState` + `RedisStorage`：

```python
import asyncio
from agentscope.agent import Agent, AgentState
from agentscope.state import AgentState
from agentscope.model import DashScopeChatModel
from agentscope.credential import DashScopeCredential
from agentscope.message import UserMsg
from agentscope.app.storage import RedisStorage

USER_ID, AGENT_ID, SESSION_ID = "user_123", "agent_456", "session_789"

async def main():
    async with RedisStorage(host="localhost", port=6379) as storage:
        record = await storage.get_session(
            user_id=USER_ID, agent_id=AGENT_ID, session_id=SESSION_ID,
        )
        state = record.state if record else AgentState()
        agent = Agent(
            name="my_agent",
            system_prompt="你是一个有帮助的助手。",
            model=DashScopeChatModel(
                credential=DashScopeCredential(api_key="YOUR_API_KEY"),
                model="qwen-max",
            ),
            state=state,
        )
        result = await agent.reply(UserMsg(name="user", content="继续之前的任务。"))
        print(result.get_text_content())
        await storage.update_session_state(
            user_id=USER_ID, agent_id=AGENT_ID, session_id=SESSION_ID,
            state=agent.state,
        )

asyncio.run(main())
```

> 首次建会话用 `upsert_session`，后续轮次用 `update_session_state`，否则会 `KeyError`。

## 八、自定义工具（Python Function Tool）

把任意 Python 函数暴露给智能体，首选 `FunctionTool` 适配器——它会从函数名、docstring、类型注解自动提取工具元数据：

```python
from agentscope.tool import FunctionTool, Toolkit

def get_weather(city: str, unit: str = "celsius") -> str:
    """Get the current weather for a city.

    Args:
        city: The city name to look up.
        unit: Temperature unit, either "celsius" or "fahrenheit".
    """
    return f"The weather in {city} is 22°{unit[0].upper()}"

toolkit = Toolkit(tools=[FunctionTool(get_weather)])
```

当输入结构较复杂时，用 Pydantic 模型显式约束 schema：

```python
from pydantic import BaseModel, Field
from agentscope.tool import FunctionTool

class WeatherInput(BaseModel):
    city: str
    days: int = Field(default=1, ge=1, le=7)

def get_forecast(city: str, days: int = 1) -> str:
    return f"{city} 未来 {days} 天天气晴朗"

weather_tool = FunctionTool(get_forecast, input_schema=WeatherInput)
```

> `FunctionTool` 默认走 `ASK` 权限行为——每次调用都需要用户显式放行。若需精细的权限审查（如按输入判断只读），可继承 `ToolBase` 基类并实现 `check_permissions()`。

## 九、多智能体团队流水线（TeamPipeline）

`TeamPipeline` 由一个**队长（leader）**与若干**成员（members）**组成：队长通过 `TeamAssign` 工具把任务分派给成员，成员在各自上下文独立完成，最终回复作为工具结果交回队长。

特点：队长只看到成员最终回复（上下文不被撑爆）、不同成员并发执行、成员间互不通信（结果总回到队长）。

```python
import asyncio
import os
from agentscope.agent import Agent
from agentscope.console import launch_console
from agentscope.credential import DashScopeCredential
from agentscope.model import DashScopeChatModel
from agentscope.pipeline import TeamMember, TeamPipeline
from agentscope.tool import Toolkit
from agentscope.workspace import LocalWorkspace

async def main() -> None:
    async with LocalWorkspace(workdir="./workspace") as workspace:
        model = DashScopeChatModel(
            credential=DashScopeCredential(api_key=os.getenv("DASHSCOPE_API_KEY")),
            model="qwen3.8-max",
        )

        leader = Agent(
            name="Leader",
            system_prompt="You're a team leader named 'Leader'.",
            model=model,
            toolkit=Toolkit(),   # 流水线会向其中注册 TeamAssign 工具
        )

        researcher = Agent(
            name="Researcher",
            system_prompt="You're a researcher named 'Researcher'.",
            model=model,
            toolkit=Toolkit(tools=await workspace.list_tools()),
            offloader=workspace,
        )
        coder = Agent(
            name="Coder",
            system_prompt="You're a programmer named 'Coder'.",
            model=model,
            toolkit=Toolkit(tools=await workspace.list_tools()),
            offloader=workspace,
        )

        pipe = TeamPipeline(
            leader=leader,
            members=[
                TeamMember(agent=researcher, description="Investigates a question and reports findings."),
                TeamMember(agent=coder, description="Writes and runs code in the workspace."),
            ],
        )

        # 满足 PipelineProtocol，可直接交给终端 UI
        await launch_console(agent=pipe)

asyncio.run(main())
```

成员间建议共用一个 `LocalWorkspace`（如 Docker / E2B 沙箱），以文件形式协作。`reply_stream` 也支持把用户授权答复按 `reply_id` 送回挂起的成员，从而优雅处理人机协同中断。

## 十、消息与事件（前后端流式传输）

`Msg` 是智能体通信与上下文持久化的基本单元，由类型化内容块（ContentBlock）有序组成：

| 块类型 | 说明 |
| --- | --- |
| `TextBlock` | 文本 |
| `ThinkingBlock` | 模型推理过程 |
| `ToolCallBlock` | 工具调用（含 `name` / `input` / `state`） |
| `ToolResultBlock` | 工具结果（其 `id` 须与对应 `ToolCallBlock.id` 一致） |

三个角色工厂函数简化了构造：`UserMsg` / `AssistantMsg` / `SystemMsg`。

事件流（`reply_stream` 的产出）遵循 `start → delta → end` 模式，前端可实时渲染。所有事件共享 `reply_id`，用 `block_id` / `tool_call_id` 关联：

```python
from agentscope.message import AssistantMsg
from agentscope.event import ReplyStartEvent

msg = None
async for event in agent.reply_stream(user_msg):
    if isinstance(event, ReplyStartEvent):
        msg = AssistantMsg(name=event.name, content=[], id=event.reply_id)
    else:
        msg.append_event(event)   # 任意事件均可追加还原为完整消息
```

## 十一、从 SDK 到生产：智能体即服务（AaaS）

当你需要把智能体开放给多个用户、多会话并发使用时，AgentScope 2.0 提供了一键式的**智能体即服务**部署：

- **架构**：把智能体部署为多租户、多会话的 HTTP 服务，自带可视化前端与 SDK。
- **RAG 服务 / 工作区管理 / SOP 服务 / MCP 与技能中心 / 消息渠道（飞书、钉钉、Discord）** 等模块开箱即用。
- 配合**权限系统**（全局策略 + 规则 + 工具内置检查）与**沙箱工作区**（本地 / Docker / E2B / K8s），可在企业环境中安全落地。

对于大多数团队，推荐路径是：先在本地方用 `Agent` + `reply_stream` 验证逻辑，再用 `TeamPipeline` 编排多智能体，最后通过 AaaS 部署为带多租户后端的服务。

## 十二、小结

AgentScope 2.0 的学习曲线并不陡，核心可以浓缩为四步：

1. **装好框架**：`uv pip install agentscope`。
2. **接模型**：用对应 `*Credential` + `*ChatModel` 接入你的大模型。
3. **组智能体**：`Agent(name, system_prompt, model, toolkit)`，按需配 `context_config` / `react_config`。
4. **跑起来**：`await agent.reply(msg)` 拿结果，或 `agent.reply_stream(msg)` 做流式 UI；多智能体用 `TeamPipeline`。

它在 1.x 的友好基础上，补齐了生产环境真正需要的「安全（权限 + 沙箱）、高效（柔性编排）、灵活（中间件）、完备（AaaS 全栈）」四大能力。如果你正在选型一个能从小实验平滑走向企业部署的智能体框架，AgentScope 2.0 值得一试。

> 官方文档（含 RAG、长期记忆、实时语音、部署 API 等更细的章节）：<https://docs.agentscope.io/zh/versions/2.0.10>
