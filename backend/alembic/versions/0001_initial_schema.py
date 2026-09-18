"""Initial schema: users, projects, sites, site_metrics

Revision ID: 0001
Revises:
Create Date: 2026-09-18

"""

from collections.abc import Sequence

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    project_type = sa.Enum("carbon", "biodiversity", "mixed", name="project_type")
    metric_type = sa.Enum(
        "ndvi", "carbon_stock_tco2e", "biodiversity_index", "canopy_cover_pct", name="metric_type"
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("project_type", project_type, nullable=False, server_default="mixed"),
        sa.Column("owner_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sites",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.Geometry(geometry_type="POLYGON", srid=4326),
            nullable=False,
        ),
        sa.Column("area_hectares", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_sites_project_id", "sites", ["project_id"])

    op.create_table(
        "site_metrics",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("site_id", sa.String(length=36), sa.ForeignKey("sites.id"), nullable=False),
        sa.Column("metric_type", metric_type, nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
    )
    op.create_index("ix_site_metrics_site_id", "site_metrics", ["site_id"])


def downgrade() -> None:
    op.drop_table("site_metrics")
    op.drop_table("sites")
    op.drop_table("projects")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    sa.Enum(name="metric_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="project_type").drop(op.get_bind(), checkfirst=True)
