"""Add verification and audit timestamps to users."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0002_user_audit_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("users")}
    if "is_verified" not in columns:
        op.add_column("users", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    if "created_at" not in columns:
        op.add_column("users", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
    if "updated_at" not in columns:
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in inspect(bind).get_columns("users")}
    for name in ("updated_at", "created_at", "is_verified"):
        if name in columns:
            op.drop_column("users", name)
