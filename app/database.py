"""
Database Connection and Session Management
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from .config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    echo=settings.APP_DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_missing_columns():
    """
    Add columns that exist in SQLAlchemy models but are missing from the actual DB tables.
    This handles the case where new model columns were added after tables were created.
    Uses raw SQL to avoid ORM loading issues with missing columns.
    """
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    type_map = {
        'TEXT': 'TEXT',
        'VARCHAR': 'VARCHAR',
        'INTEGER': 'INTEGER',
        'BIGINT': 'BIGINT',
        'FLOAT': 'FLOAT',
        'BOOLEAN': 'BOOLEAN',
        'DATETIME': 'DATETIME',
        'DECIMAL': 'DECIMAL',
        'NUMERIC': 'NUMERIC',
        'ENUM': 'ENUM',
        'CHAR': 'CHAR',
        'CLOB': 'TEXT',
    }

    for table_cls in Base.__subclasses__():
        tbl_name = table_cls.__tablename__
        if tbl_name not in table_names:
            continue

        existing_cols = {col['name'] for col in inspector.get_columns(tbl_name)}

        for col in table_cls.__table__.columns:
            if col.name in existing_cols:
                continue

            col_type = str(col.type)
            # Build column type string for MySQL
            sql_type = col_type.upper()
            # For VARCHAR with length, keep it
            for t_key in type_map:
                if t_key in sql_type:
                    sql_type = type_map[t_key]
                    break
            # Preserve length info for VARCHAR
            if 'VARCHAR' in str(col.type).upper() and '(' in str(col.type):
                sql_type = str(col.type).upper()
            # Preserve DECIMAL precision
            if 'DECIMAL' in str(col.type).upper() and '(' in str(col.type):
                sql_type = str(col.type).upper()
            if 'NUMERIC' in str(col.type).upper() and '(' in str(col.type):
                sql_type = str(col.type).upper()

            nullable = '' if col.nullable else ' NOT NULL'
            default_sql = ''
            if col.server_default is not None:
                default_sql = f' DEFAULT {col.server_default.arg}'
            elif col.default is not None:
                if isinstance(col.default.arg, str):
                    default_sql = f" DEFAULT '{col.default.arg}'"
                else:
                    default_sql = f' DEFAULT {col.default.arg}'

            alter_sql = f'ALTER TABLE `{tbl_name}` ADD COLUMN `{col.name}` {sql_type}{nullable}{default_sql}'
            try:
                with engine.connect() as conn:
                    conn.execute(text(alter_sql))
                    conn.commit()
            except Exception as e:
                # Column might have been added by another worker, ignore
                pass


def init_db():
    """Initialize database tables - safe for concurrent workers"""
    # checkfirst=True prevents errors when tables already exist
    Base.metadata.create_all(bind=engine, checkfirst=True)
    # Add any new columns that were added to models after table creation
    try:
        _migrate_missing_columns()
    except Exception:
        pass
