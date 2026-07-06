# SoloCRM Skill

AI Agent 业务事实内核，用于记录和查询结构化业务事实。

## 何时激活

当用户提供以下信息时激活：
- 客户会议或通话
- 联系人信息
- 预算讨论
- 跟进事项
- 任何业务互动

当用户要求以下操作时也激活：
- 查询客户信息
- 查看互动历史
- 导出数据给其他 skill 或 Excel

当用户要求升级或更新时：
- 升级 SoloCRM、更新到最新版、同步最新版本

## 升级更新

当用户说"升级"、"更新"、"同步最新版"时，执行以下命令：

```bash
# 进入 solocrm 目录（根据实际安装路径）
cd <skill目录>/solocrm

# 拉取最新代码
git pull origin main

# 安装新依赖（如有）
npm install
```

**执行后告知用户：**
- 是否有新版本
- 更新了什么内容（查看 git log）

**示例对话：**

```
用户：升级一下 solocrm

AI：执行：
    cd ~/.claude/skills/solocrm && git pull origin main && npm install
    
    已升级到最新版本。
```

## 重要：不要修改 SoloCRM

SoloCRM 是一个已安装的工具，不是你的项目。

**禁止：**
- ❌ 不要修改 solo.js、db.js、config.js 等源码
- ❌ 不要修改数据库结构（schema、表、字段）
- ❌ 不要添加新命令或新功能
- ❌ 不要修复 bug（告知用户即可）

**允许：**
- ✅ 只使用现有 CLI 命令
- ✅ 功能不足时告知用户，等待官方更新
- ✅ 数据分析需求：使用全量导出，再进行二次整理加工

**数据处理流程（当 CLI 无法满足时）：**
```bash
# 1. 全量导出
node solo.js export backup --format json > solo_data.json

# 2. AI 读取导出文件，进行二次分析处理
# 例如：统计、汇总、生成报表等
```

## 核心原则

**记录事实，不记录判断。** 只记录发生了什么，不记录意味着什么。

- ✅ "讨论了30万预算"（事实）
- ✅ "客户说下周给答复"（事实）
- ❌ "这个客户很有意向"（判断）
- ❌ "成交概率70%"（判断）

## 数据模型

```
Customer（客户/组织）
  └── Person（联系人）
       └── Event（事件/互动）
            - channel: call, meeting, email, wechat, visit
            - action: note, request, decision, commitment
            - content: 事件描述
            - amount: 涉及金额
            - amount_type: 金额类型
```

## CLI 命令参考

### 记录事实

```bash
# 步骤1：确保客户存在（幂等）
node solo.js customer ensure --name "腾讯"
# 返回：{"id": "cust_xxx", "name": "腾讯"}

# 步骤2：确保联系人存在（幂等）
node solo.js person ensure --customer cust_xxx --name "张三" --title "产品总监"
# 返回：{"id": "pers_xxx", "name": "张三"}

# 步骤3：记录事件
node solo.js event add \
  --customer cust_xxx \
  --person pers_xxx \
  --channel meeting \
  --event-action note \
  --content "讨论预算30万，下周给答复" \
  --amount 300000 \
  --amount-type budget
# 返回：{"id": "evt_xxx"}
```

### 删除事实（软删除）

```bash
# 删除客户（级联删除联系人和事件）
node solo.js customer delete cust_xxx

# 删除联系人
node solo.js person delete pers_xxx

# 删除事件
node solo.js event delete evt_xxx
```

### 恢复事实

```bash
# 恢复软删除的客户
node solo.js customer restore cust_xxx

# 恢复软删除的联系人
node solo.js person restore pers_xxx

# 恢复软删除的事件
node solo.js event restore evt_xxx
```

**注意**：已删除的记录在查询中隐藏，但保留在数据库中用于审计。

### 查询事实

```bash
# 获取客户信息
node solo.js customer get cust_xxx

# 列出所有客户
node solo.js customer list

# 获取时间线
node solo.js timeline get cust_xxx --days 30

# 列出事件
node solo.js event list --customer cust_xxx --limit 10

# 按关键词搜索事件
node solo.js search "预算"
node solo.js search "腾讯" --channel meeting
node solo.js search "报价" --range 30d --format md
```

### 导出数据

```bash
# 导出客户摘要（Markdown 供阅读）
node solo.js export customer --id cust_xxx --format md

# 导出时间线（Markdown 供阅读）
node solo.js export timeline --customer cust_xxx --format md --days 90

# 导出事件（NDJSON 供 AI 管道）
node solo.js export events --customer cust_xxx --format ndjson

# 导出事件（CSV 供 Excel）
node solo.js export events --customer cust_xxx --format csv

# 导出所有客户（CSV 供 Excel）
node solo.js export customers --format csv

# 导出所有联系人（CSV 供 Excel）
node solo.js export persons --format csv

# 完整备份（JSON 用于迁移）
node solo.js export backup --format json
```

### 导入命令

```bash
# 从备份文件导入（用于用户间合并数据）
node solo.js import <file.json>

# 工作流：用户A导出，用户B导入
# 用户A：
node solo.js export backup --format json > a_data.json
# 用户B：
node solo.js import a_data.json
```

