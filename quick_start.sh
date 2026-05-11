#!/bin/bash
# Sigma SMS A2P - Quick Start Script
# One-command setup for development and production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗██╗ ██████╗ ███╗   ███╗ █████╗                ║
║   ██╔════╝██║██╔════╝ ████╗ ████║██╔══██╗               ║
║   ███████╗██║██║  ███╗██╔████╔██║███████║               ║
║   ╚════██║██║██║   ██║██║╚██╔╝██║██╔══██║               ║
║   ███████║██║╚██████╔╝██║ ╚═╝ ██║██║  ██║               ║
║   ╚══════╝╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝               ║
║                                                           ║
║            SMS A2P - Quick Start Setup                    ║
║         Professional SMS OTP Management System            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running in python_version directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}Error: Please run this script from the python_version directory${NC}"
    exit 1
fi

# Function to generate random secret
generate_secret() {
    python3 -c "import secrets; print(secrets.token_urlsafe(32))"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main menu
echo -e "${GREEN}Choose installation method:${NC}"
echo "1) Docker (Recommended - Fastest)"
echo "2) Manual Setup (Development)"
echo "3) Production Setup (Ubuntu/Debian)"
echo "4) Generate .env file only"
echo "5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo -e "\n${BLUE}=== Docker Installation ===${NC}\n"
        
        # Check Docker
        if ! command_exists docker; then
            echo -e "${RED}Docker not found. Please install Docker first:${NC}"
            echo "https://docs.docker.com/get-docker/"
            exit 1
        fi
        
        if ! command_exists docker-compose; then
            echo -e "${RED}Docker Compose not found. Please install Docker Compose first:${NC}"
            echo "https://docs.docker.com/compose/install/"
            exit 1
        fi
        
        # Create .env if not exists
        if [ ! -f ".env" ]; then
            echo -e "${YELLOW}Creating .env file...${NC}"
            cp .env.example .env
            
            # Generate secrets
            SECRET_KEY=$(generate_secret)
            JWT_SECRET=$(generate_secret)
            
            # Update .env
            sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
            sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|g" .env
            
            echo -e "${GREEN}✓ .env file created with random secrets${NC}"
        fi
        
        # Start Docker
        echo -e "\n${YELLOW}Starting Docker containers...${NC}"
        docker-compose up -d
        
        echo -e "\n${GREEN}✓ Docker containers started!${NC}"
        echo -e "\n${BLUE}Waiting for services to be ready...${NC}"
        sleep 10
        
        # Check health
        echo -e "${YELLOW}Checking application health...${NC}"
        if curl -s http://localhost:8000/health > /dev/null; then
            echo -e "${GREEN}✓ Application is healthy!${NC}"
        else
            echo -e "${YELLOW}⚠ Application is starting... (may take a few more seconds)${NC}"
        fi
        
        echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║           🎉 Installation Complete! 🎉                ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
        echo -e "\n${BLUE}Access your panel:${NC}"
        echo -e "  • Landing Page:  ${GREEN}http://localhost:8000${NC}"
        echo -e "  • Admin Login:   ${GREEN}http://localhost:8000/login${NC}"
        echo -e "  • Dashboard:     ${GREEN}http://localhost:8000/dashboard${NC}"
        echo -e "  • Test Panel:    ${GREEN}http://localhost:8000/test-login${NC}"
        echo -e "  • API Docs:      ${GREEN}http://localhost:8000/api/docs${NC}"
        echo -e "\n${BLUE}Useful commands:${NC}"
        echo -e "  • View logs:     ${YELLOW}docker-compose logs -f app${NC}"
        echo -e "  • Stop:          ${YELLOW}docker-compose down${NC}"
        echo -e "  • Restart:       ${YELLOW}docker-compose restart${NC}"
        echo -e "  • Rebuild:       ${YELLOW}docker-compose up -d --build${NC}"
        ;;
        
    2)
        echo -e "\n${BLUE}=== Manual Setup ===${NC}\n"
        
        # Check Python
        if ! command_exists python3; then
            echo -e "${RED}Python 3 not found. Please install Python 3.10+${NC}"
            exit 1
        fi
        
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        echo -e "${GREEN}✓ Found Python $PYTHON_VERSION${NC}"
        
        # Create virtual environment
        if [ ! -d "venv" ]; then
            echo -e "${YELLOW}Creating virtual environment...${NC}"
            python3 -m venv venv
            echo -e "${GREEN}✓ Virtual environment created${NC}"
        fi
        
        # Activate venv
        echo -e "${YELLOW}Activating virtual environment...${NC}"
        source venv/bin/activate
        
        # Install dependencies
        echo -e "${YELLOW}Installing dependencies...${NC}"
        pip install --upgrade pip
        pip install -r requirements.txt
        echo -e "${GREEN}✓ Dependencies installed${NC}"
        
        # Create .env
        if [ ! -f ".env" ]; then
            echo -e "${YELLOW}Creating .env file...${NC}"
            cp .env.example .env
            
            SECRET_KEY=$(generate_secret)
            JWT_SECRET=$(generate_secret)
            
            sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
            sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|g" .env
            
            echo -e "${GREEN}✓ .env file created${NC}"
            echo -e "${YELLOW}⚠ Please edit .env and configure DATABASE_URL${NC}"
        fi
        
        # Database setup
        echo -e "\n${BLUE}Database Setup:${NC}"
        echo -e "1. Create MySQL database:"
        echo -e "   ${YELLOW}mysql -u root -p -e \"CREATE DATABASE sigma_sms_a2p CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"${NC}"
        echo -e "\n2. Import schemas:"
        echo -e "   ${YELLOW}mysql -u root -p sigma_sms_a2p < database/schema.sql${NC}"
        echo -e "   ${YELLOW}mysql -u root -p sigma_sms_a2p < database/schema_security_update.sql${NC}"
        echo -e "   ${YELLOW}mysql -u root -p sigma_sms_a2p < database/schema_test_panel.sql${NC}"
        echo -e "   ${YELLOW}mysql -u root -p sigma_sms_a2p < database/schema_crypto_wallets.sql${NC}"
        echo -e "\n3. Update DATABASE_URL in .env"
        echo -e "\n4. Start application:"
        echo -e "   ${YELLOW}uvicorn app.main:app --reload${NC}"
        
        echo -e "\n${GREEN}✓ Manual setup complete!${NC}"
        ;;
        
    3)
        echo -e "\n${BLUE}=== Production Setup ===${NC}\n"
        
        # Check if running as root
        if [ "$EUID" -ne 0 ]; then
            echo -e "${RED}Please run as root (sudo)${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Installing system dependencies...${NC}"
        apt-get update
        apt-get install -y python3.11 python3-pip python3-venv mysql-server redis-server nginx
        
        echo -e "${GREEN}✓ System dependencies installed${NC}"
        
        # Create app directory
        APP_DIR="/var/www/sigma-sms"
        if [ ! -d "$APP_DIR" ]; then
            mkdir -p "$APP_DIR"
            cp -r . "$APP_DIR/python_version"
        fi
        
        cd "$APP_DIR/python_version"
        
        # Virtual environment
        python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        
        # Create .env
        if [ ! -f ".env" ]; then
            cp .env.example .env
            SECRET_KEY=$(generate_secret)
            JWT_SECRET=$(generate_secret)
            sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
            sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|g" .env
        fi
        
        # Create systemd service
        cat > /etc/systemd/system/sigma-sms.service << 'EOF'
