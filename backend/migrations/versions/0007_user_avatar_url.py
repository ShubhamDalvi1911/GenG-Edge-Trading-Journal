"""Add optional avatar URL field to users."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0007_user_avatar_url"
down_revision = "0006_user_username"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_url" not in columns:
        op.add_column(
            "users",
            sa.Column("avatar_url", sa.String(), nullable=True),
        )


def downgrade() -> None:
    inspector = inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "avatar_url" in columns:
        op.drop_column("users", "avatar_url")