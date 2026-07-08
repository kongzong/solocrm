# SoloCRM 交接文档

## 项目概述

SoloCRM 是一个 AI Agent 业务事实内核，用于记录和查询结构化业务事实。CLI 是 headless 接口，主要供 AI Agent 使用。

**核心理念：** 用户用自然语言描述 → AI Agent 翻译成 CLI 命令 → SQLite 存储

**GitHub:** https://github.com/kongzong/solocrm

## 已完成的功能

### 核心功能
- ✅ Customer/Person/Event CRUD（增删改查）
- ✅ 软删除 + 恢复（级联删除）
- ✅ Schema 版本管理 + 自动迁移
- ✅ 时间线查询（timeline get）
- ✅ 搜索功能（search）
- ✅ 导出格式：json, ndjson, md, csv
- ✅ 导入功能（JSON 格式，幂等去重）
- ✅ 金额类型：contract, payment_in, payment_out, budget, quote, deposit, mentioned

### 多数据库支持
- ✅ Profile 管理（add/remove/list-profiles）
- ✅ `--profile` 全局参数
- ✅ config.json 存储 profile 定义
- ✅ 不存 current_profile（避免多会话冲突）

### 文档
- ✅ README.md（中文主文档）
- ✅ README_EN.md（英文文档）
- ✅ SKILL.md（AI Agent 指令，中文）
- ✅ 参考文档：人情往来、旅行记账、轻量进销存、日常记录

### 测试
- ✅ 84 个测试全部通过
- ✅ config.test.js：profile 管理测试
- ✅ db.test.js：数据库操作测试
- ✅ cli.test.js：CLI 集成测试

## 当前目录结构

```
solocrm/
├── README.md              # 中文主文档
├── README_EN.md           # 英文文档
├── SKILL.md               # AI Agent 指令（中文）
├── solo.js                # CLI 入口
├── db.js                  # SQLite 操作
├── config.js              # Profile 管理
├── package.json           # 依赖配置
├── install.sh             # Linux/macOS 安装脚本
├── install.ps1            # Windows 安装脚本
├── references/
│   ├── social-gifts.md    # 人情往来
│   ├── travel-expense.md  # 旅行记账
│   ├── lightweight-inventory.md  # 轻量进销存
│   └── daily-records.md   # 日常记录
├── __tests__/
│   ├── config.test.js     # Profile 测试
│   ├── db.test.js         # 数据库测试
│   └── cli.test.js        # CLI 测试
└── test-instructions.md   # 功能测试指令
```

## 踩过的坑（绝对不要再踩）

### 1. Commander.js 的 parseInt 陷阱
```javascript
// ❌ 错误：radix 被覆盖
.option('--days <n>', 'Days', parseInt, 90)
// Commander 会调用 parseInt("30", 90) → NaN

// ✅ 正确：显式指定 radix
const parseDateInt = (v) => parseInt(v, 10);
.option('--days <n>', 'Days', parseDateInt, 90)
```

### 2. 字段遗漏问题
- 新增字段（如 amount_type）后，必须检查所有 SELECT 语句
- **解决方案：** 使用 `SELECT *` 代替显式字段列表
- JOIN 查询用 `SELECT e.*` + 别名避免冲突

### 3. 多会话状态管理
- **不要** 在 config.json 存 current_profile（多会话会冲突）
- **应该** 每个会话自己管理状态（AI 上下文记忆）
- config.json 只存 profile 定义，不存当前状态

### 4. 测试数据库隔离
- cli.test.js 通过设置 HOME/USERPROFILE 到临时目录隔离
- 不要用 SOLOCRM_DB 环境变量测试（不够真实）

### 5. 幂等去重逻辑
- 客户：按名称幂等
- 联系人：按手机或邮箱幂等（不是按名称）
- 事件：始终创建新记录

## 未完成的工作

### 高优先级
- [ ] 实际使用测试（在 WorkBuddy 上测试真实业务场景）

### 中优先级
- [ ] 输入校验（手机号、邮箱格式检查）
- [ ] 统计查询（按客户/渠道/时间汇总金额、数量）

### 低优先级
- [ ] CSV 导入支持
- [ ] Excel 导出（.xlsx）
- [ ] REST API 模式

## 关键设计决策

1. **Entity → Person → Event 通用结构** - 可扩展到多种场景（人情、记账、库存等）
2. **amount_type 建议值 + 自由输入** - 推荐使用预定义值，特殊情况允许自由填写
3. **触发规则分层** - 核心场景自动识别，扩展场景需查阅参考文档
4. **不修改代码原则** - AI Agent 只使用现有命令，不修改源码

## 运行测试

```bash
cd C:\tmp\test\solocrm
npm test
```

## 推送代码

```bash
git add .
git commit -m "描述"
git push origin main
```
