# SoloCRM

AI Agent business fact kernel for recording and querying structured business facts.

## For AI Agent: Installation

If user asks you to install this skill, execute these steps:

```bash
# Step 1: Clone to skills directory
git clone https://github.com/your-username/solocrm.git ~/.agents/skills/solocrm

# Step 2: Install dependencies
cd ~/.agents/skills/solocrm
npm install

# Step 3: Verify
node solo.js --version
```

After installation, read `~/.agents/skills/solocrm/SKILL.md` to learn how to use this skill.

## For Human

### Requirements

- Node.js >= 18.0.0

### Install

```bash
git clone https://github.com/your-username/solocrm.git
cd solocrm
npm install
```

### Quick Start

```bash
# 1. Create customer
node solo.js customer ensure --name "腾讯"

# 2. Add contact
node solo.js person ensure --customer cust_xxx --name "张三" --title "产品总监"

# 3. Record event
node solo.js event add --customer cust_xxx --person pers_xxx --channel meeting --event-action note --content "讨论预算30万" --amount 300000

# 4. Query
node solo.js customer list
node solo.js timeline get cust_xxx

# 5. Export
node solo.js export customers --format csv > customers.csv
```

### Run Tests

```bash
npm test
```

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

### Customer Commands

```bash
solo customer ensure --name "腾讯"     # Create or get (idempotent)
solo customer get <id>                  # Get by ID
solo customer list                      # List all customers
```

### Person Commands

```bash
solo person ensure --customer <id> --name "张三"  # Create or get
solo person list --customer <id>                   # List contacts for customer
```

### Event Commands

```bash
solo event add --customer <id> --channel meeting --event-action note --content "..."  # Add event
solo event list --customer <id> --limit 10                                             # List events
```

### Timeline Commands

```bash
solo timeline get <customer_id> --days 30  # Get timeline
```

### Export Commands

```bash
# Single customer
solo export customer --id <id> --format json|md

# Timeline
solo export timeline --customer <id> --format json|md --days 90

# Events with filters
solo export events --format ndjson|json|md|csv
solo export events --customer <id> --range 30d
solo export events --channel meeting --range 7d

# All customers
solo export customers --format json|md|ndjson|csv

# All persons (contacts)
solo export persons --format json|md|ndjson|csv
solo export persons --customer <id> --format json

# Full backup
solo export backup --format json|ndjson
```

### Export Formats

| Format | Use Case | Excel Compatible |
|--------|----------|------------------|
| `json` | Structured data, AI processing | - |
| `ndjson` | AI pipelines, streaming | - |
| `md` | Human reading, documentation | - |
| `csv` | Excel, spreadsheet analysis | ✓ |

### Filter Options

| Option | Example | Description |
|--------|---------|-------------|
| `--range` | `30d`, `7d`, `1y` | Time range filter |
| `--channel` | `meeting`, `call` | Filter by channel |
| `--customer` | `cust_xxx` | Filter by customer |

## Database

SQLite database stored at: `~/.solocrm/data.db`

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## License

MIT
