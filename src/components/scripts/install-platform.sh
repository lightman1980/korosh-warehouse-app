#!/bin/bash

# ================================================
# نصب خودکار نرم‌افزار - نسخه 2025
# Automatic Software Installer - Version 2025
# ================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PLATFORM=""
DATABASE_TYPE=""
INSTALL_DIR="/opt/software-installer"
LOG_FILE="$INSTALL_DIR/install.log"

# Functions
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

print_header() {
    clear
    log "${CYAN}============================================${NC}"
    log "${CYAN}    نصاب خودکار نرم‌افزار - نسخه 2025${NC}"
    log "${CYAN}    Automatic Software Installer - v2025${NC}"
    log "${CYAN}============================================${NC}"
    echo ""
}

check_root() {
    if [[ $EUID -eq 0 ]]; then
        log "${YELLOW}توجه: نصب به عنوان root انجام می‌شود${NC}"
        log "${YELLOW}Notice: Running as root${NC}"
    fi
}

detect_platform() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v systemctl >/dev/null 2>&1; then
            PLATFORM="linux-server"
        else
            PLATFORM="linux-desktop"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        PLATFORM="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        PLATFORM="windows"
    else
        PLATFORM="unknown"
    fi
}

install_dependencies() {
    log "${BLUE}📦 نصب وابستگی‌ها...${NC}"
    
    case "$PLATFORM" in
        "linux-server"|"linux-desktop")
            # Update package manager
            if command -v apt >/dev/null 2>&1; then
                apt update -y
                DEPS="curl wget git nodejs npm postgresql-client mysql-client redis-tools docker.io"
            elif command -v yum >/dev/null 2>&1; then
                yum update -y
                DEPS="curl wget git nodejs npm postgresql mysql redis docker"
            elif command -v dnf >/dev/null 2>&1; then
                dnf update -y
                DEPS="curl wget git nodejs npm postgresql mysql redis docker"
            fi
            
            for dep in $DEPS; do
                log "نصب $dep..."
                if command -v apt >/dev/null 2>&1; then
                    apt install -y $dep
                elif command -v yum >/dev/null 2>&1; then
                    yum install -y $dep
                elif command -v dnf >/dev/null 2>&1; then
                    dnf install -y $dep
                fi
            done
            ;;
            
        "macos")
            # Install Homebrew if not present
            if ! command -v brew >/dev/null 2>&1; then
                log "نصب Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            
            # Install dependencies
            brew install curl wget git node postgresql mysql redis docker
            ;;
            
        "windows")
            # Windows dependencies would be handled differently
            log "${YELLOW}⚠️  ویندوز: لطفاً Node.js و Docker Desktop را دستی نصب کنید${NC}"
            ;;
    esac
    
    log "${GREEN}✅ وابستگی‌ها نصب شدند${NC}"
}

setup_database() {
    log "${BLUE}🗄️  تنظیم پایگاه داده: $DATABASE_TYPE${NC}"
    
    case "$DATABASE_TYPE" in
        "postgresql")
            if command -v psql >/dev/null 2>&1; then
                log "تنظیم PostgreSQL..."
                # Create database and user
                sudo -u postgres psql -c "CREATE DATABASE app_database;" 2>/dev/null || true
                sudo -u postgres psql -c "CREATE USER app_user WITH PASSWORD 'secure_password';" 2>/dev/null || true
                sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE app_database TO app_user;" 2>/dev/null || true
                log "${GREEN}✅ PostgreSQL تنظیم شد${NC}"
            fi
            ;;
            
        "mysql")
            if command -v mysql >/dev/null 2>&1; then
                log "تنظیم MySQL..."
                mysql -e "CREATE DATABASE IF NOT EXISTS app_database;" 2>/dev/null || true
                mysql -e "CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'secure_password';" 2>/dev/null || true
                mysql -e "GRANT ALL PRIVILEGES ON app_database.* TO 'app_user'@'localhost';" 2>/dev/null || true
                log "${GREEN}✅ MySQL تنظیم شد${NC}"
            fi
            ;;
            
        "mongodb")
            if command -v mongod >/dev/null 2>&1; then
                log "تنظیم MongoDB..."
                # Start MongoDB service
                if command -v systemctl >/dev/null 2>&1; then
                    systemctl start mongod
                    systemctl enable mongod
                fi
                log "${GREEN}✅ MongoDB تنظیم شد${NC}"
            fi
            ;;
            
        "sqlite")
            log "${GREEN}✅ SQLite نیازی به تنظیم خاص ندارد${NC}"
            ;;
    esac
}

install_application() {
    log "${BLUE}🚀 نصب اپلیکیشن...${NC}"
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone or create application files
    log "دانلود فایل‌های اپلیکیشن..."
    
    # Create a simple Node.js application structure
    cat > package.json << 'EOF'
{
  "name": "software-installer-app",
  "version": "1.0.0",
  "description": "نرم‌افزار نصب شده خودکار",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "pg": "^8.8.0",
    "mysql2": "^3.0.0",
    "mongodb": "^4.12.0",
    "sqlite3": "^5.1.0",
    "redis": "^4.5.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
EOF

    # Install Node.js dependencies
    npm install
    
    # Create server.js
    cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Database connection
let db = null;
const dbType = process.env.DB_TYPE || 'sqlite';

switch(dbType) {
    case 'postgresql':
        const { Client } = require('pg');
        db = new Client({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'app_database',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
        });
        break;
    case 'mysql':
        const mysql = require('mysql2/promise');
        db = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            database: process.env.DB_NAME || 'app_database',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });
        break;
    case 'mongodb':
        const { MongoClient } = require('mongodb');
        db = new MongoClient(process.env.DB_URL || 'mongodb://localhost:27017');
        break;
    case 'sqlite':
        const sqlite3 = require('sqlite3').verbose();
        db = new sqlite3.Database('./app.db');
        break;
}

