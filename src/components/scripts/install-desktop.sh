#!/bin/bash

# ================================================
# نصب خودکار دسکتاپ - Electron
# Desktop Auto Installer - Electron 2025
# ================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="MyDesktopApp"
INSTALL_DIR="./desktop-app"
APP_ID="com.company.desktopapp"
COMPANY_NAME="My Company"

# Detect current OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v snap >/dev/null 2>&1; then
            OS_TYPE="linux"
        else
            OS_TYPE="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS_TYPE="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS_TYPE="windows"
    else
        OS_TYPE="unknown"
    fi
}

log() {
    echo -e "$1"
}

print_header() {
    clear
    log "${CYAN}============================================${NC}"
    log "${CYAN}    نصاب خودکار دسکتاپ - Electron${NC}"
    log "${CYAN}    Desktop Auto Installer - Electron${NC}"
    log "${CYAN}============================================${NC}"
    echo ""
}

check_requirements() {
    log "${BLUE}🔍 بررسی پیش‌نیازها...${NC}"
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        log "${RED}❌ Node.js نصب نشده است${NC}"
        log "${YELLOW}نصب Node.js...${NC}"
        if [[ "$OS_TYPE" == "linux" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [[ "$OS_TYPE" == "macos" ]]; then
            if ! command -v brew >/dev/null 2>&1; then
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node
        fi
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log "${RED}❌ npm نصب نشده است${NC}"
        exit 1
    fi
    
    # Check Git
    if ! command -v git >/dev/null 2>&1; then
        log "${YELLOW}نصب Git...${NC}"
        if [[ "$OS_TYPE" == "linux" ]]; then
            sudo apt-get install -y git
        elif [[ "$OS_TYPE" == "macos" ]]; then
            xcode-select --install
        fi
    fi
    
    log "${GREEN}✅ پیش‌نیازها آماده هستند${NC}"
}

install_electron_cli() {
    log "${BLUE}📦 نصب Electron CLI...${NC}"
    
    # Install Electron CLI globally
    npm install -g @electron-forge/cli
    npm install -g electron
    
    log "${GREEN}✅ Electron CLI نصب شد${NC}"
}

create_electron_project() {
    log "${BLUE}🚀 ایجاد پروژه Electron...${NC}"
    
    # Create project directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Initialize Electron project
    npx @electron-forge/cli@latest init "$PROJECT_NAME" --template=react-typescript
    
    cd "$PROJECT_NAME"
    
    log "${GREEN}✅ پروژه Electron ایجاد شد${NC}"
}

setup_database_integration() {
    log "${BLUE}🗄️  تنظیم پایگاه داده دسکتاپ...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Install database packages
    npm install better-sqlite3
    npm install sql.js
    npm install knex
    npm install sqlite3
    npm install idb
    npm install @types/sqlite3
    npm install node-gyp
    npm install bcryptjs
    npm install jsonwebtoken
    npm install electron-store
    
    # Development dependencies
    npm install --save-dev @types/better-sqlite3
    npm install --save-dev electron-rebuild
    
    log "${GREEN}✅ پایگاه داده دسکتاپ تنظیم شد${NC}"
}

create_database_manager() {
    log "${BLUE}📊 ایجاد مدیر پایگاه داده...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Create database manager
    mkdir -p src/database
    cat > src/database/DatabaseManager.ts << 'EOF'
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseConfig {
  type: 'sqlite' | 'sqljs';
  filename: string;
}

class DatabaseManager {
  private db: Database | null = null;
  private sqljsDb: any = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.type === 'sqlite') {
        this.initializeSQLite();
      } else {
        await this.initializeSQLjs();
      }
      this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private initializeSQLite(): void {
    const dbPath = path.join(app.getPath('userData'), this.config.filename);
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
  }

  private async initializeSQLjs(): Promise<void> {
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        return `https://sql.js.org/dist/${file}`;
      }
    });

    const dbPath = path.join(app.getPath('userData'), this.config.filename);
    
    if (fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      this.sqljsDb = new SQL.Database(filebuffer);
    } else {
      this.sqljsDb = new SQL.Database();
    }
  }

  private createTables(): void {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    if (this.db) {
      this.db.exec(createUsersTable);
      this.db.exec(createSettingsTable);
    } else if (this.sqljsDb) {
      this.sqljsDb.exec(createUsersTable);
      this.sqljsDb.exec(createSettingsTable);
    }
  }

  async saveUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const query = `
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `;
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      const result = stmt.run([user.name, user.email, user.password || '']);
      stmt.free();
      
      return this.getUserById(result.lastInsertRowid as number);
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([user.name, user.email, user.password || '']);
      stmt.free();
      
      const lastId = this.sqljsDb.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
      return this.getUserById(lastId);
    }
    
    throw new Error('Database not initialized');
  }

  getUserById(id: number): User {
    const query = "SELECT * FROM users WHERE id = ?";
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      const result = stmt.get(id) as User;
      stmt.free();
      return result;
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([id]);
      const result = stmt.getAsObject();
      stmt.free();
      return result as User;
    }
    
    throw new Error('Database not initialized');
  }

  getAllUsers(): User[] {
    const query = "SELECT * FROM users ORDER BY created_at DESC";
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      const results = stmt.all() as User[];
      stmt.free();
      return results;
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.step();
      const results = stmt.getAllAsObject() as User[];
      stmt.free();
      return results;
    }
    
    throw new Error('Database not initialized');
  }

  updateUser(id: number, updates: Partial<User>): void {
    const query = `
      UPDATE users 
      SET name = ?, email = ?, password = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      stmt.run([updates.name, updates.email, updates.password || '', id]);
      stmt.free();
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([updates.name, updates.email, updates.password || '', id]);
      stmt.free();
    }
  }

  deleteUser(id: number): void {
    const query = "DELETE FROM users WHERE id = ?";
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      stmt.run([id]);
      stmt.free();
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([id]);
      stmt.free();
    }
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      stmt.run([key, value]);
      stmt.free();
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([key, value]);
      stmt.free();
    }
  }

  getSetting(key: string): string | null {
    const query = "SELECT value FROM settings WHERE key = ?";
    
    if (this.db) {
      const stmt = this.db.prepare(query);
      const result = stmt.get(key) as { value: string };
      stmt.free();
      return result?.value || null;
    } else if (this.sqljsDb) {
      const stmt = this.sqljsDb.prepare(query);
      stmt.run([key]);
      const result = stmt.getAsObject() as { value: string };
      stmt.free();
      return result?.value || null;
    }
    
    return null;
  }

  async saveDatabase(): Promise<void> {
    if (this.config.type === 'sqljs' && this.sqljsDb) {
      const data = this.sqljsDb.export();
      const dbPath = path.join(app.getPath('userData'), this.config.filename);
      fs.writeFileSync(dbPath, Buffer.from(data));
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
    if (this.sqljsDb) {
      this.saveDatabase();
    }
  }
}

export default DatabaseManager;
EOF

    # Create main renderer process component
    cat > src/renderer/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import './App.css';

interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  created_at?: string;
  updated_at?: string;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [databaseStatus, setDatabaseStatus] = useState<string>('در حال اتصال...');

  useEffect(() => {
    loadUsers();
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const status = await ipcRenderer.invoke('check-database-status');
      setDatabaseStatus(status);
    } catch (error) {
      setDatabaseStatus('خطا در اتصال');
    }
  };

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const userList = await ipcRenderer.invoke('get-all-users');
      setUsers(userList);
    } catch (error) {
      console.error('خطا در بارگذاری کاربران:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email) {
      alert('لطفاً نام و ایمیل را وارد کنید');
      return;
    }

    try {
      await ipcRenderer.invoke('save-user', newUser);
      setNewUser({ name: '', email: '', password: '' });
      setShowAddForm(false);
      loadUsers();
    } catch (error) {
      console.error('خطا در ذخیره کاربر:', error);
      alert('خطا در ذخیره کاربر');
    }
  };

  const deleteUser = async (id: number) => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید این کاربر را حذف کنید؟')) {
      try {
        await ipcRenderer.invoke('delete-user', id);
        loadUsers();
      } catch (error) {
        console.error('خطا در حذف کاربر:', error);
        alert('خطا در حذف کاربر');
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🏠 اپلیکیشن دسکتاپ</h1>
        <div className="status-bar">
          <span className="database-status">
            🗄️ وضعیت پایگاه داده: {databaseStatus}
          </span>
          <span className="user-count">
            👥 تعداد کاربران: {users.length}
          </span>
        </div>
      </header>

      <main className="main-content">
        <div className="actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '❌ لغو' : '➕ افزودن کاربر'}
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={loadUsers}
            disabled={isLoading}
          >
            {isLoading ? '🔄 در حال بارگذاری...' : '🔄 بروزرسانی'}
          </button>
        </div>

        {showAddForm && (
          <div className="add-user-form">
            <h3>افزودن کاربر جدید</h3>
            <input
              type="text"
              placeholder="نام کاربر"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            />
            <input
              type="email"
              placeholder="ایمیل"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            />
            <input
              type="password"
              placeholder="رمز عبور (اختیاری)"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            />
            <button className="btn btn-success" onClick={addUser}>
              💾 ذخیره
            </button>
          </div>
        )}

        <div className="users-list">
          <h3>لیست کاربران</h3>
          {isLoading ? (
            <div className="loading">در حال بارگذاری...</div>
          ) : users.length === 0 ? (
            <div className="no-users">هیچ کاربری وجود ندارد</div>
          ) : (
            <div className="user-grid">
              {users.map((user) => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                    {user.created_at && (
                      <small>تاریخ ایجاد: {new Date(user.created_at).toLocaleDateString('fa-IR')}</small>
                    )}
                  </div>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => user.id && deleteUser(user.id)}
                  >
                    🗑️ حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
EOF

    # Create CSS file
    cat > src/renderer/App.css << 'EOF'
.App {
  text-align: center;
  direction: rtl;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: white;
}

.App-header {
  background: rgba(0, 0, 0, 0.2);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.App-header h1 {
  margin: 0;
  font-size: 2rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.status-bar {
  display: flex;
  gap: 20px;
  align-items: center;
  font-size: 0.9rem;
}

.database-status, .user-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
}

.btn-secondary {
  background: linear-gradient(45deg, #2196F3, #1976D2);
  color: white;
}

.btn-success {
  background: linear-gradient(45deg, #00BCD4, #0097A7);
  color: white;
}

.btn-danger {
  background: linear-gradient(45deg, #F44336, #D32F2F);
  color: white;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.8rem;
}

.add-user-form {
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.add-user-form h3 {
  margin-top: 0;
  color: white;
  margin-bottom: 20px;
}

.add-user-form input {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 1rem;
}

.add-user-form input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.users-list {
  background: rgba(255, 255, 255, 0.1);
  padding: 30px;
  border-radius: 15px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.users-list h3 {
  margin-top: 0;
  color: white;
  margin-bottom: 20px;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.user-card {
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #333;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.user-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.user-info h4 {
  margin: 0 0 8px 0;
  color: #1976D2;
}

.user-info p {
  margin: 0 0 8px 0;
  color: #666;
}

.user-info small {
  color: #999;
  font-size: 0.8rem;
}

.loading, .no-users {
  text-align: center;
  padding: 40px;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
}

@media (max-width: 768px) {
  .App-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .status-bar {
    flex-direction: column;
    gap: 10px;
  }
  
  .user-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
}
EOF

    log "${GREEN}✅ مدیر پایگاه داده و رابط کاربری ایجاد شد${NC}"
}

update_main_process() {
    log "${BLUE}🔧 بروزرسانی Main Process...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Update main.js to include database functionality
    cat > src/main.ts << 'EOF'
import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import DatabaseManager from './database/DatabaseManager';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbManager: DatabaseManager;

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    },
    title: 'My Desktop App',
    icon: join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Initialize database
async function initializeDatabase(): Promise<void> {
  try {
    dbManager = new DatabaseManager({
      type: 'sqlite',
      filename: 'app.db'
    });
    
    await dbManager.initialize();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// IPC Handlers
ipcMain.handle('check-database-status', async () => {
  try {
    return dbManager ? 'متصل' : 'قطع اتصال';
  } catch (error) {
    return 'خطا';
  }
});

ipcMain.handle('get-all-users', async () => {
  try {
    const users = dbManager.getAllUsers();
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
});

ipcMain.handle('save-user', async (event, userData) => {
  try {
    const user = await dbManager.saveUser(userData);
    return user;
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
});

ipcMain.handle('delete-user', async (event, userId) => {
  try {
    dbManager.deleteUser(userId);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
});

// App event handlers
app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) {
      dbManager.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (dbManager) {
    dbManager.close();
  }
});
EOF

    log "${GREEN}✅ Main Process بروزرسانی شد${NC}"
}

build_desktop_app() {
    log "${BLUE}🔨 ساخت اپلیکیشن دسکتاپ...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Make package script
    npm run package
    
    log "${GREEN}✅ اپلیکیشن دسکتاپ ساخته شد${NC}"
    
    case "$OS_TYPE" in
        "linux")
            log "${CYAN}🐧 فایل‌های لینوکس در: out/ folder${NC}"
            ;;
        "macos")
            log "${CYAN}🍎 فایل macOS در: out/ folder${NC}"
            ;;
        "windows")
            log "${CYAN}🪟 فایل ویندوز در: out/ folder${NC}"
            ;;
    esac
}

create_installer() {
    log "${BLUE}📦 ایجاد فایل نصب...${NC}"
    
    cd "$PROJECT_NAME"
    
    # Create installer using electron-forge
    npm run make
    
    log "${GREEN}✅ فایل نصب ایجاد شد${NC}"
    
    # Find the installer file
    case "$OS_TYPE" in
        "linux")
            INSTALLER_FILE=$(find out -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" | head -1)
            ;;
        "macos")
            INSTALLER_FILE=$(find out -name "*.dmg" -o -name "*.zip" | head -1)
            ;;
        "windows")
            INSTALLER_FILE=$(find out -name "*.exe" -o -name "*.msi" | head -1)
            ;;
    esac
    
    if [[ -n "$INSTALLER_FILE" ]]; then
        log "${CYAN}📁 فایل نصب: $INSTALLER_FILE${NC}"
    fi
}

print_completion_desktop() {
    log "${CYAN}============================================${NC}"
    log "${GREEN}🎉 نصب دسکتاپ تکمیل شد!${NC}"
    log "${CYAN}============================================${NC}"
    log ""
    log "${BLUE}💻 اطلاعات پروژه:${NC}"
    log "   نام پروژه: $PROJECT_NAME"
    log "   پلتفرم: Electron"
    log "   سیستم عامل: $OS_TYPE"
    log "   مسیر: $INSTALL_DIR/$PROJECT_NAME"
    log ""
    log "${YELLOW}💡 دستورات مفید:${NC}"
    log "   اجرای توسعه: cd $INSTALL_DIR/$PROJECT_NAME && npm start"
    log "   ساخت بسته: cd $INSTALL_DIR/$PROJECT_NAME && npm run package"
    log "   ایجاد نصب: cd $INSTALL_DIR/$PROJECT_NAME && npm run make"
    log ""
    log "${GREEN}✅ اپلیکیشن دسکتاپ آماده است!${NC}"
}

# Main execution
main() {
    print_header
    detect_os
    
    log "${BLUE}🔍 تشخیص سیستم عامل: $OS_TYPE${NC}"
    
    check_requirements
    install_electron_cli
    create_electron_project
    setup_database_integration
    create_database_manager
    update_main_process
    build_desktop_app
    create_installer
    print_completion_desktop
}

# Run main function
main "$@"