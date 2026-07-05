# SoloCRM 多数据库场景测试指令

## 第一阶段：初始使用（默认数据库）

- 我想记录一下，今天和腾讯张三开会，讨论了30万的合同
- 查看一下我的客户列表

> 预期：使用默认数据库 ~/.solocrm/data.db，记录成功

---

## 第二阶段：开通多数据库

- 我想把工作和个人的数据分开管理

> 预期：AI 询问两个数据库的位置

- 工作的用默认位置，个人的放 Dropbox

> 预期：AI 执行：
> ```
> solo config add-profile "work" --path "~/.solocrm/work.db"
> solo config add-profile "personal" --path "~/Dropbox/solocrm/personal.db"
> ```

- 现有数据迁移到工作库

> 预期：AI 执行 `solo db move ~/.solocrm/work.db`

- 查看一下有哪些数据库

> 预期：AI 执行 `solo config list-profiles`，显示 work 和 personal

---

## 第三阶段：正常使用多数据库

- 用工作库查看客户列表

> 预期：AI 执行 `solo --profile work customer list`

- 记录一下，华为王总说合同可以签了，金额50万

> 预期：AI 使用当前 profile（工作）记录

- 切换到个人数据库

> 预期：AI 记住当前 profile = personal

- 记录一下，收到张三礼金600元，结婚随礼

> 预期：AI 执行 `solo --profile personal event add ...`

- 查看一下人情往来记录

> 预期：AI 执行 `solo --profile personal event list --customer xxx`

---

## 第四阶段：使用中文 profile 名

- 创建一个叫"我的人情来往"的数据库，路径用 ~/social.db

> 预期：AI 执行 `solo config add-profile "我的人情来往" --path "~/social.db"`

- 用我的人情来往数据库查看记录

> 预期：AI 执行 `solo --profile "我的人情来往" event list ...`

---

## 第五阶段：会话遗失测试

（模拟 AI 记忆遗失场景）

- 记录一下，收到李总红包200元

> 预期：AI 询问"当前有多个数据库，要记录到哪个？"

- 人情来往

> 预期：AI 执行 `solo --profile "我的人情来往" event add ...`

---

## 第六阶段：清理

- 删除"我的人情来往"这个数据库配置

> 预期：AI 执行 `solo config remove-profile "我的人情来往"`

- 查看所有数据库配置

> 预期：只剩 work 和 personal
