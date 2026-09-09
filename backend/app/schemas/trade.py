from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TradeBase(BaseModel):
    account_id: int
    symbol: str
    direction: str
    quantity: float = Field(gt=0)
    entry_price: float = Field(gt=0)
    exit_price: float = Field(gt=0)
    entry_time: datetime
    exit_time: datetime
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_amount: float | None = None
    risk_percentage: float | None = None
    planned_rr: float | None = None
    strategy: str | None = None
    timeframe: str | None = None
    session: str | None = None
    market_condition: str | None = None
    emotion: str | None = None
    confidence: int | None = Field(default=None, ge=1, le=10)
    discipline: int | None = Field(default=None, ge=1, le=10)
    setup: str | None = None
    source: str = "Manual"
    notes: str | None = None
    lesson: str | None = None
    tlc_score: int | None = Field(default=None, ge=0, le=100)
    market_data: dict | None = None


class TradeCreate(TradeBase):
    pass


class TradeRead(TradeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    gross_pnl: float = 0.0
    commission: float = 0.0
    swap: float = 0.0
    net_pnl: float = 0.0
    risk_reward_ratio: float = 0.0
    win_loss: str = "UNKNOWN"
