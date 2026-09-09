"""Add hashed one-time account lifecycle tokens."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "0003_account_tokens"
down_revision = "0002_user_audit_fields"

branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # 0001_initial_schema.py uses Base.metadata.create_all(),
    # which may already create account_tokens and its indexes.
    if "account_tokens" in inspector.get_table_names():
        return

    op.create_table(
        "account_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_account_tokens_user_id",
        "account_tokens",
        ["user_id"],
    )

    op.create_index(
        "ix_account_tokens_token_hash",
        "account_tokens",
        ["token_hash"],
        unique=True,
    )

    op.create_index(
        "ix_account_tokens_purpose",
        "account_tokens",
        ["purpose"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if "account_tokens" not in inspector.get_table_names():
        return

    existing_indexes = {
        index["name"]
        for index in inspector.get_indexes("account_tokens")
    }

    for index_name in (
        "ix_account_tokens_purpose",
        "ix_account_tokens_token_hash",
        "ix_account_tokens_user_id",
    ):
        if index_name in existing_indexes:
            op.drop_index(
                index_name,
                table_name="account_tokens",
            )

    op.drop_table("account_tokens")