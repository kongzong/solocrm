const path = require('path');
const fs = require('fs');
const os = require('os');
const Config = require('../config');

describe('Config', () => {
  let configPath;
  let config;

  beforeEach(() => {
    configPath = path.join(os.tmpdir(), `test-config-${Date.now()}.json`);
    config = new Config(configPath);
  });

  afterEach(() => {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  describe('Profile Management', () => {
    test('should add a profile', () => {
      const result = config.addProfile('work', '~/.solocrm/work.db');
      expect(result.name).toBe('work');
      expect(result.path).toContain('.solocrm/work.db');
    });

    test('should add profile with Chinese name', () => {
      const result = config.addProfile('我的人情来往', '~/social.db');
      expect(result.name).toBe('我的人情来往');
    });

    test('should list profiles', () => {
      config.addProfile('work', '~/.solocrm/work.db');
      config.addProfile('personal', '~/personal.db');
      
      const profiles = config.listProfiles();
      expect(profiles.length).toBe(2);
      expect(profiles.map(p => p.name)).toContain('work');
      expect(profiles.map(p => p.name)).toContain('personal');
    });

    test('should remove a profile', () => {
      config.addProfile('work', '~/.solocrm/work.db');
      const success = config.removeProfile('work');
      expect(success).toBe(true);
      expect(config.listProfiles().length).toBe(0);
    });

    test('should return false when removing non-existent profile', () => {
      const success = config.removeProfile('nonexistent');
      expect(success).toBe(false);
    });

    test('should get a profile', () => {
      config.addProfile('work', '~/.solocrm/work.db');
      const profile = config.getProfile('work');
      expect(profile).toContain('work.db');
    });

    test('should return null for non-existent profile', () => {
      const profile = config.getProfile('nonexistent');
      expect(profile).toBeNull();
    });
  });

  describe('DB Path Resolution', () => {
    test('should get default db path when no profile specified', () => {
      const dbPath = config.getDbPath(null);
      expect(dbPath).toContain('data.db');
    });

    test('should get profile db path', () => {
      config.addProfile('work', '~/.solocrm/work.db');
      const dbPath = config.getDbPath('work');
      expect(dbPath).toContain('work.db');
    });

    test('should throw for non-existent profile', () => {
      expect(() => config.getDbPath('nonexistent')).toThrow('Profile not found');
    });

    test('should expand ~ in path', () => {
      config.addProfile('test', '~/test.db');
      const dbPath = config.getDbPath('test');
      expect(dbPath).not.toContain('~');
      expect(dbPath).toContain('test.db');
    });
  });

  describe('Persistence', () => {
    test('should save and load profiles', () => {
      config.addProfile('work', '~/.solocrm/work.db');
      
      // Create new config instance to test loading
      const config2 = new Config(configPath);
      const profiles = config2.listProfiles();
      expect(profiles.length).toBe(1);
      expect(profiles[0].name).toBe('work');
    });
  });
});
