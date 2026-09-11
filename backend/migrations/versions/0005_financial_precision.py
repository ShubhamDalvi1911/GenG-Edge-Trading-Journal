"""Use fixed-precision numeric types for financial fields."""

from alembic import op
import sqlalchemy as sa

revision = "0005_financial_precision"
down_revision = "0004_user_avatar_framing"
branch_labels = None
depends_on = None

TRADE_NUMERIC = {
    "quantity": sa.Numeric(24, 8),
    "entry_price": sa.Numeric(24, 10),
    "exit_price": sa.Numeric(24, 10),
    "stop_loss": sa.Numeric(24, 10),
    "take_profit": sa.Numeric(24, 10),
    "risk_amount": sa.Numeric(20, 8),
    "risk_percentage": sa.Numeric(12, 6),
    "planned_rr": sa.Numeric(12, 6),
    "gross_pnl": sa.Numeric(20, 8),
    "commission": sa.Numeric(20, 8),
    "swap": sa.Numeric(20, 8),
    "net_pnl": sa.Numeric(20, 8),
    "risk_reward_ratio": sa.Numeric(12, 6),
}

ACCOUNT_NUMERIC = {
    "initial_balance": sa.Numeric(20, 8),
    "current_balance": sa.Numeric(20, 8),
    "daily_loss_limit": sa.Numeric(20, 8),
    "max_drawdown": sa.Numeric(20, 8),
    "profit_target": sa.Numeric(20, 8),
    "risk_per_trade": sa.Numeric(20, 8),
    "maximum_position_size": sa.Numeric(24, 8),
    "leverage": sa.Numeric(12, 6),
    "daily_profit_target": sa.Numeric(20, 8),
    "consistency_max_best_day_percent": sa.Numeric(12, 6),
    "trailing_drawdown_value": sa.Numeric(20, 8),
}


def _alter(table: str, columns: dict[str, sa.Numeric]) -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table(table) as batch:
            for name, new_type in columns.items():
                batch.alter_column(name, existing_type=sa.Float(), type_=new_type)
    elif bind.dialect.name == "postgresql":
        for name, new_type in columns.items():
            op.alter_column(
                table,
                name,
                existing_type=sa.Float(),
                type_=new_type,
                postgresql_using=f'"{name}"::numeric',
            )
    else:
        for name, new_type in columns.items():
            op.alter_column(name, existing_type=sa.Float(), type_=new_type)


def _revert(table: str, columns: dict[str, sa.Numeric]) -> None:
    bind = op.get_bind()
    float_columns = {name: sa.Float() for name in columns}
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table(table) as batch:
            for name, new_type in float_columns.items():
                batch.alter_column(name, existing_type=columns[name], type_=new_type)
    elif bind.dialect.name == "postgresql":
        for name, new_type in float_columns.items():
            op.alter_column(
                table,
                name,
                existing_type=columns[name],
                type_=new_type,
                postgresql_using=f'"{name}"::double precision',
            )
    else:
        for name, new_type in float_columns.items():
            op.alter_column(name, existing_type=columns[name], type_=new_type)


def upgrade() -> None:
    _alter("trades", TRADE_NUMERIC)
    _alter("accounts", ACCOUNT_NUMERIC)


def downgrade() -> None:
    _revert("trades", TRADE_NUMERIC)
    _revert("accounts", ACCOUNT_NUMERIC)
