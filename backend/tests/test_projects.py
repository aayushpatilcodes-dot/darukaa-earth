def _auth_headers(client, email="admin@example.com"):
    client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Admin", "password": "adminpassword1"},
    )
    resp = client.post("/api/auth/login", json={"email": email, "password": "adminpassword1"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_projects(client):
    headers = _auth_headers(client)

    resp = client.post(
        "/api/projects",
        json={"name": "Amazon Basin Restoration", "description": "Pilot", "project_type": "carbon"},
        headers=headers,
    )
    assert resp.status_code == 201
    project = resp.json()
    assert project["name"] == "Amazon Basin Restoration"
    assert project["site_count"] == 0

    resp = client.get("/api/projects", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_add_site_polygon_to_project(client):
    headers = _auth_headers(client, email="siteowner@example.com")
    project = client.post("/api/projects", json={"name": "Test Project"}, headers=headers).json()

    site_payload = {
        "name": "Plot 1",
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [78.03, 30.06],
                    [78.04, 30.06],
                    [78.04, 30.07],
                    [78.03, 30.07],
                    [78.03, 30.06],
                ]
            ],
        },
    }
    resp = client.post(f"/api/projects/{project['id']}/sites", json=site_payload, headers=headers)
    assert resp.status_code == 201
    site = resp.json()
    assert site["name"] == "Plot 1"
    assert site["area_hectares"] > 0

    resp = client.get(f"/api/sites/{site['id']}", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()["metrics"]) > 0


def test_projects_are_scoped_to_owner(client):
    headers_a = _auth_headers(client, email="a@example.com")
    headers_b = _auth_headers(client, email="b@example.com")

    client.post("/api/projects", json={"name": "Owner A Project"}, headers=headers_a)

    resp = client.get("/api/projects", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []
