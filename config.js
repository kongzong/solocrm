const path = require('path');
const fs = require('fs');
const os = require('os');

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.solocrm');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');
const DEFAULT_DB_PATH = path.join(DEFAULT_CONFIG_DIR, 'data.db');

class Config {
  constructor(configPath = DEFAULT_CONFIG_PATH) {
    this.configPath = configPath;
    this.config = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      // Ignore errors, return default
    }
    return { profiles: {} };
  }

  _save() {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  // Profile management

  addProfile(name, dbPath) {
    // Resolve ~ to home directory
    const resolvedPath = dbPath.replace(/^~/, os.homedir());
    this.config.profiles[name] = resolvedPath;
    this._save();
    return { name, path: resolvedPath };
  }

  removeProfile(name) {
    if (this.config.profiles[name]) {
      delete this.config.profiles[name];
      this._save();
      return true;
    }
    return false;
  }

  listProfiles() {
    return Object.entries(this.config.profiles).map(([name, dbPath]) => ({
      name,
      path: dbPath
    }));
  }

  getProfile(name) {
    return this.config.profiles[name] || null;
  }

  // Get DB path for a profile

  getDbPath(profileName) {
    if (profileName) {
      const dbPath = this.config.profiles[profileName];
      if (!dbPath) {
        throw new Error(`Profile not found: ${profileName}`);
      }
      return dbPath.replace(/^~/, os.homedir());
    }
    return DEFAULT_DB_PATH;
  }

  // Get config directory

  getConfigDir() {
    return DEFAULT_CONFIG_DIR;
  }
}

module.exports = Config;
