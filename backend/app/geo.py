"""Helpers for converting between GeoJSON and PostGIS geometry, and area math.

Area is computed with an equal-area (Mollweide) projection via pyproj-free
shapely transform approximation is avoided here for simplicity: we use a
local azimuthal equal-area approximation based on the polygon centroid,
which is accurate enough for typical project-site sizes (a few km^2).
"""

import math

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Polygon, mapping, shape

EARTH_RADIUS_M = 6_371_000.0


def geojson_to_wkb(geojson: dict) -> object:
    polygon: Polygon = shape(geojson)
    return from_shape(polygon, srid=4326)


def wkb_to_geojson(geom) -> dict:
    polygon: Polygon = to_shape(geom)
    return mapping(polygon)


def polygon_area_hectares(geojson: dict) -> float:
    """Approximate geodesic area using an equirectangular projection
    centered on the polygon's centroid — good enough for site-scale polygons.
    """
    polygon: Polygon = shape(geojson)
    lon0, lat0 = polygon.centroid.x, polygon.centroid.y
    lat0_rad = math.radians(lat0)

    def project(lon: float, lat: float) -> tuple[float, float]:
        x = math.radians(lon - lon0) * math.cos(lat0_rad) * EARTH_RADIUS_M
        y = math.radians(lat - lat0) * EARTH_RADIUS_M
        return x, y

    projected_coords = [project(x, y) for x, y in polygon.exterior.coords]
    projected_polygon = Polygon(projected_coords)
    area_m2 = abs(projected_polygon.area)
    return round(area_m2 / 10_000, 4)
