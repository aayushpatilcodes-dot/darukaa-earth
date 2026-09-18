"""Seed the database with a demo user, project, and sites for the live demo.

Run with: python -m app.seed
"""

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.geo import geojson_to_wkb, polygon_area_hectares
from app.models import Project, ProjectType, Site, User
from app.routers.sites import _seed_mock_metrics

DEMO_EMAIL = "demo@darukaa.earth"
DEMO_PASSWORD = "DarukaaDemo123!"

# A small forested area near Dehradun, India — used as an illustrative
# reforestation/carbon project site (see README > Data Sources).
SITE_POLYGONS = [
    {
        "name": "Rajaji Buffer Plot A",
        "coordinates": [
            [
                [78.0322, 30.0668],
                [78.0410, 30.0668],
                [78.0410, 30.0730],
                [78.0322, 30.0730],
                [78.0322, 30.0668],
            ]
        ],
    },
    {
        "name": "Rajaji Buffer Plot B",
        "coordinates": [
            [
                [78.0450, 30.0600],
                [78.0540, 30.0600],
                [78.0540, 30.0660],
                [78.0450, 30.0660],
                [78.0450, 30.0600],
            ]
        ],
    },
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if not user:
            user = User(
                email=DEMO_EMAIL,
                full_name="Demo Administrator",
                hashed_password=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")

        project = db.query(Project).filter(Project.owner_id == user.id).first()
        if not project:
            project = Project(
                name="Rajaji Reforestation Initiative",
                description=(
                    "Community-led reforestation and biodiversity monitoring "
                    "project bordering Rajaji National Park."
                ),
                project_type=ProjectType.mixed,
                owner_id=user.id,
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            for polygon in SITE_POLYGONS:
                geojson = {"type": "Polygon", "coordinates": polygon["coordinates"]}
                site = Site(
                    project_id=project.id,
                    name=polygon["name"],
                    description="Demo monitoring site with simulated satellite-derived metrics.",
                    geom=geojson_to_wkb(geojson),
                    area_hectares=polygon_area_hectares(geojson),
                )
                db.add(site)
                db.commit()
                db.refresh(site)
                _seed_mock_metrics(db, site)

            print(f"Created demo project '{project.name}' with {len(SITE_POLYGONS)} sites.")
        else:
            print("Demo data already present, skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
