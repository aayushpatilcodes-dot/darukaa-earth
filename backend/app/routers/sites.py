import hashlib
import math
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.database import get_db
from app.geo import geojson_to_wkb, polygon_area_hectares
from app.models import MetricType, Project, Site, SiteMetric, User
from app.schemas import SiteCreate, SiteMetricOut, SiteOut, SiteWithMetricsOut
from app.serializers import site_to_out

router = APIRouter(prefix="/api", tags=["sites"])


def _owned_project(db: Session, project_id: str, user: User) -> Project:
    project = (
        db.query(Project).filter(Project.id == project_id, Project.owner_id == user.id).first()
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.post(
    "/projects/{project_id}/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED
)
def create_site(
    project_id: str,
    payload: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SiteOut:
    _owned_project(db, project_id, current_user)

    geojson = payload.geometry.model_dump()
    try:
        geom = geojson_to_wkb(geojson)
        area = polygon_area_hectares(geojson)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid polygon: {exc}"
        ) from exc

    site = Site(
        project_id=project_id,
        name=payload.name,
        description=payload.description,
        geom=geom,
        area_hectares=area,
    )
    db.add(site)
    db.commit()
    db.refresh(site)

    _seed_mock_metrics(db, site)

    return site_to_out(site)


@router.get("/sites", response_model=list[SiteOut])
def list_all_sites(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[SiteOut]:
    """All sites across the current user's projects — used to populate the map view."""
    sites = (
        db.query(Site)
        .join(Project, Site.project_id == Project.id)
        .filter(Project.owner_id == current_user.id)
        .all()
    )
    return [site_to_out(s) for s in sites]


@router.get("/projects/{project_id}/sites", response_model=list[SiteOut])
def list_project_sites(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SiteOut]:
    _owned_project(db, project_id, current_user)
    sites = db.query(Site).filter(Site.project_id == project_id).all()
    return [site_to_out(s) for s in sites]


@router.get("/sites/{site_id}", response_model=SiteWithMetricsOut)
def get_site(
    site_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SiteWithMetricsOut:
    site = (
        db.query(Site)
        .options(selectinload(Site.metrics), selectinload(Site.project))
        .join(Project, Site.project_id == Project.id)
        .filter(Site.id == site_id, Project.owner_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    if not site.metrics:
        _seed_mock_metrics(db, site)
        db.refresh(site)

    base = site_to_out(site)
    metrics = [
        SiteMetricOut.model_validate(m) for m in sorted(site.metrics, key=lambda m: m.recorded_on)
    ]
    return SiteWithMetricsOut(**base.model_dump(), metrics=metrics)


@router.get("/sites/{site_id}/metrics", response_model=list[SiteMetricOut])
def get_site_metrics(
    site_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SiteMetricOut]:
    site = (
        db.query(Site)
        .join(Project, Site.project_id == Project.id)
        .filter(Site.id == site_id, Project.owner_id == current_user.id)
        .first()
    )
    if not site:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")

    metrics = (
        db.query(SiteMetric)
        .filter(SiteMetric.site_id == site_id)
        .order_by(SiteMetric.recorded_on)
        .all()
    )
    if not metrics:
        _seed_mock_metrics(db, site)
        metrics = (
            db.query(SiteMetric)
            .filter(SiteMetric.site_id == site_id)
            .order_by(SiteMetric.recorded_on)
            .all()
        )
    return [SiteMetricOut.model_validate(m) for m in metrics]


def _seed_mock_metrics(db: Session, site: Site, months: int = 12) -> None:
    """Deterministically generate a plausible monitoring time series for a
    newly created site. Real deployments would replace this with satellite
    or field-collected observations (see README > Data Sources).
    """
    seed_int = int(hashlib.sha256(site.id.encode()).hexdigest(), 16)
    today = date.today()
    start = today.replace(day=1) - timedelta(days=30 * months)

    for metric_type, base, amplitude, trend in (
        (MetricType.ndvi, 0.55, 0.08, 0.01),
        (MetricType.carbon_stock_tco2e, 120.0, 8.0, 6.0),
        (MetricType.biodiversity_index, 0.62, 0.05, 0.015),
        (MetricType.canopy_cover_pct, 48.0, 4.0, 1.2),
    ):
        for month_offset in range(months):
            recorded_on = (start + timedelta(days=30 * month_offset)).replace(day=1)
            phase = (seed_int % 360) + month_offset * 30
            seasonal = amplitude * math.sin(math.radians(phase))
            value = base + seasonal + trend * month_offset
            db.add(
                SiteMetric(
                    site_id=site.id,
                    metric_type=metric_type,
                    recorded_on=recorded_on,
                    value=round(value, 3),
                )
            )
    db.commit()
