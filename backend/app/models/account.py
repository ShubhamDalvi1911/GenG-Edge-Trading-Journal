from sqlalchemy import Boolean, Column, Float, Integer, String, Text

from app.database.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    name = Column(String, nullable=False)
    broker = Column(String, nullable=True)
    account_type = Column(String, nullable=True)
    currency = Column(String, default="USD")
    initial_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    daily_loss_limit = Column(Float, nullable=True)
    max_drawdown = Column(Float, nullable=True)
    profit_target = Column(Float, nullable=True)
    risk_per_trade = Column(Float, nullable=True)
    status = Column(String, default="Active")
    notes = Column(Text, nullable=True)
    profit_target_type = Column(String, default="percentage")
    daily_loss_limit_type = Column(String, default="percentage")
    max_drawdown_type = Column(String, default="percentage")
    minimum_trading_days = Column(Integer, default=0)
    maximum_trading_days = Column(Integer, nullable=True)
    maximum_position_size = Column(Float, nullable=True)
    leverage = Column(Float, nullable=True)
    daily_profit_target = Column(Float, nullable=True)
    consistency_rule_enabled = Column(Boolean, default=False)
    consistency_max_best_day_percent = Column(Float, nullable=True)
    news_trading_restriction = Column(Boolean, default=False)
    weekend_holding_restriction = Column(Boolean, default=False)
    maximum_trades_per_day = Column(Integer, nullable=True)
    maximum_losing_trades_per_day = Column(Integer, nullable=True)
    daily_loss_calculation_method = Column(String, default="closed_trades_only")
    daily_reset_time = Column(String, default="00:00")
    daily_reset_timezone = Column(String, default="UTC")
    drawdown_type = Column(String, default="static")
    trailing_drawdown_type = Column(String, nullable=True)
    trailing_drawdown_value = Column(Float, nullable=True)
