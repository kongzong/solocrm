const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Schema version - increment when schema changes
const SCHEMA_VERSION = 3;

// Migration statements
const MIGRATIONS = {
  1: [
    // Initial schema
    `CREATE TABLE IF NOT EXISTS customer (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      meta JSON
    )`,
    `CREATE TABLE IF NOT EXISTS person (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      title TEXT,
      FOREIGN KEY (customer_id) REFERENCES customer(id)
    )`,
    `CREATE TABLE IF NOT EXISTS event (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      person_id TEXT,
      channel TEXT,
      action TEXT,
      content TEXT NOT NULL,
      amount REAL,
      currency TEXT DEFAULT 'CNY',
      occurred_at DATETIME,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      meta JSON,
      FOREIGN KEY (customer_id) REFERENCES customer(id),
      FOREIGN KEY (person_id) REFERENCES person(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_event_customer ON event(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_event_occurred ON event(occurred_at)`,
    `CREATE INDEX IF NOT EXISTS idx_person_customer ON person(customer_id)`,
  ],
  2: [
    // Add deleted_at columns for soft delete
    `ALTER TABLE customer ADD COLUMN deleted_at DATETIME`,
    `ALTER TABLE person ADD COLUMN deleted_at DATETIME`,
    `ALTER TABLE event ADD COLUMN deleted_at DATETIME`,
  ],
  3: [
    // Add amount_type for classifying amount meaning
    `ALTER TABLE event ADD COLUMN amount_type TEXT DEFAULT 'mentioned'`,
  ]
};

