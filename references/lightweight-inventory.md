# 轻量进销存

SoloCRM 可以用于简单的进销存管理，将商品作为"客户"，出入库作为"事件"。

## 设置

```bash
# 创建商品作为客户
node solo.js customer ensure --name "iPhone 15"

# 可选：添加供应商/客户作为联系人
node solo.js person ensure --customer cust_xxx --name "苹果供应商" --title "供应商"
```

## 记录出入库

```bash
# 入库（进货）
node solo.js event add \
  --customer cust_xxx \
  --channel purchase \
  --event-action note \
  --content "进货50台" \
  --amount 250000 \
  --amount-type payment_out

# 出库（销售）
node solo.js event add \
  --customer cust_xxx \
  --channel sale \
  --event-action note \
  --content "销售10台" \
  --amount 50000 \
  --amount-type payment_in
```

## 查询

```bash
# 查看某商品所有出入库记录
node solo.js event list --customer cust_xxx

# 查看最近30天记录
node solo.js event list --customer cust_xxx --days 30

# 搜索特定操作
node solo.js search "进货"

# 导出库存记录
node solo.js export events --customer cust_xxx --format csv > 库存记录.csv
```

## 示例

```
Customer: iPhone 15
├── 2025-07-01 进货50台 ¥250,000 (payment_out)
├── 2025-07-03 销售10台 ¥50,000 (payment_in)
├── 2025-07-05 销售5台 ¥25,000 (payment_in)
└── 2025-07-06 进货20台 ¥100,000 (payment_out)
```

## 多商品管理

```bash
# 为每个商品创建客户
node solo.js customer ensure --name "iPhone 15"
node solo.js customer ensure --name "MacBook Pro"
node solo.js customer ensure --name "AirPods"

# 查看所有商品
node solo.js customer list
```

## 局限性

- 不支持实时库存数量计算（需从事件汇总）
- 不支持多仓库
- 不支持库存预警

适合：个人卖家、小型店铺、临时项目库存记录
