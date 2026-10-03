"""Tests for the Sampling Sites module (PR #6)."""

import uuid

VALID_USER = {"username": "admin@amrnexus.com", "password": "ChangeMe123!"}


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def test_list_sites_requires_auth(client):
    r = client.get("/modules/sampling-sites")
    assert r.status_code == 401, r.text


def test_list_sites_with_token(client, auth_headers):
    r = client.get("/modules/sampling-sites", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_create_site_as_admin(client, auth_headers):
    payload = {
        "name": _unique("Farm"),
        "site_type": "farm",
        "sector": "animal",
        "county": "Kiambu",
        "sub_county": "Ruiru",
        "latitude": -1.15,
        "longitude": 36.96,
        "owner_name": "Test Owner",
    }
    r = client.post("/modules/sampling-sites", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == payload["name"]
    assert body["site_type"] == "farm"
    assert body["sector"] == "animal"
    assert body["is_active"] is True
    assert body["id"] > 0


def test_create_site_invalid_site_type(client, auth_headers):
    payload = {"name": _unique("Bad"), "site_type": "spaceship"}
    r = client.post("/modules/sampling-sites", json=payload, headers=auth_headers)
    assert r.status_code == 422, r.text


def test_create_site_invalid_latitude(client, auth_headers):
    payload = {
        "name": _unique("BadLat"),
        "latitude": 200.0,  # out of range
    }
    r = client.post("/modules/sampling-sites", json=payload, headers=auth_headers)
    assert r.status_code == 422, r.text


def test_get_site(client, auth_headers):
    payload = {"name": _unique("Clinic"), "site_type": "clinic", "county": "Nairobi"}
    created = client.post("/modules/sampling-sites", json=payload, headers=auth_headers).json()
    r = client.get(f"/modules/sampling-sites/{created['id']}", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == created["id"]


def test_get_site_not_found(client, auth_headers):
    r = client.get("/modules/sampling-sites/999999", headers=auth_headers)
    assert r.status_code == 404, r.text


def test_update_site(client, auth_headers):
    payload = {"name": _unique("Update me"), "county": "Nairobi"}
    created = client.post("/modules/sampling-sites", json=payload, headers=auth_headers).json()
    r = client.patch(
        f"/modules/sampling-sites/{created['id']}",
        json={"owner_contact": "+254700000000"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["owner_contact"] == "+254700000000"


def test_deactivate_site(client, auth_headers):
    payload = {"name": _unique("Deactivate me"), "county": "Nairobi"}
    created = client.post("/modules/sampling-sites", json=payload, headers=auth_headers).json()
    r = client.post(
        f"/modules/sampling-sites/{created['id']}/deactivate",
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is False

    # Active-only list should not include it
    r = client.get("/modules/sampling-sites?active_only=true", headers=auth_headers)
    ids = [s["id"] for s in r.json()]
    assert created["id"] not in ids


def test_site_isolates_empty(client, auth_headers):
    """Triangulation endpoint works even with no isolates linked."""
    payload = {"name": _unique("Empty site"), "county": "Nairobi"}
    created = client.post("/modules/sampling-sites", json=payload, headers=auth_headers).json()
    r = client.get(f"/modules/sampling-sites/{created['id']}/isolates", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_site_isolates_not_found(client, auth_headers):
    r = client.get("/modules/sampling-sites/999999/isolates", headers=auth_headers)
    assert r.status_code == 404, r.text
