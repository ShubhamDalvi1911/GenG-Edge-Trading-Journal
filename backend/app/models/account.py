from sqlalchemy import Boolean, Column, Float, Integer, String, Text, Numeric

from app.database.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    name = Column(String, nullable=False)
    broker = Column(String, nullable=True)
    account_type = Column(String, nullable=True)
    currency = Column(String, default="USD")
    initial_balance = Column(Numeric(20, 8), default=0.0)
    current_balance = Column(Numeric(20, 8), default=0.0)
    daily_loss_limit = Column(Numeric(20, 8), nullable=True)
    max_drawdown = Column(Numeric(20, 8), nullable=True)
    profit_target = Column(Numeric(20, 8), nullable=True)
    risk_per_trade = Column(Numeric(20, 8), nullable=True)
    status = Column(String, default="Active")
    notes = Column(Text, nullable=True)
    profit_target_type = Column(String, default="percentage")
    daily_loss_limit_type = Column(String, default="percentage")
    max_drawdown_type = Column(String, default="percentage")
    minimum_trading_days = Column(Integer, default=0)
    maximum_trading_days = Column(Integer, nullable=True)
    maximum_position_size = Column(Numeric(24, 8), nullable=True)
    leverage = Column(Numeric(12, 6), nullable=True)
    daily_profit_target = Column(Numeric(20, 8), nullable=True)
    consistency_rule_enabled = Column(Boolean, default=False)
    consistency_max_best_day_percent = Column(Numeric(12, 6), nullable=True)
    news_trading_restriction = Column(Boolean, default=False)
    weekend_holding_restriction = Column(Boolean, default=False)
    maximum_trades_per_day = Column(Integer, nullable=True)
    maximum_losing_trades_per_day = Column(Integer, nullable=True)
    daily_loss_calculation_method = Column(String, default="closed_trades_only")
    daily_reset_time = Column(String, default="00:00")
    daily_reset_timezone = Column(String, default="UTC")
    drawdown_type = Column(String, default="static")
    trailing_drawdown_type = Column(String, nullable=True)
    trailing_drawdown_value = Column(Numeric(20, 8), nullable=True)