app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        switch(dbType) {
            case 'postgresql':
            case 'mysql':
                await db.connect();
                break;
            case 'mongodb':
                await db.connect();
                break;
            case 'sqlite':
                // SQLite doesn't need connection
                break;
        }
        
        res.json({
            status: 'ok',
            platform: process.env.PLATFORM || 'unknown',
            database: dbType,
            timestamp: new Date().toISOString(),
            message: 'اپلیکیشن با موفقیت اجرا می‌شود'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'Software Installer App',
        version: '1.0.0',
        platform: process.env.PLATFORM || 'unknown',
        database: dbType,
        status: 'running',
        message: 'اپلیکیشن با موفقیت نصب و اجرا شده است'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Platform: ${process.env.PLATFORM || 'unknown'}`);
    console.log(`🗄️ Database: ${dbType}`);
});
EOF

    # Create environment file
    cat > .env << EOF
PLATFORM=$PLATFORM
DB_TYPE=$DATABASE_TYPE
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app_database
DB_USER=postgres
DB_PASSWORD=
PORT=3000
EOF

    log "${GREEN}✅ اپلیکیشن نصب شد${NC}"
}

create_systemd_service() {
    if [[ "$PLATFORM" == "linux-server" ]] && command -v systemctl >/dev/null 2>&1; then
        log "${BLUE}🔧 ایجاد سرویس systemd...${NC}"
        
        cat > /etc/systemd/system/software-installer.service << EOF
[Unit]
Description=Software Installer Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

        systemctl daemon-reload
        systemctl enable software-installer
        log "${GREEN}✅ سرویس systemd ایجاد شد${NC}"
    fi
}

setup_ssl() {
    log "${BLUE}🔒 تنظیم SSL/HTTPS...${NC}"
    
    # Generate self-signed certificate for development
    if command -v openssl >/dev/null 2>&1; then
        openssl req -x509 -newkey rsa:4096 -keyout "$INSTALL_DIR/key.pem" -out "$INSTALL_DIR/cert.pem" -days 365 -nodes -subj "/C=IR/ST=Tehran/L=Tehran/O=Software/CN=localhost"
        log "${GREEN}✅ گواهی SSL تولید شد${NC}"
    fi
}

start_application() {
    log "${BLUE}🚀 شروع اپلیکیشن...${NC}"
    
    case "$PLATFORM" in
        "linux-server")
            if command -v systemctl >/dev/null 2>&1; then
                systemctl start software-installer
                systemctl status software-installer
            else
                cd "$INSTALL_DIR" && npm start &
            fi
            ;;
        *)
            cd "$INSTALL_DIR" && npm start &
            ;;
    esac
    
    # Wait a moment for the service to start
    sleep 5
    
    # Test if application is running
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        log "${GREEN}✅ اپلیکیشن با موفقیت شروع شد!${NC}"
        log "${CYAN}🌐 آدرس اپلیکیشن: http://localhost:3000${NC}"
    else
        log "${RED}❌ خطا در شروع اپلیکیشن${NC}"
    fi
}

print_completion_message() {
    log "${CYAN}============================================${NC}"
    log "${GREEN}🎉 نصب با موفقیت تکمیل شد!${NC}"
    log "${CYAN}============================================${NC}"
    log ""
    log "${BLUE}📋 اطلاعات نصب:${NC}"
    log "   پلتفرم: $PLATFORM"
    log "   پایگاه داده: $DATABASE_TYPE"
    log "   آدرس: http://localhost:3000"
    log "   دایرکتوری: $INSTALL_DIR"
    log ""
    log "${YELLOW}💡 دستورات مفید:${NC}"
    log "   بررسی وضعیت: curl http://localhost:3000/api/health"
    log "   ریستارت سرویس (Linux): sudo systemctl restart software-installer"
    log "   مشاهده لاگ: tail -f $LOG_FILE"
    log ""
    log "${GREEN}✅ نرم‌افزار آماده استفاده است!${NC}"
}

# Main execution
main() {
    print_header
    check_root
    detect_platform
    
    log "${BLUE}🔍 تشخیص پلتفرم: $PLATFORM${NC}"
    
    # Get database type from user if not provided
    if [[ -z "$DATABASE_TYPE" ]]; then
        log "${YELLOW}انتخاب نوع پایگاه داده:${NC}"
        log "1. PostgreSQL"
        log "2. MySQL/MariaDB"
        log "3. MongoDB"
        log "4. SQLite"
        read -p "لطفاً عدد مورد نظر را وارد کنید (1-4): " db_choice
        
        case $db_choice in
            1) DATABASE_TYPE="postgresql" ;;
            2) DATABASE_TYPE="mysql" ;;
            3) DATABASE_TYPE="mongodb" ;;
            4) DATABASE_TYPE="sqlite" ;;
            *) DATABASE_TYPE="postgresql" ;;
        esac
    fi
    
    log "${BLUE}🔧 شروع فرآیند نصب...${NC}"
    
    install_dependencies
    setup_database
    install_application
    create_systemd_service
    setup_ssl
    start_application
    print_completion_message
}

# Run main function
main "$@"