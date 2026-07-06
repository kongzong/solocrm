# Social Gift Tracking (人情往来)

SoloCRM can track personal social gifts by treating people as "customers".

## Setup

```bash
# Create a person as a customer
node solo.js customer ensure --name "张三"
```

## Record Gifts

```bash
# Received gift (收礼)
node solo.js event add \
  --customer cust_xxx \
  --content "结婚随礼" \
  --amount 600 \
  --amount-type payment_in

# Gave gift (送礼)
node solo.js event add \
  --customer cust_xxx \
  --content "孩子满月回礼" \
  --amount 800 \
  --amount-type payment_out
```

## Query

```bash
# View gift history for a person
node solo.js event list --customer cust_xxx

# View recent 30 days
node solo.js event list --customer cust_xxx --days 30

# Search all gifts
node solo.js search "随礼"

# Export gift records
node solo.js export events --customer cust_xxx --format csv > gifts.csv
```

## Example

```
Customer: 张三（朋友）
├── 2025-06-01 收到礼金600元（结婚） payment_in
├── 2025-10-01 送出礼金800元（张三孩子满月） payment_out
└── 2026-01-01 收到红包200元（春节） payment_in
```
