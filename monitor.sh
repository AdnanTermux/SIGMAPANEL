#!/bin/bash
# Sigma SMS A2P - Health Monitoring Script
# Check application health and send alerts

set -e

# Configuration
APP_URL="http://localhost:8000"
HEALTH_ENDPOINT="$APP_URL/health"
LOG_FILE="/var/log/sigma-sms/monitor.log"
ALERT_EMAIL="admin@your-domain.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Function to log
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    
    # Email alert (requires mailutils)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi
    
    # Log alert
    log "ALERT: $subject - $message"
}

# Check application health
check_app_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" 2>&1)
    
    if [ "$response" = "200" ]; then
        log "✓ Application is healthy"
        return 0
    else
        log "✗ Application health check failed (HTTP $response)"
        send_alert "Sigma SMS A2P - Application Down" "Health check failed with HTTP code: $response"
        return 1
    fi
}

# Check database connection
check_database() {
    if systemctl is-active --quiet mysql; then
        log "✓ MySQL is running"
        return 0
    else
        log "✗ MySQL is not running"
        send_alert "Sigma SMS A2P - Database Down" "MySQL service is not running"
        return 1
    fi
}

# Check Redis
check_redis() {
    if systemctl is-active --quiet redis; then
        log "✓ Redis is running"
        return 0
    else
        log "✗ Redis is not running"
        send_alert "Sigma SMS A2P - Redis Down" "Redis service is not running"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log "✓ Disk space OK ($usage% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "⚠ Disk space warning ($usage% used)"
        send_alert "Sigma SMS A2P - Disk Space Warning" "Disk usage is at $usage%"
        return 1
    else
        log "✗ Disk space critical ($usage% used)"
        send_alert "Sigma SMS A2P - Disk Space Critical" "Disk usage is at $usage%"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$usage" -lt 80 ]; then
        log "✓ Memory OK ($usage% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "⚠ Memory warning ($usage% used)"
        return 1
    else
        log "✗ Memory critical ($usage% used)"
        send_alert "Sigma SMS A2P - Memory Critical" "Memory usage is at $usage%"
        return 1
    fi
}

# Check application service
check_service() {
    if systemctl is-active --quiet sigma-sms; then
        log "✓ Sigma SMS service is running"
        return 0
    else
        log "✗ Sigma SMS service is not running"
        send_alert "Sigma SMS A2P - Service Down" "Application service is not running"
        
        # Try to restart
        log "Attempting to restart service..."
        systemctl restart sigma-sms
        sleep 5
        
        if systemctl is-active --quiet sigma-sms; then
            log "✓ Service restarted successfully"
            send_alert "Sigma SMS A2P - Service Restarted" "Service was down and has been restarted"
            return 0
        else
            log "✗ Failed to restart service"
            return 1
        fi
    fi
}

# Main monitoring
echo -e "${GREEN}=== Sigma SMS A2P Health Check ===${NC}"
log "Starting health check..."

FAILED=0

check_service || ((FAILED++))
check_app_health || ((FAILED++))
check_database || ((FAILED++))
check_redis || ((FAILED++))
check_disk_space || ((FAILED++))
check_memory || ((FAILED++))

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All checks passed${NC}"
    log "All health checks passed"
    exit 0
else
    echo -e "\n${RED}✗ $FAILED check(s) failed${NC}"
    log "$FAILED health check(s) failed"
    exit 1
fi
