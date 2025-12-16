#!/bin/bash

# WhatsApp System Management Script
# اسکریپت مدیریت سیستم واتس‌اپ

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
PROJECT_NAME="whatsapp-notification-system"
API_PORT=3001
DB_PORT=27017
REDIS_PORT=6379

# Print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo "========================================"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker نصب نشده است. لطفاً Docker را نصب کنید."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose نصب نشده است. لطفاً Docker Compose را نصب کنید."
        exit 1
    fi
}

# Check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning "فایل .env یافت نشد. در حال کپی از .env.example..."
        cp .env.example .env
        print_warning "لطفاً فایل .env را ویرایش کرده و تنظیمات خود را وارد کنید."
        read -p "آیا می‌خواهید ادامه دهید؟ (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Create necessary directories
create_directories() {
    print_status "ایجاد دایرکتوری‌های مورد نیاز..."
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p nginx/ssl
    mkdir -p monitoring/grafana/{dashboards,datasources}
    mkdir -p monitoring/logstash/config
    
    # Set permissions
    chmod 755 logs uploads
}

# Install dependencies
install_dependencies() {
    print_status "نصب وابستگی‌های Node.js..."
    
    if [ ! -d node_modules ]; then
        npm install
    else
        print_status "وابستگی‌ها از قبل نصب شده‌اند."
    fi
}

# Start development environment
start_dev() {
    print_header "راه‌اندازی محیط توسعه"
    
    check_docker
    check_env
    create_directories
    install_dependencies
    
    print_status "راه‌اندازی سرویس‌های پایه..."
    docker-compose up -d mongodb redis
    
    print_status "راه‌اندازی API..."
    npm run dev
    
    print_status "محیط توسعه آماده است!"
    print_status "API: http://localhost:$API_PORT"
    print_status "MongoDB: localhost:$DB_PORT"
    print_status "Redis: localhost:$REDIS_PORT"
}

# Start production environment
start_prod() {
    print_header "راه‌اندازی محیط تولید"
    
    check_docker
    check_env
    create_directories
    
    print_status "راه‌اندازی تمام سرویس‌ها..."
    docker-compose --profile production up -d
    
    print_status "انتظار برای راه‌اندازی سرویس‌ها..."
    sleep 30
    
    # Health check
    if curl -f http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
        print_status "سرویس‌ها با موفقیت راه‌اندازی شدند!"
    else
        print_warning "برخی سرویس‌ها ممکن است هنوز در حال راه‌اندازی باشند."
    fi
    
    print_status "API: http://localhost:$API_PORT"
    print_status "Nginx: http://localhost"
    print_status "Grafana: http://localhost:3000 (اختیاری)"
}

# Stop all services
stop() {
    print_header "متوقف کردن سرویس‌ها"
    
    print_status "متوقف کردن سرویس‌های Docker..."
    docker-compose down
    
    if [ -f "npm.pid" ]; then
        print_status "متوقف کردن سرویس‌های Node.js..."
        kill $(cat npm.pid) 2>/dev/null || true
        rm npm.pid
    fi
    
    print_status "تمام سرویس‌ها متوقف شدند."
}

# Restart services
restart() {
    print_header "ریستارت سرویس‌ها"
    
    stop
    sleep 2
    
    if [ "$1" = "prod" ]; then
        start_prod
    else
        start_dev
    fi
}

# View logs
logs() {
    local service=${1:-api}
    print_header "مشاهده لاگ‌های سرویس: $service"
    
    case $service in
        "api")
            docker-compose logs -f whatsapp-api
            ;;
        "db")
            docker-compose logs -f mongodb
            ;;
        "redis")
            docker-compose logs -f redis
            ;;
        "nginx")
            docker-compose logs -f nginx
            ;;
        "all")
            docker-compose logs -f
            ;;
        *)
            print_error "سرویس نامعتبر: $service"
            echo "سرویس‌های موجود: api, db, redis, nginx, all"
            ;;
    esac
}

# Run tests
test() {
    print_header "اجرای تست‌ها"
    
    # Ensure API is running
    if ! curl -f http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
        print_warning "API در حال اجرا نیست. راه‌اندازی سرویس‌ها..."
        start_dev &
        sleep 10
    fi
    
    # Run API tests
    print_status "اجرای تست‌های API..."
    node test-whatsapp.js basic
    
    # Run performance tests
    print_status "اجرای تست‌های عملکرد..."
    node test-whatsapp.js performance
    
    # Run integration tests
    print_status "اجرای تست‌های یکپارچه..."
    node test-whatsapp.js integration
}

