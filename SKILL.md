# SoloCRM Skill

AI Agent business fact kernel for recording and querying structured business facts.

## Installation

When user provides this skill's GitHub URL, install it as follows:

```bash
# 1. Clone to your skills directory
# Claude: ~/.claude/skills/
# opencode: ~/.agents/skills/
git clone <repo-url> <your-skills-dir>/solocrm

# 2. Install dependencies
cd <your-skills-dir>/solocrm
npm install

# 3. Verify installation
node solo.js --version
```

**Installation is complete when** `node solo.js --version` returns a version number.

## When to Use

Activate when user provides business information:
- Customer meetings or calls
- Contact information
- Budget discussions
- Follow-up items
- Any business interaction

Also use when user asks to:
- Query customer information
- View interaction history
- Export data for other skills or Excel

## Core Principle

**Store facts, not judgments.** Record what happened, not what it means.

- ✅ "讨论了30万预算" (fact)
- ✅ "客户说下周给答复" (fact)
- ❌ "这个客户很有意向" (judgment)
- ❌ "成交概率70%" (judgment)

## Data Model

```
Customer (organization)
  └── Person (individual contact)
       └── Event (what happened)
            - channel: call, meeting, email, wechat, visit
            - action: note, request, decision, commitment
            - content: description
            - amount: money mentioned
```

## CLI Reference

### Recording Facts

```bash
# Step 1: Ensure customer exists (idempotent)
node solo.js customer ensure --name "腾讯"
# Returns: {"id": "cust_xxx", "name": "腾讯"}

# Step 2: Ensure person exists (idempotent)
node solo.js person ensure --customer cust_xxx --name "张三" --title "产品总监"
# Returns: {"id": "pers_xxx", "name": "张三"}

# Step 3: Record event
node solo.js event add \
  --customer cust_xxx \
  --person pers_xxx \
  --channel meeting \
  --event-action note \
  --content "讨论预算30万，下周给答复" \
  --amount 300000
# Returns: {"id": "evt_xxx"}
```

### Deleting Facts (Soft Delete)

```bash
# Delete customer (cascades to persons and events)
node solo.js customer delete cust_xxx

# Delete person
node solo.js person delete pers_xxx

# Delete event
node solo.js event delete evt_xxx
```

### Restoring Facts

```bash
# Restore soft-deleted customer
node solo.js customer restore cust_xxx

# Restore soft-deleted person
node solo.js person restore pers_xxx

# Restore soft-deleted event
node solo.js event restore evt_xxx
```

**Note**: Deleted records are hidden from queries but preserved in database for audit.

### Querying Facts

```bash
# Get customer info
node solo.js customer get cust_xxx

# List all customers
node solo.js customer list

# Get timeline
node solo.js timeline get cust_xxx --days 30

# List events
node solo.js event list --customer cust_xxx --limit 10

# Search events by keyword
node solo.js search "预算"
node solo.js search "腾讯" --channel meeting
node solo.js search "报价" --range 30d --format md
```

### Exporting Data

```bash
# Export customer summary (Markdown for reading)
node solo.js export customer --id cust_xxx --format md

# Export timeline (Markdown for reading)
node solo.js export timeline --customer cust_xxx --format md --days 90

# Export events (NDJSON for AI pipelines)
node solo.js export events --customer cust_xxx --format ndjson

# Export events (CSV for Excel)
node solo.js export events --customer cust_xxx --format csv

# Export all customers (CSV for Excel)
node solo.js export customers --format csv

# Export all persons (CSV for Excel)
node solo.js export persons --format csv

# Full backup (JSON for migration)
node solo.js export backup --format json
```

### Export Filters

```bash
# Time range: 7d, 30d, 90d, 1y
node solo.js export events --range 30d --format csv

# By channel
node solo.js export events --channel meeting --format csv

# Combined
node solo.js export events --customer cust_xxx --channel meeting --range 7d --format csv
```

### Import Commands

```bash
# Import from backup file (for data merging between users)
node solo.js import <file.json>

# Workflow: User A exports, User B imports
# User A:
node solo.js export backup --format json > a_data.json
# User B:
node solo.js import a_data.json
```

**Import Behavior:**
- Customers: idempotent by name (existing customers skipped)
- Persons: idempotent by customer+name (existing contacts skipped)
- Events: always creates new (events are timestamped records)

## Extraction Rules

When parsing user input, extract:

1. **Customer**: Company names (腾讯, 阿里, 字节, 华为)
2. **Person**: Names with context (张三, 李总, 王经理)
3. **Channel**: How interaction happened (开会/会议=meeting, 电话=call, 微信=wechat, 邮件=email)
4. **Action**: Event type (讨论=note, 决定=decision, 承诺=commitment, 报价=request)
5. **Content**: Natural language description of what happened
6. **Amount**: Numbers with monetary context (30万=300000, 15k=15000)
7. **Amount Type**: Classify amount meaning using recommended values:
   - `contract` - 合同金额 (签了50万合同)
   - `payment` - 回款 (收到30万回款)
   - `budget` - 预算 (他们预算200万)
   - `quote` - 报价 (报价15万)
   - `deposit` - 定金/预付 (付了10万定金)
   - `mentioned` - 泛指 (默认，无法明确归类时使用)
8. **Time**: When it happened (昨天=yesterday, 上周=last week)

## Examples

### Input → Commands

**User**: "昨天跟腾讯张三开会，他说预算30万，下周给答复"

**AI executes**:
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

**User**: "给李总发了报价邮件，15万"

**AI executes**:
```bash
node solo.js customer ensure --name "当前客户"  # or from context
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

**User**: "导出腾讯最近一个月的会议记录，我要用 Excel 看"

**AI executes**:
```bash
node solo.js export events --customer cust_xxx --channel meeting --range 30d --format csv > tencent_meetings.csv
```

## What NOT to Record

- Customer "等级" or "阶段" (let AI infer from facts)
- Win probability (judgment, not fact)
- Risk scores (judgment, not fact)
- Tasks or follow-ups (use task manager)

## Data Location

SQLite database stored at: `~/.solocrm/data.db`

## Requirements

- Node.js >= 18.0.0

## Error Handling

If command fails, check:
1. Customer/Person ID exists (use `ensure` to create)
2. Required options are provided
3. File paths are valid for export

## Limitations (v0.1)

- No multi-agent support
- No soft delete
- No import from CSV (use CLI to record)
- No profile-based export (planned for v0.2)
