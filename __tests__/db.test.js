const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const DB = require('../db');

describe('Database', () => {
  let db;
  let testDbPath;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(os.tmpdir(), `test-solocrm-${Date.now()}.db`);
    db = new DB(testDbPath);
  });

  afterEach(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Migration', () => {
    test('should create schema_version table', () => {
      const row = db.db.prepare('SELECT version FROM schema_version').get();
      expect(row).toBeDefined();
      expect(row.version).toBe(3); // Current version
    });

    test('should migrate old database without deleted_at', () => {
      // Close current db
      db.close();
      
      // Use a different path for old database
      const oldDbPath = path.join(os.tmpdir(), `test-solocrm-old-${Date.now()}.db`);
      
      // Create an old-style database (without deleted_at)
      const oldDb = new Database(oldDbPath);
      oldDb.exec(`
        CREATE TABLE customer (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          meta JSON
        );
        CREATE TABLE person (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          title TEXT,
          FOREIGN KEY (customer_id) REFERENCES customer(id)
        );
        CREATE TABLE event (
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
        );
      `);
      oldDb.close();
      
      // Open with new DB class - should auto-migrate
      db = new DB(oldDbPath);
      
      // Verify deleted_at column exists
      const columns = db.db.prepare("PRAGMA table_info(customer)").all();
      const hasDeletedAt = columns.some(c => c.name === 'deleted_at');
      expect(hasDeletedAt).toBe(true);
      
      // Verify schema version updated
      const row = db.db.prepare('SELECT version FROM schema_version').get();
      expect(row.version).toBe(3);
      
      // Cleanup
      db.close();
      if (fs.existsSync(oldDbPath)) {
        fs.unlinkSync(oldDbPath);
      }
      // Reassign testDbPath for afterEach cleanup
      testDbPath = oldDbPath;
    });

    test('should be idempotent on fresh database', () => {
      // Opening same database twice should work
      const db2 = new DB(testDbPath);
      db2.close();
      
      const row = db.db.prepare('SELECT version FROM schema_version').get();
      expect(row.version).toBe(3);
    });
  });

  describe('Customer', () => {
    test('should create a new customer', () => {
      const customer = db.customerEnsure('腾讯');
      
      expect(customer).toHaveProperty('id');
      expect(customer.id).toMatch(/^cust_/);
      expect(customer.name).toBe('腾讯');
      expect(customer.created_at).toBeDefined();
    });

    test('should return existing customer on ensure', () => {
      const customer1 = db.customerEnsure('腾讯');
      const customer2 = db.customerEnsure('腾讯');
      
      expect(customer1.id).toBe(customer2.id);
    });

    test('should get customer by id', () => {
      const created = db.customerEnsure('腾讯');
      const retrieved = db.customerGet(created.id);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved.name).toBe('腾讯');
    });

    test('should return null for non-existent customer', () => {
      const result = db.customerGet('cust_nonexistent');
      expect(result).toBeNull();
    });

    test('should list all customers', () => {
      db.customerEnsure('腾讯');
      db.customerEnsure('阿里');
      
      const customers = db.customerList();
      expect(customers.length).toBe(2);
    });
  });

  describe('Person', () => {
    let customerId;

    beforeEach(() => {
      const customer = db.customerEnsure('腾讯');
      customerId = customer.id;
    });

    test('should create a new person', () => {
      const person = db.personEnsure(customerId, '张三', '13800138000', 'zhangsan@test.com', '产品总监');
      
      expect(person).toHaveProperty('id');
      expect(person.id).toMatch(/^pers_/);
      expect(person.customer_id).toBe(customerId);
      expect(person.name).toBe('张三');
      expect(person.phone).toBe('13800138000');
      expect(person.email).toBe('zhangsan@test.com');
      expect(person.title).toBe('产品总监');
    });

    test('should return existing person on ensure', () => {
      const person1 = db.personEnsure(customerId, '张三');
      const person2 = db.personEnsure(customerId, '张三');
      
      expect(person1.id).toBe(person2.id);
    });

    test('should create different persons with same name for different customers', () => {
      const customer2 = db.customerEnsure('阿里');
      
      const person1 = db.personEnsure(customerId, '张三');
      const person2 = db.personEnsure(customer2.id, '张三');
      
      expect(person1.id).not.toBe(person2.id);
    });

    test('should list persons for a customer', () => {
      db.personEnsure(customerId, '张三');
      db.personEnsure(customerId, '李四');
      
      const persons = db.personList(customerId);
      expect(persons.length).toBe(2);
    });
  });

  describe('Event', () => {
    let customerId;
    let personId;

    beforeEach(() => {
      const customer = db.customerEnsure('腾讯');
      customerId = customer.id;
      const person = db.personEnsure(customerId, '张三');
      personId = person.id;
    });

    test('should add an event', () => {
      const event = db.eventAdd({
        customerId,
        personId,
        channel: 'meeting',
        action: 'note',
        content: '讨论预算30万',
        amount: 300000,
        currency: 'CNY'
      });
      
      expect(event).toHaveProperty('id');
      expect(event.id).toMatch(/^evt_/);
      expect(event.customer_id).toBe(customerId);
      expect(event.person_id).toBe(personId);
      expect(event.channel).toBe('meeting');
      expect(event.action).toBe('note');
      expect(event.content).toBe('讨论预算30万');
      expect(event.amount).toBe(300000);
    });

    test('should add event without optional fields', () => {
      const event = db.eventAdd({
        customerId,
        content: '简单记录'
      });
      
      expect(event.channel).toBeNull();
      expect(event.action).toBeNull();
      expect(event.amount).toBeNull();
    });

    test('should list events for a customer', () => {
      db.eventAdd({ customerId, content: '事件1' });
      db.eventAdd({ customerId, content: '事件2' });
      
      const events = db.eventList(customerId);
      expect(events.length).toBe(2);
    });

    test('should list events in descending order by occurred_at', () => {
      db.eventAdd({ customerId, content: '旧事件', occurredAt: '2025-01-01T00:00:00Z' });
      db.eventAdd({ customerId, content: '新事件', occurredAt: '2025-01-02T00:00:00Z' });
      
      const events = db.eventList(customerId);
      expect(events[0].content).toBe('新事件');
      expect(events[1].content).toBe('旧事件');
    });

    test('should limit results', () => {
      db.eventAdd({ customerId, content: '事件1' });
      db.eventAdd({ customerId, content: '事件2' });
      db.eventAdd({ customerId, content: '事件3' });
      
      const events = db.eventList(customerId, 2);
      expect(events.length).toBe(2);
    });
  });

  describe('Timeline', () => {
    let customerId;

    beforeEach(() => {
      const customer = db.customerEnsure('腾讯');
      customerId = customer.id;
      const person = db.personEnsure(customerId, '张三');
      
      db.eventAdd({
        customerId,
        personId: person.id,
        channel: 'meeting',
        content: '讨论预算30万',
        amount: 300000,
        occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
      });
      
      db.eventAdd({
        customerId,
        channel: 'phone',
        content: '跟进电话',
        occurredAt: new Date().toISOString()
      });
    });

    test('should get timeline with default 90 days', () => {
      const entries = db.timelineGet(customerId);
      expect(entries.length).toBe(2);
    });

    test('should filter by days', () => {
      const entries = db.timelineGet(customerId, 5);
      expect(entries.length).toBe(1);
      expect(entries[0].content).toBe('跟进电话');
    });

    test('should include customer and person names', () => {
      const entries = db.timelineGet(customerId);
      const meetingEntry = entries.find(e => e.channel === 'meeting');
      expect(meetingEntry).toBeDefined();
      expect(meetingEntry.customer_name).toBe('腾讯');
      expect(meetingEntry.person_name).toBe('张三');
    });

    test('should handle events without person', () => {
      const entries = db.timelineGet(customerId);
      const eventWithoutPerson = entries.find(e => !e.person_name);
      expect(eventWithoutPerson).toBeDefined();
    });
  });

  describe('Soft Delete', () => {
    test('should soft delete customer', () => {
      const customer = db.customerEnsure('待删除客户');
      const result = db.customerDelete(customer.id);
      
      expect(result.deleted_at).toBeDefined();
      expect(db.customerGet(customer.id)).toBeNull();
      expect(db.customerList().find(c => c.id === customer.id)).toBeUndefined();
    });

    test('should soft delete person', () => {
      const customer = db.customerEnsure('测试客户');
      const person = db.personEnsure(customer.id, '待删除联系人');
      
      const result = db.personDelete(person.id);
      expect(result.deleted_at).toBeDefined();
      expect(db.personList(customer.id).find(p => p.id === person.id)).toBeUndefined();
    });

    test('should soft delete event', () => {
      const customer = db.customerEnsure('测试客户');
      const event = db.eventAdd({ customerId: customer.id, content: '待删除事件' });
      
      const result = db.eventDelete(event.id);
      expect(result.deleted_at).toBeDefined();
      expect(db.eventList(customer.id).find(e => e.id === event.id)).toBeUndefined();
    });

    test('should cascade delete customer to persons and events', () => {
      const customer = db.customerEnsure('级联删除测试');
      const person = db.personEnsure(customer.id, '联系人');
      const event = db.eventAdd({ customerId: customer.id, personId: person.id, content: '事件' });
      
      db.customerDelete(customer.id);
      
      expect(db.personList(customer.id).find(p => p.id === person.id)).toBeUndefined();
      expect(db.eventList(customer.id).find(e => e.id === event.id)).toBeUndefined();
    });

    test('should restore soft-deleted customer', () => {
      const customer = db.customerEnsure('待恢复客户');
      db.customerDelete(customer.id);
      expect(db.customerGet(customer.id)).toBeNull();
      
      const result = db.customerRestore(customer.id);
      expect(result.restored).toBe(true);
      expect(db.customerGet(customer.id)).not.toBeNull();
    });

    test('should restore soft-deleted person', () => {
      const customer = db.customerEnsure('测试客户');
      const person = db.personEnsure(customer.id, '待恢复联系人');
      db.personDelete(person.id);
      expect(db.personList(customer.id).find(p => p.id === person.id)).toBeUndefined();
      
      const result = db.personRestore(person.id);
      expect(result.restored).toBe(true);
      expect(db.personList(customer.id).find(p => p.id === person.id)).toBeDefined();
    });

    test('should restore soft-deleted event', () => {
      const customer = db.customerEnsure('测试客户');
      const event = db.eventAdd({ customerId: customer.id, content: '待恢复事件' });
      db.eventDelete(event.id);
      expect(db.eventList(customer.id).find(e => e.id === event.id)).toBeUndefined();
      
      const result = db.eventRestore(event.id);
      expect(result.restored).toBe(true);
      expect(db.eventList(customer.id).find(e => e.id === event.id)).toBeDefined();
    });
  });

  describe('Search', () => {
    let customerId;

    beforeEach(() => {
      const customer = db.customerEnsure('搜索测试公司');
      customerId = customer.id;
      const person = db.personEnsure(customerId, '搜索联系人');
      
      db.eventAdd({ customerId, personId: person.id, channel: 'meeting', content: '讨论预算30万' });
      db.eventAdd({ customerId, channel: 'email', content: '发送报价邮件' });
      db.eventAdd({ customerId, channel: 'call', content: '跟进电话' });
    });

    test('should search by keyword in content', () => {
      const results = db.search({ keyword: '预算' });
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('预算');
    });

    test('should search by keyword in customer name', () => {
      const results = db.search({ keyword: '搜索测试' });
      expect(results.length).toBe(3);
    });

    test('should search by keyword in person name', () => {
      const results = db.search({ keyword: '搜索联系人' });
      expect(results.length).toBe(1);
    });

    test('should filter search by channel', () => {
      const results = db.search({ channel: 'email' });
      expect(results.length).toBe(1);
      expect(results[0].channel).toBe('email');
    });

    test('should filter search by customer', () => {
      const results = db.search({ customerId });
      expect(results.length).toBe(3);
    });

    test('should return empty for no matches', () => {
      const results = db.search({ keyword: '不存在的内容' });
      expect(results.length).toBe(0);
    });
  });

  describe('Import', () => {
    test('should import backup data', () => {
      const backupData = {
        customers: [
          { id: 'cust_old001', name: '导入客户A', created_at: '2024-01-01T00:00:00Z' },
          { id: 'cust_old002', name: '导入客户B', created_at: '2024-01-02T00:00:00Z' }
        ],
        persons: [
          { id: 'pers_old001', customer_id: 'cust_old001', name: '联系人1', phone: '13800000001' }
        ],
        events: [
          { id: 'evt_old001', customer_id: 'cust_old001', person_id: 'pers_old001', channel: 'meeting', content: '导入事件', occurred_at: '2024-06-01T10:00:00Z' }
        ]
      };

      const results = db.importBackup(backupData);
      expect(results.customers.imported).toBe(2);
      expect(results.persons.imported).toBe(1);
      expect(results.events.imported).toBe(1);
    });

    test('should not duplicate persons with same phone', () => {
      const customer = db.customerEnsure('手机去重客户');

      // First import
      db.importBackup({
        customers: [customer],
        persons: [{ customer_id: customer.id, name: '联系人A', phone: '13900001111' }],
        events: []
      });

      // Second import - same phone, should skip
      const results = db.importBackup({
        customers: [customer],
        persons: [{ customer_id: customer.id, name: '联系人B', phone: '13900001111' }],
        events: []
      });

      expect(results.persons.imported).toBe(0);
      expect(results.persons.skipped).toBe(1);
    });

    test('should not duplicate persons with same email', () => {
      const customer = db.customerEnsure('邮箱去重客户');

      // First import
      db.importBackup({
        customers: [customer],
        persons: [{ customer_id: customer.id, name: '联系人A', email: 'test@example.com' }],
        events: []
      });

      // Second import - same email, should skip
      const results = db.importBackup({
        customers: [customer],
        persons: [{ customer_id: customer.id, name: '联系人B', email: 'test@example.com' }],
        events: []
      });

      expect(results.persons.imported).toBe(0);
      expect(results.persons.skipped).toBe(1);
    });

    test('should allow different phones for same customer', () => {
      const customer = db.customerEnsure('不同手机客户');

      const results = db.importBackup({
        customers: [customer],
        persons: [
          { customer_id: customer.id, name: '联系人A', phone: '13900001111' },
          { customer_id: customer.id, name: '联系人B', phone: '13900002222' }
        ],
        events: []
      });

      expect(results.persons.imported).toBe(2);
    });

    test('should always create new events', () => {
      const backupData = {
        customers: [{ id: 'cust_001', name: '事件测试客户' }],
        persons: [],
        events: [
          { id: 'evt_001', customer_id: 'cust_001', channel: 'test', content: '事件1', occurred_at: '2024-01-01T00:00:00Z' }
        ]
      };

      // Import twice
      db.importBackup(backupData);
      const results = db.importBackup(backupData);

      expect(results.events.imported).toBe(1); // Second import still creates
    });

    test('should skip events with invalid customer_id', () => {
      const results = db.importBackup({
        customers: [],
        persons: [],
        events: [{ customer_id: 'cust_nonexist', content: '无效事件' }]
      });

      expect(results.events.imported).toBe(0);
    });
  });
});