class DB {
  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._migrate();
  }

  _migrate() {
    // Create version table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // Get current version
    const row = this.db.prepare('SELECT version FROM schema_version').get();
    const currentVersion = row ? row.version : 0;

    if (currentVersion >= SCHEMA_VERSION) {
      return; // Already up to date
    }

    // Run migrations
    this.db.exec('BEGIN TRANSACTION');
    try {
      for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
        const statements = MIGRATIONS[v];
        if (statements) {
          for (const sql of statements) {
            try {
              this.db.exec(sql);
            } catch (err) {
              // Ignore "duplicate column" errors for ALTER TABLE
              if (!err.message.includes('duplicate column')) {
                throw err;
              }
            }
          }
        }
      }

      // Update version
      if (currentVersion === 0) {
        this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
      } else {
        this.db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
      }

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  // Customer operations

  customerEnsure(name) {
    const existing = this.db.prepare(
      'SELECT id, name, created_at, meta FROM customer WHERE name = ? AND deleted_at IS NULL'
    ).get(name);

    if (existing) {
      return existing;
    }

    const id = `cust_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    this.db.prepare(
      'INSERT INTO customer (id, name, created_at) VALUES (?, ?, ?)'
    ).run(id, name, now);

    return { id, name, created_at: now, meta: null };
  }

  customerGet(id) {
    const row = this.db.prepare(
      'SELECT id, name, created_at, meta FROM customer WHERE id = ? AND deleted_at IS NULL'
    ).get(id);
    return row || null;
  }

  customerList() {
    return this.db.prepare(
      'SELECT id, name, created_at, meta FROM customer WHERE deleted_at IS NULL ORDER BY created_at DESC'
    ).all();
  }

  customerDelete(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE customer SET deleted_at = ? WHERE id = ?').run(now, id);
    // Also soft delete related persons and events
    this.db.prepare('UPDATE person SET deleted_at = ? WHERE customer_id = ?').run(now, id);
    this.db.prepare('UPDATE event SET deleted_at = ? WHERE customer_id = ?').run(now, id);
    return { id, deleted_at: now };
  }

  // Person operations

  personEnsure(customerId, name, phone = null, email = null, title = null) {
    const existing = this.db.prepare(
      'SELECT id, customer_id, name, phone, email, title FROM person WHERE customer_id = ? AND name = ? AND deleted_at IS NULL'
    ).get(customerId, name);

    if (existing) {
      return existing;
    }

    const id = `pers_${uuidv4().slice(0, 8)}`;

    this.db.prepare(
      'INSERT INTO person (id, customer_id, name, phone, email, title) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, customerId, name, phone, email, title);

    return { id, customer_id: customerId, name, phone, email, title };
  }

  personFindByPhone(customerId, phone) {
    if (!phone) return null;
    const p = this.db.prepare(
      'SELECT id FROM person WHERE customer_id = ? AND phone = ? AND deleted_at IS NULL'
    ).get(customerId, phone);
    return p ? p.id : null;
  }

  personFindByEmail(customerId, email) {
    if (!email) return null;
    const p = this.db.prepare(
      'SELECT id FROM person WHERE customer_id = ? AND email = ? AND deleted_at IS NULL'
    ).get(customerId, email);
    return p ? p.id : null;
  }

  personList(customerId) {
    return this.db.prepare(
      'SELECT id, customer_id, name, phone, email, title FROM person WHERE customer_id = ? AND deleted_at IS NULL ORDER BY name'
    ).all(customerId);
  }

  personDelete(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE person SET deleted_at = ? WHERE id = ?').run(now, id);
    // Also soft delete related events
    this.db.prepare('UPDATE event SET person_id = NULL, deleted_at = ? WHERE person_id = ?').run(now, id);
    return { id, deleted_at: now };
  }

  customerRestore(id) {
    this.db.prepare('UPDATE customer SET deleted_at = NULL WHERE id = ?').run(id);
    return { id, restored: true };
  }

  personRestore(id) {
    this.db.prepare('UPDATE person SET deleted_at = NULL WHERE id = ?').run(id);
    return { id, restored: true };
  }

  eventRestore(id) {
    this.db.prepare('UPDATE event SET deleted_at = NULL WHERE id = ?').run(id);
    return { id, restored: true };
  }

  // Event operations

  eventAdd({
    customerId,
    personId = null,
    channel = null,
    action = null,
    content,
    amount = null,
    currency = 'CNY',
    amountType = 'mentioned',
    occurredAt = null
  }) {
    const id = `evt_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const occurred = occurredAt || now;

    this.db.prepare(
      `INSERT INTO event (id, customer_id, person_id, channel, action, content, amount, currency, amount_type, occurred_at, recorded_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, customerId, personId, channel, action, content, amount, currency, amountType, occurred, now);

    return {
      id,
      customer_id: customerId,
      person_id: personId,
      channel,
      action,
      content,
      amount,
      currency,
      amount_type: amountType,
      occurred_at: occurred,
      recorded_at: now
    };
  }

  eventList(customerId, limit = 50, days = null) {
    let sql = 'SELECT id, customer_id, person_id, channel, action, content, amount, currency, amount_type, occurred_at, recorded_at, meta FROM event WHERE customer_id = ? AND deleted_at IS NULL';
    const params = [customerId];

    if (days) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      sql += ' AND occurred_at >= ?';
      params.push(cutoff);
    }

    sql += ' ORDER BY occurred_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(sql).all(...params);
  }

  eventDelete(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE event SET deleted_at = ? WHERE id = ?').run(now, id);
    return { id, deleted_at: now };
  }

  search(options = {}) {
    let sql = `
      SELECT 
        e.id, e.customer_id, e.person_id, e.channel, e.action, 
        e.content, e.amount, e.currency, e.amount_type, e.occurred_at, e.recorded_at,
        c.name as customer_name,
        p.name as person_name
      FROM event e
      JOIN customer c ON e.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN person p ON e.person_id = p.id AND p.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
    `;
    const conditions = [];
    const params = [];

    if (options.keyword) {
      conditions.push('(e.content LIKE ? OR c.name LIKE ? OR p.name LIKE ?)');
      const pattern = `%${options.keyword}%`;
      params.push(pattern, pattern, pattern);
    }

    if (options.customerId) {
      conditions.push('e.customer_id = ?');
      params.push(options.customerId);
    }

    if (options.channel) {
      conditions.push('e.channel = ?');
      params.push(options.channel);
    }

    if (options.days) {
      const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
      conditions.push('e.occurred_at >= ?');
      params.push(cutoff);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY e.occurred_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(sql).all(...params);
  }

  // Timeline

  timelineGet(customerId, days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    return this.db.prepare(`
      SELECT 
        e.id, e.customer_id, e.person_id, e.channel, e.action, 
        e.content, e.amount, e.currency, e.amount_type, e.occurred_at, e.recorded_at, e.meta,
        c.name as customer_name,
        p.name as person_name
      FROM event e
      JOIN customer c ON e.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN person p ON e.person_id = p.id AND p.deleted_at IS NULL
      WHERE e.customer_id = ? AND e.occurred_at >= ? AND e.deleted_at IS NULL
      ORDER BY e.occurred_at DESC
    `).all(customerId, cutoff);
  }

  // Export methods

  customerListAll() {
    return this.db.prepare(
      'SELECT id, name, created_at, meta FROM customer WHERE deleted_at IS NULL ORDER BY created_at'
    ).all();
  }

  eventListAll(options = {}) {
    let sql = 'SELECT id, customer_id, person_id, channel, action, content, amount, currency, amount_type, occurred_at, recorded_at, meta FROM event WHERE deleted_at IS NULL';
    const conditions = [];
    const params = [];

    if (options.customerId) {
      conditions.push('customer_id = ?');
      params.push(options.customerId);
    }

    if (options.days) {
      const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
      conditions.push('occurred_at >= ?');
      params.push(cutoff);
    }

    if (options.channel) {
      conditions.push('channel = ?');
      params.push(options.channel);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY occurred_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(sql).all(...params);
  }

  eventListWithNames(options = {}) {
    let sql = `
      SELECT 
        e.id, e.customer_id, e.person_id, e.channel, e.action, 
        e.content, e.amount, e.currency, e.amount_type, e.occurred_at, e.recorded_at, e.meta,
        c.name as customer_name,
        p.name as person_name
      FROM event e
      JOIN customer c ON e.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN person p ON e.person_id = p.id AND p.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
    `;
    const conditions = [];
    const params = [];

    if (options.customerId) {
      conditions.push('e.customer_id = ?');
      params.push(options.customerId);
    }

    if (options.days) {
      const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();
      conditions.push('e.occurred_at >= ?');
      params.push(cutoff);
    }

    if (options.channel) {
      conditions.push('e.channel = ?');
      params.push(options.channel);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY e.occurred_at DESC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(sql).all(...params);
  }

  backupAll() {
    return {
      customers: this.customerListAll(),
      persons: this.db.prepare('SELECT * FROM person WHERE deleted_at IS NULL ORDER BY customer_id, name').all(),
      events: this.db.prepare('SELECT * FROM event WHERE deleted_at IS NULL ORDER BY occurred_at').all(),
      exported_at: new Date().toISOString()
    };
  }

  // Import methods

  importBackup(data) {
    const results = {
      customers: { imported: 0, skipped: 0 },
      persons: { imported: 0, skipped: 0 },
      events: { imported: 0, skipped: 0 }
    };

    // Build ID mapping: old_id -> new_id
    const customerIdMap = {};
    const personIdMap = {};

    // Track which customers already existed
    const existingCustomerNames = new Set(
      this.db.prepare('SELECT name FROM customer').all().map(c => c.name)
    );

    // Import customers (idempotent by name)
    if (data.customers) {
      for (const c of data.customers) {
        const existing = this.customerEnsure(c.name);
        customerIdMap[c.id] = existing.id;
        if (existingCustomerNames.has(c.name)) {
          results.customers.skipped++;
        } else {
          results.customers.imported++;
        }
      }
    }

    // Track which persons already existed (by phone or email)
    const existingPersons = new Set();
    this.db.prepare('SELECT customer_id, phone, email FROM person')
      .all()
      .forEach(p => {
        if (p.phone) existingPersons.add(`${p.customer_id}:phone:${p.phone}`);
        if (p.email) existingPersons.add(`${p.customer_id}:email:${p.email}`);
      });

    // Import persons (idempotent by customer+phone or customer+email)
    if (data.persons) {
      for (const p of data.persons) {
        const newCustomerId = customerIdMap[p.customer_id];
        if (!newCustomerId) continue;

        // Check if already exists by phone or email
        const key = p.phone
          ? `${newCustomerId}:phone:${p.phone}`
          : p.email
            ? `${newCustomerId}:email:${p.email}`
            : null;
        
        if (key && existingPersons.has(key)) {
          personIdMap[p.id] = this.personFindByPhone(newCustomerId, p.phone) ||
                               this.personFindByEmail(newCustomerId, p.email);
          results.persons.skipped++;
          continue;
        }

        const existing = this.personEnsure(
          newCustomerId,
          p.name,
          p.phone,
          p.email,
          p.title
        );
        personIdMap[p.id] = existing.id;
        results.persons.imported++;
      }
    }

    // Import events (always create new)
    if (data.events) {
      for (const e of data.events) {
        const newCustomerId = customerIdMap[e.customer_id];
        if (!newCustomerId) continue;

        const newPersonId = e.person_id ? personIdMap[e.person_id] : null;

        this.eventAdd({
          customerId: newCustomerId,
          personId: newPersonId,
          channel: e.channel,
          action: e.action,
          content: e.content,
          amount: e.amount,
          currency: e.currency,
          amountType: e.amount_type,
          occurredAt: e.occurred_at
        });
        results.events.imported++;
      }
    }

    return results;
  }

  importEvents(events) {
    let imported = 0;
    for (const e of events) {
      this.eventAdd({
        customerId: e.customer_id,
        personId: e.person_id,
        channel: e.channel,
        action: e.action,
        content: e.content,
        amount: e.amount,
        currency: e.currency,
        amountType: e.amount_type,
        occurredAt: e.occurred_at
      });
      imported++;
    }
    return { imported };
  }

  close() {
    this.db.close();
  }
}

module.exports = DB;
