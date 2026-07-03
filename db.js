const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class DB {
  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customer (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        meta JSON
      );

      CREATE TABLE IF NOT EXISTS person (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        title TEXT,
        deleted_at DATETIME,
        FOREIGN KEY (customer_id) REFERENCES customer(id)
      );

      CREATE TABLE IF NOT EXISTS event (
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
        deleted_at DATETIME,
        meta JSON,
        FOREIGN KEY (customer_id) REFERENCES customer(id),
        FOREIGN KEY (person_id) REFERENCES person(id)
      );

      CREATE INDEX IF NOT EXISTS idx_event_customer ON event(customer_id);
      CREATE INDEX IF NOT EXISTS idx_event_occurred ON event(occurred_at);
      CREATE INDEX IF NOT EXISTS idx_person_customer ON person(customer_id);
    `);
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

  // Event operations

  eventAdd({
    customerId,
    personId = null,
    channel = null,
    action = null,
    content,
    amount = null,
    currency = 'CNY',
    occurredAt = null
  }) {
    const id = `evt_${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const occurred = occurredAt || now;

    this.db.prepare(
      `INSERT INTO event (id, customer_id, person_id, channel, action, content, amount, currency, occurred_at, recorded_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, customerId, personId, channel, action, content, amount, currency, occurred, now);

    return {
      id,
      customer_id: customerId,
      person_id: personId,
      channel,
      action,
      content,
      amount,
      currency,
      occurred_at: occurred,
      recorded_at: now
    };
  }

  eventList(customerId, limit = 50) {
    return this.db.prepare(
      'SELECT id, customer_id, person_id, channel, action, content, amount, currency, occurred_at, recorded_at, meta FROM event WHERE customer_id = ? AND deleted_at IS NULL ORDER BY occurred_at DESC LIMIT ?'
    ).all(customerId, limit);
  }

  eventDelete(id) {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE event SET deleted_at = ? WHERE id = ?').run(now, id);
    return { id, deleted_at: now };
  }

  // Timeline

  timelineGet(customerId, days = 90) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    return this.db.prepare(`
      SELECT 
        e.id, e.customer_id, e.person_id, e.channel, e.action, 
        e.content, e.amount, e.currency, e.occurred_at, e.recorded_at, e.meta,
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
    let sql = 'SELECT id, customer_id, person_id, channel, action, content, amount, currency, occurred_at, recorded_at, meta FROM event WHERE deleted_at IS NULL';
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
        e.content, e.amount, e.currency, e.occurred_at, e.recorded_at, e.meta,
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

  close() {
    this.db.close();
  }
}

module.exports = DB;
