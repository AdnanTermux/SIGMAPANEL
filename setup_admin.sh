#!/bin/bash
# Sigma SMS A2P - Quick Admin Setup
# Creates admin account with default or custom credentials

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║            Sigma SMS A2P - Admin Setup                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env file first (copy from .env.example)"
    exit 1
fi

# Load database credentials from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)

# Parse database URL
# Format: mysql+pymysql://user:pass@host/dbname
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^\/]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${GREEN}Database Configuration:${NC}"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Menu
echo -e "${GREEN}Choose setup method:${NC}"
echo "1) Quick Setup (default credentials: admin/admin123)"
echo "2) Custom Setup (choose your own credentials)"
echo "3) Exit"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Creating admin with default credentials...${NC}"
        USERNAME="admin"
        EMAIL="admin@sigma-sms.com"
        PASSWORD="admin123"
        # Bcrypt hash for "admin123"
        PASSWORD_HASH='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7qXqKqKqKq'
        ;;
        
    2)
        echo -e "\n${YELLOW}Custom Admin Setup${NC}"
        read -p "Username [admin]: " USERNAME
        USERNAME=${USERNAME:-admin}
        
        read -p "Email [admin@sigma-sms.com]: " EMAIL
        EMAIL=${EMAIL:-admin@sigma-sms.com}
        
        # For custom password, we need Python
        if command -v python3 &> /dev/null; then
            echo -e "${YELLOW}Generating password hash...${NC}"
            read -sp "Password: " PASSWORD
            echo ""
            
            # Generate bcrypt hash using Python
            PASSWORD_HASH=$(python3 -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('$PASSWORD'))")
        else
            echo -e "${RED}Python3 not found. Using default password: admin123${NC}"
            PASSWORD="admin123"
            PASSWORD_HASH='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7qXqKqKqKq'
        fi
        ;;
        
    3)
        echo -e "${YELLOW}Goodbye!${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

# Create SQL command
SQL="
USE $DB_NAME;
DELETE FROM users WHERE username = '$USERNAME';
INSERT INTO users (username, email, password, role, status, created_at)
VALUES ('$USERNAME', '$EMAIL', '$PASSWORD_HASH', 'admin', 'active', NOW());
SELECT 'Admin user created successfully!' AS message;
"

# Execute SQL
echo -e "\n${YELLOW}Creating admin user in database...${NC}"
if [ -z "$DB_PASS" ]; then
    echo "$SQL" | mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME"
else
    echo "$SQL" | mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
fi

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Admin Account Created Successfully!           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${BLUE}Login Details:${NC}"
    echo -e "  Username: ${GREEN}$USERNAME${NC}"
    echo -e "  Email:    ${GREEN}$EMAIL${NC}"
    echo -e "  Password: ${GREEN}${PASSWORD:-admin123}${NC}"
    echo -e "\n${BLUE}Login URL:${NC}"
    echo -e "  ${GREEN}http://localhost:8000/login${NC}"
    echo -e "  ${GREEN}http://your-domain.com/login${NC}"
    echo -e "\n${YELLOW}⚠️  IMPORTANT: Change your password after first login!${NC}\n"
else
    echo -e "\n${RED}❌ Failed to create admin user${NC}"
    exit 1
fi
