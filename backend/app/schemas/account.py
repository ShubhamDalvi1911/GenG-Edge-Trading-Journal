from pydantic import BaseModel, ConfigDict, Field


class AccountBase(BaseModel):
    name: str
    broker: str | None = None
    account_type: str | None = None
    currency: str = "USD"
    initial_balance: float = 0.0
    current_balance: float = 0.0
    daily_loss_limit: float | None = None
    max_drawdown: float | None = None
    profit_target: float | None = None
    risk_per_trade: float | None = None
    status: str = "Active"
    notes: str | None = None
    profit_target_type: str = "percentage"
    daily_loss_limit_type: str = "percentage"
    max_drawdown_type: str = "percentage"
    minimum_trading_days: int = Field(default=0, ge=0)
    maximum_trading_days: int | None = Field(default=None, ge=0)
    maximum_position_size: float | None = Field(default=None, gt=0)
    leverage: float | None = Field(default=None, gt=0)
    daily_profit_target: float | None = Field(default=None, ge=0)
    consistency_rule_enabled: bool = False
    consistency_max_best_day_percent: float | None = Field(default=None, ge=0, le=100)
    news_trading_restriction: bool = False
    weekend_holding_restriction: bool = False
    maximum_trades_per_day: int | None = Field(default=None, gt=0)
    maximum_losing_trades_per_day: int | None = Field(default=None, gt=0)
    daily_loss_calculation_method: str = "closed_trades_only"
    daily_reset_time: str = "00:00"
    daily_reset_timezone: str = "UTC"
    drawdown_type: str = "static"
    trailing_drawdown_type: str | None = None
    trailing_drawdown_value: float | None = Field(default=None, gt=0)


class AccountCreate(AccountBase):
    pass


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
