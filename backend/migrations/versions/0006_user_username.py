"""Add optional username field to users."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0006_user_username"
down_revision = "0005_financial_precision"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "username" not in columns:
        # Nullable on purpose so existing users are not forced to provide
        # a username during a non-destructive production migration.
        op.add_column("users", sa.Column("username", sa.String(), nullable=True))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "username" in columns:
        op.drop_column("users", "username")
