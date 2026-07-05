# SoloCRM

AI Agent 业务事实内核，用于记录和查询结构化业务事实。

[English Documentation](README_EN.md)

## AI Agent 安装

如果用户要求你安装此 skill，请执行以下步骤：

```bash
# 步骤 1：克隆到 skills 目录
# Claude: ~/.claude/skills/
# opencode: ~/.agents/skills/
git clone https://github.com/kongzong/solocrm.git <你的skills目录>/solocrm

# 步骤 2：安装依赖
cd <你的skills目录>/solocrm
npm install

# 步骤 3：验证
node solo.js --version
```

安装完成后，阅读安装目录下的 SKILL.md 了解使用方法。

## 一键安装

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/kongzong/solocrm/main/install.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/kongzong/solocrm/main/install.ps1 | iex
```

## 人类用户

### 环境要求

- Node.js >= 18.0.0

### 安装

```bash
git clone https://github.com/your-username/solocrm.git
cd solocrm
npm install
```

### 快速开始

```bash
# 1. 创建客户
node solo.js customer ensure --name "腾讯"

# 2. 添加联系人
node solo.js person ensure --customer cust_xxx --name "张三" --title "产品总监"

# 3. 记录事件
node solo.js event add --customer cust_xxx --person pers_xxx --channel meeting --event-action note --content "讨论预算30万" --amount 300000

# 4. 查询
node solo.js customer list
node solo.js timeline get cust_xxx

# 5. 导出
node solo.js export customers --format csv > customers.csv
```

### 运行测试

```bash
npm test
```

## 数据模型

```
Customer（客户/组织）
  └── Person（联系人）
       └── Event（事件/互动）
            - channel: call, meeting, email, wechat, visit
            - action: note, request, decision, commitment
            - content: 事件描述
            - amount: 涉及金额
            - amount_type: contract, payment_in, payment_out, budget, quote, deposit, mentioned
```

## CLI 命令参考

### 客户命令

```bash
solo customer ensure --name "腾讯"     # 创建或获取（幂等）
solo customer get <id>                  # 按 ID 获取
solo customer list                      # 列出所有客户
solo customer delete <id>               # 软删除客户
solo customer restore <id>              # 恢复软删除的客户
```

### 联系人命令

```bash
solo person ensure --customer <id> --name "张三"  # 创建或获取
solo person list --customer <id>                   # 列出客户的联系人
solo person delete <id>                             # 软删除联系人
solo person restore <id>                            # 恢复软删除的联系人
```

### 事件命令

```bash
solo event add --customer <id> --channel meeting --event-action note --content "..."  # 添加事件
solo event list --customer <id> --limit 10                                             # 列出事件
solo event delete <id>                                                                  # 软删除事件
solo event restore <id>                                                                 # 恢复软删除的事件
```

### 时间线命令

```bash
solo timeline get <customer_id> --days 30  # 获取时间线
```

### 搜索命令

```bash
solo search "预算"                           # 搜索所有事件
solo search "腾讯" --channel meeting         # 带过滤器搜索
solo search "报价" --range 30d --format md   # 带时间范围搜索
```

### 导出命令

```bash
# 单个客户
solo export customer --id <id> --format json|md

# 时间线
solo export timeline --customer <id> --format json|md --days 90

# 事件过滤
solo export events --format ndjson|json|md|csv
solo export events --customer <id> --range 30d
solo export events --channel meeting --range 7d

# 所有客户
solo export customers --format json|md|ndjson|csv

# 所有联系人
solo export persons --format json|md|ndjson|csv
solo export persons --customer <id> --format json

# 完整备份
solo export backup --format json|ndjson
```

### 导入命令

```bash
# 从备份文件导入
solo import <file.json>

# 示例：用户间合并数据
# 用户 A 导出
solo export backup --format json > a_data.json

# 用户 B 导入
solo import a_data.json
```

**导入规则：**
- 客户：按名称幂等（不会重复）
- 联系人：按客户+手机或邮箱幂等（不会重复）
- 事件：始终创建新记录（事件是带时间戳的记录）

### 多数据库支持

```bash
# 添加 profile
solo config add-profile "work" --path "~/.solocrm/work.db"
solo config add-profile "我的人情来往" --path "~/Dropbox/solocrm/social.db"

# 列出所有 profiles
solo config list-profiles

# 使用指定 profile
solo --profile "work" customer list
solo --profile "我的人情来往" event add --customer cust_xxx --content "..."

# 删除 profile
solo config remove-profile "work"
```

### 导出格式

| 格式 | 用途 | Excel 兼容 |
|------|------|-----------|
| `json` | 结构化数据，AI 处理 | - |
| `ndjson` | AI 管道，流式处理 | - |
| `md` | 人类阅读，文档 | - |
| `csv` | Excel，电子表格分析 | ✓ |

### 过滤选项

| 选项 | 示例 | 说明 |
|------|------|------|
| `--range` | `30d`, `7d`, `1y` | 时间范围过滤 |
| `--channel` | `meeting`, `call` | 按渠道过滤 |
| `--customer` | `cust_xxx` | 按客户过滤 |

## 数据库

SQLite 数据库存储位置：`~/.solocrm/data.db`

## 测试

```bash
npm test              # 运行所有测试
npm run test:watch    # 监听模式
```

## 许可证

MIT
