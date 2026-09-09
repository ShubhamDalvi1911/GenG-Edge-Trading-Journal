"""Add hashed one-time account lifecycle tokens."""
from alembic import op
import sqlalchemy as sa

revision = "0003_account_tokens"
down_revision = "0002_user_audit_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_account_tokens_user_id", "account_tokens", ["user_id"])
    op.create_index("ix_account_tokens_token_hash", "account_tokens", ["token_hash"], unique=True)
    op.create_index("ix_account_tokens_purpose", "account_tokens", ["purpose"])


def downgrade() -> None:
    op.drop_index("ix_account_tokens_purpose", table_name="account_tokens")
    op.drop_index("ix_account_tokens_token_hash", table_name="account_tokens")
    op.drop_index("ix_account_tokens_user_id", table_name="account_tokens")
    op.drop_table("account_tokens")
