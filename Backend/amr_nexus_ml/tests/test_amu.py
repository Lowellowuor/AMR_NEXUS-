"""Tests for the AMU/AMC module (PR #2)."""
import uuid

VALID_USER = {"username": "admin@amrnexus.com", "password": "ChangeMe123!"}


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def test_list_drugs_requires_auth(client):
    r = client.get("/modules/amu/drugs")
    assert r.status_code == 401, r.text


def test_list_drugs_with_token(client, auth_headers):
    r = client.get("/modules/amu/drugs", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_create_drug_as_admin(client, auth_headers):
    payload = {
        "name": _unique("TestDrug"),
        "who_category": "Access",
        "route": "oral",
    }
    r = client.post("/modules/amu/drugs", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == payload["name"]
    assert body["id"] > 0


def test_create_consumption_as_admin(client, auth_headers):
    drug_payload = {"name": _unique("TestDrug")}
    r = client.post("/modules/amu/drugs", json=drug_payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    drug_id = r.json()["id"]

    payload = {
        "drug_id": drug_id,
        "county": "Nairobi",
        "sector": "animal",
        "species": "cattle",
        "quantity": 500,
        "unit": "mg",
        "period_start": "2026-01-01T00:00:00",
        "period_end": "2026-03-31T23:59:59",
    }
    r = client.post("/modules/amu/consumption", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["county"] == "Nairobi"
    assert body["sector"] == "animal"
    assert float(body["quantity"]) == 500.0


def test_create_consumption_unknown_drug(client, auth_headers):
    payload = {
        "drug_id": 999999,
        "county": "Nairobi",
        "sector": "human",
        "quantity": 1,
        "unit": "mg",
        "period_start": "2026-01-01T00:00:00",
        "period_end": "2026-01-31T00:00:00",
    }
    r = client.post("/modules/amu/consumption", json=payload, headers=auth_headers)
    assert r.status_code == 400, r.text


def test_list_consumption_filterable(client, auth_headers):
    r = client.get(
        "/modules/amu/consumption?county=Nairobi&limit=10",
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_summary_valid_dimension(client, auth_headers):
    r = client.get("/modules/amu/summary?dimension=sector", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["dimension"] == "sector"
    assert "buckets" in body


def test_summary_invalid_dimension(client, auth_headers):
    r = client.get("/modules/amu/summary?dimension=bogus", headers=auth_headers)
    assert r.status_code == 400, r.text


def test_trend(client, auth_headers):
    r = client.get("/modules/amu/trend", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "points" in body
