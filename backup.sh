#!/bin/bash
# Sigma SMS A2P - Backup Script
# Automated backup for database and application files

set -e

# Configuration
BACKUP_DIR="/var/backups/sigma-sms"
APP_DIR="/var/www/sigma-sms/python_version"
DB_NAME="sigma_sms_a2p"
DB_USER="sigma_user"
DB_PASS="your_password"  # Change this or use .my.cnf
RETENTION_DAYS=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="sigma_sms_backup_$TIMESTAMP"

echo -e "${GREEN}Starting backup: $BACKUP_NAME${NC}"

# 1. Database backup
echo -e "${YELLOW}Backing up database...${NC}"
mysqldump -u "$DB_USER" -p"$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "$DB_NAME" | gzip > "$BACKUP_DIR/${BACKUP_NAME}_db.sql.gz"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backup complete${NC}"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    exit 1
fi

# 2. Application files backup
echo -e "${YELLOW}Backing up application files...${NC}"
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" \
    -C "$APP_DIR" \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='logs' \
    --exclude='.git' \
    .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Application backup complete${NC}"
else
    echo -e "${RED}✗ Application backup failed${NC}"
    exit 1
fi

# 3. Environment file backup
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}Backing up .env file...${NC}"
    cp "$APP_DIR/.env" "$BACKUP_DIR/${BACKUP_NAME}_env"
    echo -e "${GREEN}✓ Environment backup complete${NC}"
fi

# 4. Create backup manifest
cat > "$BACKUP_DIR/${BACKUP_NAME}_manifest.txt" << EOF
Sigma SMS A2P Backup
====================
Date: $(date)
Hostname: $(hostname)
Database: $DB_NAME
Application: $APP_DIR

Files:
- ${BACKUP_NAME}_db.sql.gz (Database dump)
- ${BACKUP_NAME}_app.tar.gz (Application files)
- ${BACKUP_NAME}_env (Environment configuration)

Sizes:
$(du -h "$BACKUP_DIR/${BACKUP_NAME}"*)
EOF

echo -e "${GREEN}✓ Backup manifest created${NC}"

# 5. Remove old backups
echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "sigma_sms_backup_*" -mtime +$RETENTION_DAYS -delete
echo -e "${GREEN}✓ Cleanup complete${NC}"

# 6. Summary
echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Backup Complete Successfully!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo -e "\n${GREEN}Backup location: $BACKUP_DIR${NC}"
echo -e "${GREEN}Backup name: $BACKUP_NAME${NC}"
echo -e "\n${YELLOW}Files created:${NC}"
ls -lh "$BACKUP_DIR/${BACKUP_NAME}"*

# Optional: Upload to remote storage (uncomment and configure)
# echo -e "\n${YELLOW}Uploading to remote storage...${NC}"
# rsync -avz "$BACKUP_DIR/${BACKUP_NAME}"* user@remote-server:/backups/sigma-sms/
# # Or use AWS S3:
# # aws s3 sync "$BACKUP_DIR" s3://your-bucket/sigma-sms-backups/

echo -e "\n${GREEN}Done!${NC}"
