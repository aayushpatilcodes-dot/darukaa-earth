def test_register_and_login(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "jane@example.com", "full_name": "Jane Doe", "password": "supersecret1"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["email"] == "jane@example.com"
    assert "access_token" in body

    resp = client.post(
        "/api/auth/login", json={"email": "jane@example.com", "password": "supersecret1"}
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "jane@example.com"


def test_login_rejects_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "bob@example.com", "full_name": "Bob", "password": "correctpassword"},
    )
    resp = client.post(
        "/api/auth/login", json={"email": "bob@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401


def test_duplicate_registration_rejected(client):
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "somepassword1"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409
