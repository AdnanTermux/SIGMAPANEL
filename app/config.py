"""
Configuration Management
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Sigma SMS A2P"
    APP_ENV: str = "production"
    APP_DEBUG: bool = False
    APP_URL: str = "https://your-domain.com"
    SECRET_KEY: str
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60
    
    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "5/15minutes"
    RATE_LIMIT_API: str = "100/hour"
    RATE_LIMIT_WEBHOOK: str = "1000/hour"
    
    # CORS
    CORS_ORIGINS: str = "*"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Session
    SESSION_LIFETIME: int = 3600
    SESSION_COOKIE_NAME: str = "sigma_session"
    
    # Test Panel
    TEST_DEFAULT_USERNAME: str = "test123"
    TEST_DEFAULT_PASSWORD: str = "test123"
    TEST_DEFAULT_LIMIT: int = 10
    
    # Crypto
    USDT_TRC20_MIN_PAYOUT: float = 10.00
    BINANCE_MIN_PAYOUT: float = 10.00
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@your-domain.com"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "/var/log/sigma-sms/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
