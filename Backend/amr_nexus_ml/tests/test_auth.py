VALID_USER = {"username": "admin@amrnexus.com", "password": "ChangeMe123!"}


def test_login_with_valid_credentials(client):
    r = client.post("/auth/login", data=VALID_USER)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "access_token" in body
    assert isinstance(body["access_token"], str)
    assert len(body["access_token"]) > 20


def test_login_with_wrong_password_fails(client):
    r = client.post(
        "/auth/login",
        data={"username": "admin@amrnexus.com", "password": "wrong-password"},
    )
    assert r.status_code in (400, 401), r.text


def test_login_with_unknown_user_fails(client):
    r = client.post(
        "/auth/login",
        data={"username": "nobody@example.com", "password": "whatever"},
    )
    assert r.status_code in (400, 401, 404), r.text


def test_me_requires_authentication(client):
    r = client.get("/me")
    assert r.status_code == 401, r.text


def test_me_returns_current_user(client, auth_headers):
    r = client.get("/me", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("email") == "admin@amrnexus.com"
    assert body.get("role") == "admin"
    assert "id" in body


def test_me_rejects_malformed_token(client):
    r = client.get("/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code in (401, 403), r.text
