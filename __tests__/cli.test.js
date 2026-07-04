const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const SOLO_PATH = path.join(__dirname, '..', 'solo.js');

// Use a temporary database for tests
const TEST_DB_DIR = path.join(os.tmpdir(), 'solocrm-test');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'data.db');

// Helper to run CLI commands
function run(command, options = {}) {
  const env = {
    ...process.env,
    SOLOCRM_DB: TEST_DB_PATH
  };
  
  try {
    const result = execSync(`node "${SOLO_PATH}" ${command}`, {
      encoding: 'utf-8',
      env,
      ...options
    });
    return { stdout: result.trim(), exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : '',
      exitCode: error.status
    };
  }
}

describe('CLI', () => {
  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DB_DIR)) {
      fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test database
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    }
  });

  describe('Version', () => {
    test('should show version', () => {
      const { stdout, exitCode } = run('--version');
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Customer', () => {
    test('should create a customer', () => {
      const { stdout, exitCode } = run('customer ensure --name "腾讯测试"');
      expect(exitCode).toBe(0);
      
      const customer = JSON.parse(stdout);
      expect(customer.id).toMatch(/^cust_/);
      expect(customer.name).toBe('腾讯测试');
    });

    test('should return existing customer on ensure', () => {
      const result1 = run('customer ensure --name "腾讯幂等测试"');
      const result2 = run('customer ensure --name "腾讯幂等测试"');
      
      const customer1 = JSON.parse(result1.stdout);
      const customer2 = JSON.parse(result2.stdout);
      
      expect(customer1.id).toBe(customer2.id);
    });

    test('should get customer by id', () => {
      const createResult = run('customer ensure --name "腾讯获取测试"');
      const customer = JSON.parse(createResult.stdout);
      
      const { stdout, exitCode } = run(`customer get ${customer.id}`);
      expect(exitCode).toBe(0);
      
      const retrieved = JSON.parse(stdout);
      expect(retrieved.name).toBe('腾讯获取测试');
    });

    test('should list customers', () => {
      run('customer ensure --name "腾讯列表测试1"');
      run('customer ensure --name "腾讯列表测试2"');
      
      const { stdout, exitCode } = run('customer list');
      expect(exitCode).toBe(0);
      
      const customers = JSON.parse(stdout);
      expect(Array.isArray(customers)).toBe(true);
      expect(customers.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Person', () => {
    let customerId;

    beforeAll(() => {
      const result = run('customer ensure --name "腾讯人员测试"');
      const customer = JSON.parse(result.stdout);
      customerId = customer.id;
    });

    test('should create a person', () => {
      const { stdout, exitCode } = run(`person ensure --customer ${customerId} --name "张三测试" --title "产品总监"`);
      expect(exitCode).toBe(0);
      
      const person = JSON.parse(stdout);
      expect(person.id).toMatch(/^pers_/);
      expect(person.name).toBe('张三测试');
      expect(person.title).toBe('产品总监');
    });

    test('should list persons for a customer', () => {
      const { stdout, exitCode } = run(`person list --customer ${customerId}`);
      expect(exitCode).toBe(0);
      
      const persons = JSON.parse(stdout);
      expect(Array.isArray(persons)).toBe(true);
      expect(persons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event', () => {
    let customerId;
    let personId;

    beforeAll(() => {
      const customerResult = run('customer ensure --name "腾讯事件测试"');
      const customer = JSON.parse(customerResult.stdout);
      customerId = customer.id;
      
      const personResult = run(`person ensure --customer ${customerId} --name "李四测试"`);
      const person = JSON.parse(personResult.stdout);
      personId = person.id;
    });

    test('should add an event', () => {
      const { stdout, exitCode } = run(`event add --customer ${customerId} --person ${personId} --channel meeting --event-action note --content "讨论预算" --amount 50000`);
      expect(exitCode).toBe(0);
      
      const event = JSON.parse(stdout);
      expect(event.id).toMatch(/^evt_/);
      expect(event.channel).toBe('meeting');
      expect(event.amount).toBe(50000);
    });

    test('should list events', () => {
      const { stdout, exitCode } = run(`event list --customer ${customerId}`);
      expect(exitCode).toBe(0);
      
      const events = JSON.parse(stdout);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Timeline', () => {
    let customerId;

    beforeAll(() => {
      const result = run('customer ensure --name "腾讯时间线测试"');
      const customer = JSON.parse(result.stdout);
      customerId = customer.id;
      
      run(`event add --customer ${customerId} --channel meeting --content "时间线测试事件"`);
    });

    test('should get timeline', () => {
      const { stdout, exitCode } = run(`timeline get ${customerId}`);
      expect(exitCode).toBe(0);
      
      const entries = JSON.parse(stdout);
      expect(Array.isArray(entries)).toBe(true);
    });
  });

  describe('Export', () => {
    let customerId;

    beforeAll(() => {
      const result = run('customer ensure --name "腾讯导出测试"');
      const customer = JSON.parse(result.stdout);
      customerId = customer.id;
    });

    test('should export customer as json', () => {
      const { stdout, exitCode } = run(`export customer --id ${customerId} --format json`);
      expect(exitCode).toBe(0);
      
      const customer = JSON.parse(stdout);
      expect(customer.name).toBe('腾讯导出测试');
    });

    test('should export customer as markdown', () => {
      const { stdout, exitCode } = run(`export customer --id ${customerId} --format md`);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('# 腾讯导出测试');
      expect(stdout).toContain('**ID**');
    });

    test('should export timeline as markdown', () => {
      const { stdout, exitCode } = run(`export timeline --customer ${customerId} --format md`);
      expect(exitCode).toBe(0);
      // May be "No events found." or actual timeline
      expect(typeof stdout).toBe('string');
    });

    test('should export events as ndjson', () => {
      const { stdout, exitCode } = run(`export events --customer ${customerId} --format ndjson`);
      expect(exitCode).toBe(0);
      // NDJSON output may be empty or contain JSON lines
      if (stdout) {
        const lines = stdout.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            expect(() => JSON.parse(line)).not.toThrow();
          }
        });
      }
    });

    test('should export events with range filter', () => {
      const { stdout, exitCode } = run('export events --range 30d --format json');
      expect(exitCode).toBe(0);
      const events = JSON.parse(stdout);
      expect(Array.isArray(events)).toBe(true);
    });

    test('should export customers list', () => {
      const { stdout, exitCode } = run('export customers --format json');
      expect(exitCode).toBe(0);
      const customers = JSON.parse(stdout);
      expect(Array.isArray(customers)).toBe(true);
    });

    test('should export customers as markdown', () => {
      const { stdout, exitCode } = run('export customers --format md');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('# All Customers');
    });

    test('should export persons list', () => {
      const { stdout, exitCode } = run('export persons --format json');
      expect(exitCode).toBe(0);
      const persons = JSON.parse(stdout);
      expect(Array.isArray(persons)).toBe(true);
    });

    test('should export persons as markdown', () => {
      const { stdout, exitCode } = run('export persons --format md');
      expect(exitCode).toBe(0);
      expect(stdout).toContain('# Contacts');
    });

    test('should export persons filtered by customer', () => {
      const { stdout, exitCode } = run(`export persons --customer ${customerId} --format json`);
      expect(exitCode).toBe(0);
      const persons = JSON.parse(stdout);
      expect(Array.isArray(persons)).toBe(true);
    });

    test('should export customers as csv', () => {
      const { stdout, exitCode } = run('export customers --format csv');
      expect(exitCode).toBe(0);
      const lines = stdout.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      // First line should be header
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });

    test('should export persons as csv', () => {
      const { stdout, exitCode } = run('export persons --format csv');
      expect(exitCode).toBe(0);
      const lines = stdout.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('name');
    });

    test('should export events as csv', () => {
      const { stdout, exitCode } = run('export events --format csv');
      expect(exitCode).toBe(0);
      const lines = stdout.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('content');
    });

    test('should export backup', () => {
      const { stdout, exitCode } = run('export backup --format json');
      expect(exitCode).toBe(0);
      const backup = JSON.parse(stdout);
      expect(backup).toHaveProperty('customers');
      expect(backup).toHaveProperty('persons');
      expect(backup).toHaveProperty('events');
      expect(backup).toHaveProperty('exported_at');
    });

    test('should export backup as ndjson', () => {
      const { stdout, exitCode } = run('export backup --format ndjson');
      expect(exitCode).toBe(0);
      if (stdout) {
        const lines = stdout.split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            const obj = JSON.parse(line);
            expect(obj).toHaveProperty('_type');
          }
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should return error for non-existent customer', () => {
      const { exitCode } = run('customer get cust_nonexistent');
      expect(exitCode).toBe(1);
    });

    test('should return error for missing required options', () => {
      const { exitCode } = run('customer ensure');
      expect(exitCode).toBe(1);
    });
  });
});
