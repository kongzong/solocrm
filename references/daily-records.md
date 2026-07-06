# 日常记录

SoloCRM 可以用于日常记录，将主题作为"客户"，每次记录作为"事件"。

## 使用场景

- 读书笔记
- 学习记录
- 工作日志
- 健康追踪
- 习惯打卡

## 设置

```bash
# 创建主题作为客户
node solo.js customer ensure --name "读书笔记"
node solo.js customer ensure --name "健身记录"
node solo.js customer ensure --name "工作日志"
```

## 记录

```bash
# 读书笔记
node solo.js event add \
  --customer cust_xxx \
  --channel reading \
  --content "《原则》第3章：生活原则" \
  --amount-type mentioned

# 健身记录
node solo.js event add \
  --customer cust_xxx \
  --channel exercise \
  --content "跑步5公里，用时35分钟" \
  --amount-type mentioned

# 工作日志
node solo.js event add \
  --customer cust_xxx \
  --channel work \
  --content "完成产品需求文档初稿" \
  --amount-type mentioned
```

## 查询

```bash
# 查看某主题所有记录
node solo.js event list --customer cust_xxx

# 查看最近7天记录
node solo.js event list --customer cust_xxx --days 7

# 搜索特定内容
node solo.js search "原则"

# 导出记录
node solo.js export events --customer cust_xxx --format csv > 读书笔记.csv
```

## 示例

```
Customer: 读书笔记
├── 2025-07-01 《原则》第1章
├── 2025-07-03 《原则》第2章
└── 2025-07-05 《原则》第3章

Customer: 健身记录
├── 2025-07-01 跑步5公里
├── 2025-07-03 力量训练
└── 2025-07-05 游泳1公里
```

## 扩展用法

### 习惯打卡

```bash
# 创建习惯作为客户
node solo.js customer ensure --name "早起打卡"

# 每天打卡
node solo.js event add \
  --customer cust_xxx \
  --channel habit \
  --content "6:30起床" \
  --occurred-at "2025-07-01T06:30:00Z"
```

### 健康追踪

```bash
# 创建健康指标作为客户
node solo.js customer ensure --name "体重记录"

# 记录数据
node solo.js event add \
  --customer cust_xxx \
  --channel health \
  --content "体重75kg" \
  --amount 75 \
  --amount-type mentioned
```

## 局限性

- 不支持数据可视化
- 不支持统计分析（需导出后处理）
- 不支持提醒功能

适合：简单记录、临时追踪、与业务数据统一管理