[Unit]
Description=Sigma SMS A2P
After=network.target mysql.service redis.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/sigma-sms/python_version
Environment="PATH=/var/www/sigma-sms/python_version/venv/bin"
ExecStart=/var/www/sigma-sms/python_version/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        # Set permissions
        chown -R www-data:www-data "$APP_DIR"
        
        # Enable service
        systemctl daemon-reload
        systemctl enable sigma-sms
        
        echo -e "\n${GREEN}✓ Production setup complete!${NC}"
        echo -e "\n${BLUE}Next steps:${NC}"
        echo -e "1. Configure database and update .env"
        echo -e "2. Import database schemas"
        echo -e "3. Start service: ${YELLOW}systemctl start sigma-sms${NC}"
        echo -e "4. Configure Nginx (see README.md)"
        echo -e "5. Setup SSL with certbot"
        ;;
        
    4)
        echo -e "\n${BLUE}=== Generate .env File ===${NC}\n"
        
        if [ -f ".env" ]; then
            read -p ".env already exists. Overwrite? (y/N): " overwrite
            if [ "$overwrite" != "y" ]; then
                echo -e "${YELLOW}Cancelled${NC}"
                exit 0
            fi
        fi
        
        cp .env.example .env
        
        SECRET_KEY=$(generate_secret)
        JWT_SECRET=$(generate_secret)
        
        sed -i "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
        sed -i "s|JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|g" .env
        
        echo -e "${GREEN}✓ .env file created with random secrets${NC}"
        echo -e "${YELLOW}⚠ Please edit .env and configure:${NC}"
        echo -e "  • DATABASE_URL"
        echo -e "  • REDIS_URL"
        echo -e "  • APP_URL"
        echo -e "  • CORS_ORIGINS"
        ;;
        
    5)
        echo -e "${YELLOW}Goodbye!${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
