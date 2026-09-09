from sqlalchemy import Column, Float, Integer, String, Text, DateTime, JSON

from app.database.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    account_id = Column(Integer, index=True, nullable=False)
    symbol = Column(String, index=True, nullable=False)
    direction = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    entry_time = Column(DateTime(timezone=True), nullable=False)
    exit_time = Column(DateTime(timezone=True), nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    risk_amount = Column(Float, nullable=True)
    risk_percentage = Column(Float, nullable=True)
    planned_rr = Column(Float, nullable=True)
    gross_pnl = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    swap = Column(Float, default=0.0)
    net_pnl = Column(Float, default=0.0)
    strategy = Column(String, nullable=True)
    timeframe = Column(String, nullable=True)
    session = Column(String, index=True, nullable=True)
    market_condition = Column(String, nullable=True)
    emotion = Column(String, nullable=True)
    confidence = Column(Integer, nullable=True)
    discipline = Column(Integer, nullable=True)
    setup = Column(String, nullable=True)
    source = Column(String, default="Manual")
    notes = Column(Text, nullable=True)
    lesson = Column(Text, nullable=True)
    tlc_score = Column(Integer, default=0)
    risk_reward_ratio = Column(Float, default=0.0)
    win_loss = Column(String, default="UNKNOWN")
    market_data = Column(JSON, nullable=True)
