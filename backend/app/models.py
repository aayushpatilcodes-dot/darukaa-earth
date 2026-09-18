import enum
import uuid
from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import Date, DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class ProjectType(str, enum.Enum):  # noqa: UP042 (str mixin kept for JSON-friendly values)
    carbon = "carbon"
    biodiversity = "biodiversity"
    mixed = "mixed"


class MetricType(str, enum.Enum):  # noqa: UP042 (str mixin kept for JSON-friendly values)
    ndvi = "ndvi"
    carbon_stock_tco2e = "carbon_stock_tco2e"
    biodiversity_index = "biodiversity_index"
    canopy_cover_pct = "canopy_cover_pct"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    projects: Mapped[list["Project"]] = relationship(back_populates="owner")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    project_type: Mapped[ProjectType] = mapped_column(
        SAEnum(ProjectType, name="project_type"), default=ProjectType.mixed
    )
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="projects")
    sites: Mapped[list["Site"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POLYGON", srid=4326), nullable=False)
    area_hectares: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="sites")
    metrics: Mapped[list["SiteMetric"]] = relationship(
        back_populates="site", cascade="all, delete-orphan"
    )


class SiteMetric(Base):
    __tablename__ = "site_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    site_id: Mapped[str] = mapped_column(String(36), ForeignKey("sites.id"), nullable=False)
    metric_type: Mapped[MetricType] = mapped_column(SAEnum(MetricType, name="metric_type"))
    recorded_on: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)

    site: Mapped["Site"] = relationship(back_populates="metrics")
