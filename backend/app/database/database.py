from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


ACCOUNT_UPGRADE_COLUMNS = {
    "users.is_verified": "BOOLEAN DEFAULT FALSE",
    "users.created_at": "TIMESTAMP",
    "users.updated_at": "TIMESTAMP",
    "profit_target_type": "VARCHAR DEFAULT 'percentage'",
    "daily_loss_limit_type": "VARCHAR DEFAULT 'percentage'",
    "max_drawdown_type": "VARCHAR DEFAULT 'percentage'",
    "minimum_trading_days": "INTEGER DEFAULT 0",
    "maximum_trading_days": "INTEGER",
    "maximum_position_size": "FLOAT",
    "leverage": "FLOAT",
    "daily_profit_target": "FLOAT",
    "consistency_rule_enabled": "BOOLEAN DEFAULT FALSE",
    "consistency_max_best_day_percent": "FLOAT",
    "news_trading_restriction": "BOOLEAN DEFAULT FALSE",
    "weekend_holding_restriction": "BOOLEAN DEFAULT FALSE",
    "maximum_trades_per_day": "INTEGER",
    "maximum_losing_trades_per_day": "INTEGER",
    "daily_loss_calculation_method": "VARCHAR DEFAULT 'closed_trades_only'",
    "daily_reset_time": "VARCHAR DEFAULT '00:00'",
    "daily_reset_timezone": "VARCHAR DEFAULT 'UTC'",
    "drawdown_type": "VARCHAR DEFAULT 'static'",
    "trailing_drawdown_type": "VARCHAR",
    "trailing_drawdown_value": "FLOAT",
}


def upgrade_account_columns() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as connection:
        for qualified_name, column_type in ACCOUNT_UPGRADE_COLUMNS.items():
            if "." in qualified_name:
                table_name, column_name = qualified_name.split(".", 1)
            else:
                table_name, column_name = "accounts", qualified_name
            if table_name not in tables:
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            if column_name not in existing:
                connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
