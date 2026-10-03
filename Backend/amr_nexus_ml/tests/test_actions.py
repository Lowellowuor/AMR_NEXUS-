"""Tests for the Action layer (PR #4)."""

import uuid

VALID_USER = {"username": "admin@amrnexus.com", "password": "ChangeMe123!"}


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def test_list_actions_requires_auth(client):
    r = client.get("/modules/actions")
    assert r.status_code == 401, r.text


def test_create_action_as_admin(client, auth_headers):
    payload = {
        "title": _unique("Follow-up"),
        "source_type": "manual",
        "priority": "high",
        "county": "Nairobi",
    }
    r = client.post("/modules/actions", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == payload["title"]
    assert body["status"] == "open"
    assert body["priority"] == "high"
    assert body["id"] > 0


def test_create_action_with_alert_source(client, auth_headers):
    alert_id = str(uuid.uuid4())
    payload = {
        "title": _unique("Ack alert"),
        "source_type": "alert",
        "source_id": alert_id,
        "priority": "critical",
    }
    r = client.post("/modules/actions", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["source_type"] == "alert"
    assert body["source_id"] == alert_id


def test_create_action_invalid_source_type(client, auth_headers):
    payload = {"title": _unique("Bad"), "source_type": "bogus"}
    r = client.post("/modules/actions", json=payload, headers=auth_headers)
    assert r.status_code == 422, r.text


def test_get_action(client, auth_headers):
    payload = {"title": _unique("Fetch me")}
    created = client.post("/modules/actions", json=payload, headers=auth_headers).json()
    r = client.get(f"/modules/actions/{created['id']}", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert r.json()["id"] == created["id"]


def test_get_action_not_found(client, auth_headers):
    r = client.get("/modules/actions/999999", headers=auth_headers)
    assert r.status_code == 404, r.text


def test_update_action(client, auth_headers):
    payload = {"title": _unique("Update me")}
    created = client.post("/modules/actions", json=payload, headers=auth_headers).json()
    r = client.patch(
        f"/modules/actions/{created['id']}",
        json={"status": "in_progress", "priority": "critical"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "in_progress"
    assert body["priority"] == "critical"


def test_close_action(client, auth_headers):
    payload = {"title": _unique("Close me")}
    created = client.post("/modules/actions", json=payload, headers=auth_headers).json()
    r = client.post(
        f"/modules/actions/{created['id']}/close",
        json={"status": "done", "closing_note": "Handled on site"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "done"
    assert body["closing_note"] == "Handled on site"
    assert body["closed_at"] is not None


def test_list_actions_filters(client, auth_headers):
    r = client.get(
        "/modules/actions?status=open&priority=high&limit=10",
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_my_actions(client, auth_headers):
    r = client.get("/modules/actions/mine", headers=auth_headers)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)
