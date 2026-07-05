#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const os = require('os');
const DB = require('./db');

const program = new Command();

program
  .name('solo')
  .description('AI Agent business fact kernel')
  .version('0.1.0');

function getDbPath() {
  return process.env.SOLOCRM_DB || path.join(os.homedir(), '.solocrm', 'data.db');
}

function getDb() {
  return new DB(getDbPath());
}

const parseDateInt = (v) => parseInt(v, 10);

// CSV helper
function arrayToCsv(data) {
  if (!data || data.length === 0) return '';
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Escape CSV value
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  // Build CSV
  const lines = [
    headers.map(escape).join(','),
    ...data.map(row => headers.map(h => escape(row[h])).join(','))
  ];
  
  return lines.join('\n');
}

// Customer commands
const customerCmd = program
  .command('customer')
  .alias('c')
  .description('Customer management');

customerCmd
  .command('ensure')
  .description('Create or get customer by name (idempotent)')
  .requiredOption('--name <name>', 'Customer name')
  .action((opts) => {
    const db = getDb();
    try {
      const customer = db.customerEnsure(opts.name);
      console.log(JSON.stringify(customer, null, 2));
    } finally {
      db.close();
    }
  });

customerCmd
  .command('get <id>')
  .description('Get customer by ID')
  .action((id) => {
    const db = getDb();
    try {
      const customer = db.customerGet(id);
      if (customer) {
        console.log(JSON.stringify(customer, null, 2));
      } else {
        console.error(JSON.stringify({ error: `Customer not found: ${id}` }));
        process.exit(1);
      }
    } finally {
      db.close();
    }
  });

customerCmd
  .command('list')
  .description('List all customers')
  .action(() => {
    const db = getDb();
    try {
      const customers = db.customerList();
      console.log(JSON.stringify(customers, null, 2));
    } finally {
      db.close();
    }
  });

