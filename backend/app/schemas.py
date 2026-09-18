from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import MetricType, ProjectType


# ---- Auth ----
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- GeoJSON ----
class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: list[list[list[float]]]


# ---- Sites ----
class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    geometry: GeoJSONPolygon


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str | None
    geometry: dict[str, Any]
    area_hectares: float | None
    created_at: datetime


# ---- Projects ----
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    project_type: ProjectType = ProjectType.mixed


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    project_type: ProjectType | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    project_type: ProjectType
    owner_id: str
    created_at: datetime
    updated_at: datetime
    site_count: int = 0


class ProjectDetailOut(ProjectOut):
    sites: list[SiteOut] = []


# ---- Metrics ----
class SiteMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    metric_type: MetricType
    recorded_on: date
    value: float


class SiteWithMetricsOut(SiteOut):
    metrics: list[SiteMetricOut] = []