# Database backup
backup_db() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    print_status "پشتیبان‌گیری از پایگاه داده..."
    
    # Backup MongoDB
    if docker-compose exec -T mongodb mongodump --out /tmp/backup; then
        docker cp whatsapp-mongodb:/tmp/backup "$backup_dir/mongodb"
        print_status "پشتیبان MongoDB: $backup_dir/mongodb"
    else
        print_error "پشتیبان‌گیری MongoDB ناموفق"
    fi
    
    # Backup Redis
    docker-compose exec -T redis redis-cli BGSAVE
    sleep 5
    docker cp whatsapp-redis:/data/dump.rdb "$backup_dir/redis_dump.rdb" 2>/dev/null || true
    
    print_status "پشتیبان‌گیری کامل: $backup_dir"
}

# Database restore
restore_db() {
    local backup_dir=$1
    if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
        print_error "مسیر پشتیبان معتبر نیست: $backup_dir"
        return 1
    fi
    
    print_warning "این عملیات پایگاه داده فعلی را بازنویسی می‌کند."
    read -p "آیا ادامه می‌دهید؟ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    
    print_status "بازیابی از پشتیبان: $backup_dir"
    
    # Stop API
    docker-compose stop whatsapp-api
    
    # Restore MongoDB
    if [ -d "$backup_dir/mongodb" ]; then
        print_status "بازیابی MongoDB..."
        docker-compose exec -T mongodb mongorestore --drop /tmp/backup 2>/dev/null || \
        docker cp "$backup_dir/mongodb" whatsapp-mongodb:/tmp/backup && \
        docker-compose exec -T mongodb mongorestore --drop /tmp/backup
    fi
    
    # Restart services
    docker-compose start whatsapp-api
    
    print_status "بازیابی کامل شد."
}

# Monitoring dashboard
monitor() {
    print_header "راه‌اندازی داشبورد نظارت"
    
    docker-compose --profile monitoring up -d
    
    print_status "داشبوردهای نظارتی:"
    print_status "Grafana: http://localhost:3000 (admin/admin)"
    print_status "Prometheus: http://localhost:9090"
    print_status "Elasticsearch: http://localhost:9200"
    print_status "Kibana: http://localhost:5601"
}

# Show system status
status() {
    print_header "وضعیت سیستم"
    
    echo "🐳 Docker Containers:"
    docker-compose ps
    
    echo
    echo "🔍 Service Health:"
    if curl -f http://localhost:$API_PORT/api/health > /dev/null 2>&1; then
        print_status "✅ API: در حال اجرا"
    else
        print_error "❌ API: متوقف"
    fi
    
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_status "✅ MongoDB: در حال اجرا"
    else
        print_error "❌ MongoDB: متوقف"
    fi
    
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_status "✅ Redis: در حال اجرا"
    else
        print_error "❌ Redis: متوقف"
    fi
    
    echo
    echo "📊 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "(whatsapp|mongodb|redis)" || true
}

# Show help
show_help() {
    print_header "راهنمای استفاده از اسکریپت مدیریت"
    
    echo "استفاده: $0 [command]"
    echo
    echo "دستورات موجود:"
    echo "  start-dev     راه‌اندازی محیط توسعه"
    echo "  start-prod    راه‌اندازی محیط تولید"
    echo "  stop          متوقف کردن تمام سرویس‌ها"
    echo "  restart       ریستارت سرویس‌ها"
    echo "  logs          مشاهده لاگ‌ها (logs [service])"
    echo "  test          اجرای تست‌ها"
    echo "  backup        پشتیبان‌گیری از پایگاه داده"
    echo "  restore       بازیابی از پشتیبان (restore [path])"
    echo "  monitor       راه‌اندازی داشبورد نظارت"
    echo "  status        نمایش وضعیت سیستم"
    echo "  help          نمایش این راهنما"
    echo
    echo "مثال‌ها:"
    echo "  $0 start-dev"
    echo "  $0 logs api"
    echo "  $0 backup"
    echo "  $0 restore backups/20231122_143000"
}

# Main script logic
main() {
    case $1 in
        "start-dev")
            start_dev
            ;;
        "start-prod")
            start_prod
            ;;
        "stop")
            stop
            ;;
        "restart")
            restart $2
            ;;
        "logs")
            logs $2
            ;;
        "test")
            test
            ;;
        "backup")
            backup_db
            ;;
        "restore")
            restore_db $2
            ;;
        "monitor")
            monitor
            ;;
        "status")
            status
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            print_error "دستور مشخص نشده است."
            show_help
            exit 1
            ;;
        *)
            print_error "دستور نامعتبر: $1"
            show_help
            exit 1
            ;;
    esac
}

# Trap errors
trap 'print_error "خطا در اجرای اسکریپت"' ERR

# Run main function
main "$@"