**导入行为：**
- 客户：按名称幂等（已有客户跳过）
- 联系人：按客户+手机或邮箱幂等（已有联系人跳过）
- 事件：始终创建新记录（事件是带时间戳的记录）

## 提取规则

解析用户输入时，提取：

1. **客户**：公司名称（腾讯、阿里、字节、华为）
2. **联系人**：带上下文的姓名（张三、李总、王经理）
3. **渠道**：互动方式（开会/会议=meeting，电话=call，微信=wechat，邮件=email）
4. **动作**：事件类型（讨论=note，决定=decision，承诺=commitment，报价=request）
5. **内容**：事件的自然语言描述
6. **金额**：带金钱上下文的数字（30万=300000，15k=15000）
7. **金额类型**：分类金额含义：
   - `contract` - 合同金额（签了50万合同）
   - `payment_in` - 收款（收到30万回款）
   - `payment_out` - 付款（付了10万给供应商）
   - `budget` - 预算（他们预算200万）
   - `quote` - 报价（报价15万）
   - `deposit` - 定金/预付（付了10万定金）
   - `mentioned` - 泛指（默认，无法明确归类时使用）
8. **时间**：发生时间（昨天=yesterday，上周=last week）

## 示例

### 输入 → 命令

**用户**："昨天跟腾讯张三开会，他说预算30万，下周给答复"

**AI 执行**：
```bash
node solo.js customer ensure --name "腾讯"
node solo.js person ensure --customer cust_xxx --name "张三"
node solo.js event add \
  --customer cust_xxx \
  --person pers_xxx \
  --channel meeting \
  --event-action note \
  --content "讨论预算30万，下周给答复" \
  --amount 300000 \
  --amount-type budget \
  --occurred-at "2025-01-14T00:00:00Z"
```

**用户**："给李总发了报价邮件，15万"

**AI 执行**：
```bash
node solo.js customer ensure --name "当前客户"  # 或从上下文获取
node solo.js person ensure --customer cust_xxx --name "李总"
node solo.js event add \
  --customer cust_xxx \
  --person pers_xxx \
  --channel email \
  --event-action request \
  --content "发送报价" \
  --amount 150000 \
  --amount-type quote
```

## 触发规则

### 自动使用

当用户提到以下关键词时，直接使用 SoloCRM：
- 客户、联系人、跟进、会议、合同、报价、拜访

### 扩展用法（需查阅参考文档）

当用户提到以下关键词时，先读取对应的参考文档：

| 关键词 | 参考文档 |
|--------|----------|
| 礼金、随礼、份子钱、红包、婚礼、满月 | [references/social-gifts.md](references/social-gifts.md) |
| 旅行、旅游、出差、费用、记账、花了多少 | [references/travel-expense.md](references/travel-expense.md) |
| 进货、出货、库存、商品、入库、出库 | [references/lightweight-inventory.md](references/lightweight-inventory.md) |
| 日记、日志、记录、今天、日常 | [references/daily-records.md](references/daily-records.md) |

> **提示**：使用扩展玩法时，建议搭配多 profile 多数据库，不同玩法隔离使用不同数据库，避免数据混杂。例如：工作数据用 `work`，人情往来用 `人情往来`，旅行记账用 `旅行记账`。

## 多数据库支持

SoloCRM 支持通过 profile 使用多个数据库（如工作数据和个人数据分离）。

### Profile 管理

```bash
# 添加 profile
node solo.js config add-profile "work" --path "~/.solocrm/work.db"

# 添加中文名 profile
node solo.js config add-profile "我的人情来往" --path "~/Dropbox/solocrm/social.db"

# 列出所有 profile
node solo.js config list-profiles

# 删除 profile
node solo.js config remove-profile "work"
```

### 使用 Profile

```bash
# 使用指定 profile
node solo.js --profile "work" customer list
node solo.js --profile "我的人情来往" event list --customer cust_xxx

# 默认（不指定 profile）
node solo.js customer list
```

### AI Agent 多数据库行为

**当用户上下文有明确 profile 时：**
- 直接使用，无需询问

**当未指定 profile 且存在多个 profile 时：**
- 询问用户："要记录到哪个数据库？"
- 列出可用 profile

**写入时，始终确认：**
- 显示将使用的 profile
- 让用户确认或切换

### 对话示例

```
用户：记录一下，收到张三礼金600元

AI：当前有多个数据库：
    1. work (工作数据)
    2. 我的人情来往 (个人社交)
    
    要记录到哪个数据库？

用户：人情来往

AI：[我的人情来往] 已记录收到张三礼金600元
```

## 不记录的内容

- 客户"等级"或"阶段"（让 AI 从事实推断）
- 成交概率（判断，不是事实）
- 风险评分（判断，不是事实）
- 任务或跟进（使用任务管理器）

## 数据库位置

SQLite 数据库存储在：`~/.solocrm/data.db`

## 环境要求

- Node.js >= 18.0.0

## 错误处理

如果命令失败，检查：
1. 客户/联系人 ID 是否存在（使用 `ensure` 创建）
2. 是否提供了必需选项
3. 导出文件路径是否有效

## 限制（v0.1）

- 不支持多 agent
- 不支持 CSV 导入（使用 CLI 记录）

