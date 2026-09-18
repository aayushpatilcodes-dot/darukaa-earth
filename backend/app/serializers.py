"""Conversions from SQLAlchemy models (which hold raw PostGIS geometry) to
the Pydantic response schemas (which hold GeoJSON). Centralized here so the
projects and sites routers build identical payload shapes for a Site.
"""

from app.geo import wkb_to_geojson
from app.models import Project, Site
from app.schemas import ProjectOut, SiteOut


def site_to_out(site: Site) -> SiteOut:
    return SiteOut(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        description=site.description,
        geometry=wkb_to_geojson(site.geom),
        area_hectares=site.area_hectares,
        created_at=site.created_at,
    )


def project_to_out(project: Project) -> ProjectOut:
    out = ProjectOut.model_validate(project)
    out.site_count = len(project.sites)
    return out
