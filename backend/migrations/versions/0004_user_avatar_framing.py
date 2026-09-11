"""Add persistent profile avatar framing settings."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0004_user_avatar_framing"
down_revision = "0003_account_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "avatar_zoom" not in columns:
        op.add_column("users", sa.Column("avatar_zoom", sa.Integer(), nullable=False, server_default="100"))
    if "avatar_position" not in columns:
        op.add_column("users", sa.Column("avatar_position", sa.String(), nullable=False, server_default="center"))


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "avatar_position" in columns:
        op.drop_column("users", "avatar_position")
    if "avatar_zoom" in columns:
        op.drop_column("users", "avatar_zoom")
