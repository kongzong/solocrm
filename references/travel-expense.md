# Travel Expense Tracking (旅行记账)

SoloCRM can track travel expenses by treating the trip as a "customer" and expense categories as "persons".

## Setup

```bash
# Create trip as a customer
node solo.js customer ensure --name "潮汕5日游"

# Create expense categories as persons
node solo.js person ensure --customer cust_xxx --name "餐饮"
node solo.js person ensure --customer cust_xxx --name "交通"
node solo.js person ensure --customer cust_xxx --name "住宿"
node solo.js person ensure --customer cust_xxx --name "门票"
```

## Record Expenses

```bash
# Record an expense
node solo.js event add \
  --customer cust_xxx \
  --person pers_餐饮 \
  --content "牛肉火锅" \
  --amount 180 \
  --amount-type payment_out

# Record another expense
node solo.js event add \
  --customer cust_xxx \
  --person pers_交通 \
  --content "高铁票" \
  --amount 350 \
  --amount-type payment_out
```

## Query

```bash
# View all expenses for the trip
node solo.js event list --customer cust_xxx

# View recent expenses
node solo.js event list --customer cust_xxx --days 30

# View timeline
node solo.js timeline get cust_xxx --days 30

# Search across all expenses
node solo.js search "牛肉"

# Export to Excel
node solo.js export events --customer cust_xxx --format csv > 旅行账单.csv
```

## Example

```
Customer: 潮汕5日游
├── Person: 餐饮
│   ├── Event: 牛肉火锅 ¥180 2025-07-01
│   ├── Event: 生腌 ¥45 2025-07-01
│   └── Event: 粿条 ¥25 2025-07-02
├── Person: 交通
│   ├── Event: 高铁票 ¥350 2025-07-01
│   └── Event: 打车 ¥60 2025-07-03
└── Person: 住宿
    └── Event: 酒店3晚 ¥900 2025-07-01
```