customerCmd
  .command('delete <id>')
  .description('Soft delete customer (and related persons/events)')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.customerDelete(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

customerCmd
  .command('restore <id>')
  .description('Restore soft-deleted customer')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.customerRestore(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

// Person commands
const personCmd = program
  .command('person')
  .alias('p')
  .description('Person management');

personCmd
  .command('ensure')
  .description('Create or get person by name (idempotent)')
  .requiredOption('--customer <id>', 'Customer ID')
  .requiredOption('--name <name>', 'Person name')
  .option('--phone <phone>', 'Phone number')
  .option('--email <email>', 'Email')
  .option('--title <title>', 'Job title')
  .action((opts) => {
    const db = getDb();
    try {
      const person = db.personEnsure(opts.customer, opts.name, opts.phone, opts.email, opts.title);
      console.log(JSON.stringify(person, null, 2));
    } finally {
      db.close();
    }
  });

personCmd
  .command('list')
  .description('List persons for a customer')
  .requiredOption('--customer <id>', 'Customer ID')
  .action((opts) => {
    const db = getDb();
    try {
      const persons = db.personList(opts.customer);
      console.log(JSON.stringify(persons, null, 2));
    } finally {
      db.close();
    }
  });

personCmd
  .command('delete <id>')
  .description('Soft delete person')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.personDelete(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

personCmd
  .command('restore <id>')
  .description('Restore soft-deleted person')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.personRestore(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

// Event commands
const eventCmd = program
  .command('event')
  .alias('e')
  .description('Event management');

eventCmd
  .command('add')
  .description('Add a new event')
  .requiredOption('--customer <id>', 'Customer ID')
  .requiredOption('--content <content>', 'Event content')
  .option('--person <id>', 'Person ID')
  .option('--channel <channel>', 'Channel: call, meeting, email, wechat, visit')
  .option('--event-action <action>', 'Action: note, request, decision, commitment')
  .option('--amount <amount>', 'Amount mentioned', parseFloat)
  .option('--currency <currency>', 'Currency (default: CNY)', 'CNY')
  .option('--amount-type <type>', 'Amount type: contract, payment_in, payment_out, budget, quote, deposit, mentioned', 'mentioned')
  .option('--occurred-at <date>', 'When it happened (ISO8601)')
  .action((opts) => {
    const db = getDb();
    try {
      const event = db.eventAdd({
        customerId: opts.customer,
        personId: opts.person,
        channel: opts.channel,
        action: opts.eventAction,
        content: opts.content,
        amount: opts.amount,
        currency: opts.currency,
        amountType: opts.amountType,
        occurredAt: opts.occurredAt
      });
      console.log(JSON.stringify(event, null, 2));
    } finally {
      db.close();
    }
  });

eventCmd
  .command('list')
  .description('List events for a customer')
  .requiredOption('--customer <id>', 'Customer ID')
  .option('--limit <n>', 'Max results', parseDateInt, 50)
  .action((opts) => {
    const db = getDb();
    try {
      const events = db.eventList(opts.customer, opts.limit);
      console.log(JSON.stringify(events, null, 2));
    } finally {
      db.close();
    }
  });

eventCmd
  .command('delete <id>')
  .description('Soft delete event')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.eventDelete(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

eventCmd
  .command('restore <id>')
  .description('Restore soft-deleted event')
  .action((id) => {
    const db = getDb();
    try {
      const result = db.eventRestore(id);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      db.close();
    }
  });

// Timeline commands
const timelineCmd = program
  .command('timeline')
  .alias('t')
  .description('Timeline queries');

timelineCmd
  .command('get <id>')
  .description('Get timeline for a customer')
  .option('--days <n>', 'Days to look back', parseDateInt, 90)
  .action((id, opts) => {
    const db = getDb();
    try {
      const entries = db.timelineGet(id, opts.days);
      console.log(JSON.stringify(entries, null, 2));
    } finally {
      db.close();
    }
  });

// Search commands
program
  .command('search')
  .alias('s')
  .description('Search events by keyword')
  .argument('[keyword]', 'Search keyword')
  .option('--customer <id>', 'Filter by customer ID')
  .option('--channel <channel>', 'Filter by channel')
  .option('--range <range>', 'Time range: 7d, 30d, 90d, 1y')
  .option('--limit <n>', 'Max results', parseDateInt, 50)
  .option('--format <format>', 'Output format: json, md', 'json')
  .action((keyword, opts) => {
    const db = getDb();
    try {
      const options = {
        keyword,
        customerId: opts.customer,
        channel: opts.channel,
        limit: opts.limit
      };

      // Parse range
      if (opts.range) {
        const match = opts.range.match(/^(\d+)(d|m|y)$/);
        if (!match) {
          console.error('Invalid range format. Use: 7d, 30d, 90d, 1y');
          process.exit(1);
        }
        const [, num, unit] = match;
        const days = unit === 'y' ? parseInt(num) * 365 : unit === 'm' ? parseInt(num) * 30 : parseInt(num);
        options.days = days;
      }

      const results = db.search(options);

      if (opts.format === 'json') {
        console.log(JSON.stringify(results, null, 2));
      } else if (opts.format === 'md') {
        if (results.length === 0) {
          console.log('No results found.');
          return;
        }

        let md = `# Search Results${keyword ? `: "${keyword}"` : ''}\n\n`;
        for (const r of results) {
          const date = r.occurred_at ? r.occurred_at.split('T')[0] : 'unknown';
          md += `## ${date} - ${r.customer_name}\n`;
          if (r.person_name) md += `**With**: ${r.person_name}\n`;
          md += `**Channel**: ${r.channel || 'unknown'}\n\n`;
          md += `${r.content}\n\n`;
          if (r.amount) md += `**Amount**: ${r.amount} ${r.currency || 'CNY'}\n\n`;
          md += '---\n\n';
        }
        console.log(md);
      }
    } finally {
      db.close();
    }
  });

// Export commands
const exportCmd = program
  .command('export')
  .alias('x')
  .description('Export data');

exportCmd
  .command('customer')
  .description('Export customer info')
  .requiredOption('--id <id>', 'Customer ID')
  .option('--format <format>', 'Output format: json, md', 'json')
  .action((opts) => {
    const db = getDb();
    try {
      const customer = db.customerGet(opts.id);
      if (!customer) {
        console.error(JSON.stringify({ error: `Customer not found: ${opts.id}` }));
        process.exit(1);
      }

      if (opts.format === 'json') {
        console.log(JSON.stringify(customer, null, 2));
      } else if (opts.format === 'md') {
        let md = `# ${customer.name}\n\n`;
        md += `- **ID**: \`${customer.id}\`\n`;
        md += `- **Created**: ${customer.created_at}\n`;

        const persons = db.personList(customer.id);
        if (persons.length > 0) {
          md += `\n## Contacts\n\n`;
          for (const p of persons) {
            md += `- **${p.name}**`;
            if (p.title) md += ` (${p.title})`;
            if (p.phone) md += ` | ${p.phone}`;
            if (p.email) md += ` | ${p.email}`;
            md += '\n';
          }
        }

        console.log(md);
      }
    } finally {
      db.close();
    }
  });

exportCmd
  .command('timeline')
  .description('Export timeline')
  .requiredOption('--customer <id>', 'Customer ID')
  .option('--format <format>', 'Output format: json, md', 'md')
  .option('--days <n>', 'Days to look back', parseDateInt, 90)
  .action((opts) => {
    const db = getDb();
    try {
      const entries = db.timelineGet(opts.customer, opts.days);

      if (opts.format === 'json') {
        console.log(JSON.stringify(entries, null, 2));
      } else if (opts.format === 'md') {
        if (entries.length === 0) {
          console.log('No events found.');
          return;
        }

        const customerName = entries[0].customer_name;
        let md = `# Timeline: ${customerName}\n\n`;

        for (const entry of entries) {
          const date = entry.occurred_at ? entry.occurred_at.split('T')[0] : 'unknown';
          md += `## ${date} - ${entry.channel || 'unknown'}\n`;

          if (entry.person_name) {
            md += `**With**: ${entry.person_name}\n`;
          }

          md += `\n${entry.content}\n\n`;

          if (entry.amount) {
            md += `**Amount**: ${entry.amount} ${entry.currency || 'CNY'}\n\n`;
          }

          md += `---\n\n`;
        }

        console.log(md);
      }
    } finally {
      db.close();
    }
  });

exportCmd
  .command('events')
  .description('Export events')
  .option('--customer <id>', 'Filter by customer ID')
  .option('--range <range>', 'Time range: 7d, 30d, 90d, 1y')
  .option('--channel <channel>', 'Filter by channel')
  .option('--format <format>', 'Output format: ndjson, json, md, csv', 'ndjson')
  .option('--limit <n>', 'Max results', parseDateInt, 1000)
  .action((opts) => {
    const db = getDb();
    try {
      const options = {
        customerId: opts.customer,
        channel: opts.channel,
        limit: opts.limit
      };

      // Parse range
      if (opts.range) {
        const match = opts.range.match(/^(\d+)(d|m|y)$/);
        if (!match) {
          console.error('Invalid range format. Use: 7d, 30d, 90d, 1y');
          process.exit(1);
        }
        const [, num, unit] = match;
        const days = unit === 'y' ? parseInt(num) * 365 : unit === 'm' ? parseInt(num) * 30 : parseInt(num);
        options.days = days;
      }

      const events = db.eventListWithNames(options);

      if (opts.format === 'ndjson') {
        for (const e of events) {
          console.log(JSON.stringify(e));
        }
      } else if (opts.format === 'json') {
        console.log(JSON.stringify(events, null, 2));
      } else if (opts.format === 'csv') {
        console.log(arrayToCsv(events));
      } else if (opts.format === 'md') {
        if (events.length === 0) {
          console.log('No events found.');
          return;
        }

        let md = '# Events\n\n';
        for (const e of events) {
          const date = e.occurred_at ? e.occurred_at.split('T')[0] : 'unknown';
          md += `## ${date} - ${e.customer_name}\n`;
          if (e.person_name) md += `**With**: ${e.person_name}\n`;
          md += `**Channel**: ${e.channel || 'unknown'}\n\n`;
          md += `${e.content}\n\n`;
          if (e.amount) md += `**Amount**: ${e.amount} ${e.currency || 'CNY'}\n\n`;
          md += '---\n\n';
        }
        console.log(md);
      }
    } finally {
      db.close();
    }
  });

exportCmd
  .command('customers')
  .description('Export all customers')
  .option('--format <format>', 'Output format: json, md, ndjson, csv', 'json')
  .action((opts) => {
    const db = getDb();
    try {
      const customers = db.customerListAll();

      if (opts.format === 'json') {
        console.log(JSON.stringify(customers, null, 2));
      } else if (opts.format === 'ndjson') {
        for (const c of customers) {
          console.log(JSON.stringify(c));
        }
      } else if (opts.format === 'csv') {
        console.log(arrayToCsv(customers));
      } else if (opts.format === 'md') {
        if (customers.length === 0) {
          console.log('No customers found.');
          return;
        }

        let md = '# All Customers\n\n';
        for (const c of customers) {
          md += `## ${c.name}\n`;
          md += `- **ID**: \`${c.id}\`\n`;
          md += `- **Created**: ${c.created_at}\n`;

          const persons = db.personList(c.id);
          if (persons.length > 0) {
            md += '- **Contacts**:\n';
            for (const p of persons) {
              md += `  - ${p.name}`;
              if (p.title) md += ` (${p.title})`;
              if (p.phone) md += ` | ${p.phone}`;
              md += '\n';
            }
          }
          md += '\n';
        }
        console.log(md);
      }
    } finally {
      db.close();
    }
  });

exportCmd
  .command('persons')
  .description('Export all persons')
  .option('--customer <id>', 'Filter by customer ID')
  .option('--format <format>', 'Output format: json, md, ndjson, csv', 'json')
  .action((opts) => {
    const db = getDb();
    try {
      let persons;
      if (opts.customer) {
        persons = db.personList(opts.customer);
      } else {
        persons = db.db.prepare('SELECT * FROM person ORDER BY customer_id, name').all();
      }

      if (opts.format === 'json') {
        console.log(JSON.stringify(persons, null, 2));
      } else if (opts.format === 'ndjson') {
        for (const p of persons) {
          console.log(JSON.stringify(p));
        }
      } else if (opts.format === 'csv') {
        console.log(arrayToCsv(persons));
      } else if (opts.format === 'md') {
        if (persons.length === 0) {
          console.log('No persons found.');
          return;
        }

        let md = '# Contacts\n\n';
        for (const p of persons) {
          const customer = db.customerGet(p.customer_id);
          md += `## ${p.name}\n`;
          md += `- **Customer**: ${customer ? customer.name : p.customer_id}\n`;
          md += `- **ID**: \`${p.id}\`\n`;
          if (p.title) md += `- **Title**: ${p.title}\n`;
          if (p.phone) md += `- **Phone**: ${p.phone}\n`;
          if (p.email) md += `- **Email**: ${p.email}\n`;
          md += '\n';
        }
        console.log(md);
      }
    } finally {
      db.close();
    }
  });

exportCmd
  .command('backup')
  .description('Full backup of all data')
  .option('--format <format>', 'Output format: json, ndjson', 'json')
  .action((opts) => {
    const db = getDb();
    try {
      const backup = db.backupAll();

      if (opts.format === 'json') {
        console.log(JSON.stringify(backup, null, 2));
      } else if (opts.format === 'ndjson') {
        // NDJSON format: one line per record type
        for (const c of backup.customers) {
          console.log(JSON.stringify({ _type: 'customer', ...c }));
        }
        for (const p of backup.persons) {
          console.log(JSON.stringify({ _type: 'person', ...p }));
        }
        for (const e of backup.events) {
          console.log(JSON.stringify({ _type: 'event', ...e }));
        }
      }
    } finally {
      db.close();
    }
  });

// Import commands
program
  .command('import')
  .alias('i')
  .description('Import data from file')
  .argument('<file>', 'JSON file to import (from export backup)')
  .action((file) => {
    const db = getDb();
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Resolve file path
      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) {
        console.error(JSON.stringify({ error: `File not found: ${filePath}` }));
        process.exit(1);
      }

      // Read and parse file
      const content = fs.readFileSync(filePath, 'utf-8');
      let data;
      try {
        data = JSON.parse(content);
      } catch (e) {
        console.error(JSON.stringify({ error: 'Invalid JSON file' }));
        process.exit(1);
      }

      // Check if it's a backup format
      if (!data.customers && !data.persons && !data.events) {
        console.error(JSON.stringify({ error: 'Invalid backup format. Expected customers, persons, or events.' }));
        process.exit(1);
      }

      // Import
      const results = db.importBackup(data);
      console.log(JSON.stringify(results, null, 2));
    } finally {
      db.close();
    }
  });

program.parse();
