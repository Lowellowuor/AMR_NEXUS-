"""Tests for role-based alert routing (PR #5)."""


def test_list_rules_requires_auth(client):
    r = client.get("/modules/role-routing")
    assert r.status_code == 401, r.text


def test_list_rules_with_token(client, auth_headers):
    r = client.get("/modules/role-routing", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    # Defaults seed 4 roles x 3 channels = 12 rows
    assert len(body) == 12
    roles = {row["role"] for row in body}
    channels = {row["channel"] for row in body}
    assert roles == {"admin", "analyst", "clinician", "viewer"}
    assert channels == {"email", "sms", "desktop"}


def test_viewer_sms_disabled_by_default(client, auth_headers):
    r = client.get("/modules/role-routing", headers=auth_headers)
    body = r.json()
    viewer_sms = next(
        (row for row in body if row["role"] == "viewer" and row["channel"] == "sms"),
        None,
    )
    assert viewer_sms is not None
    assert viewer_sms["enabled"] is False


def test_update_rule_as_admin(client, auth_headers):
    r = client.get("/modules/role-routing", headers=auth_headers)
    body = r.json()
    rule = next(row for row in body if row["role"] == "clinician" and row["channel"] == "email")
    rule_id = rule["id"]

    r = client.patch(
        f"/modules/role-routing/{rule_id}",
        json={"min_severity": "critical"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["min_severity"] == "critical"


def test_update_rule_invalid_severity(client, auth_headers):
    r = client.get("/modules/role-routing", headers=auth_headers)
    rule_id = r.json()[0]["id"]

    r = client.patch(
        f"/modules/role-routing/{rule_id}",
        json={"min_severity": "bogus"},
        headers=auth_headers,
    )
    assert r.status_code == 422, r.text


def test_update_rule_not_found(client, auth_headers):
    r = client.patch(
        "/modules/role-routing/999999",
        json={"enabled": False},
        headers=auth_headers,
    )
    assert r.status_code == 404, r.text


def test_reset_defaults(client, auth_headers):
    # First mutate a rule
    r = client.get("/modules/role-routing", headers=auth_headers)
    rule_id = r.json()[0]["id"]
    client.patch(
        f"/modules/role-routing/{rule_id}",
        json={"enabled": False, "min_severity": "critical"},
        headers=auth_headers,
    )

    # Reset
    r = client.post(
        "/modules/role-routing/reset-defaults",
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["restored"] == 12

    # Confirm count again
    r = client.get("/modules/role-routing", headers=auth_headers)
    assert len(r.json()) == 12


def test_role_allows_helper_defaults(client, auth_headers):
    """role_allows returns True for unconfigured roles (fail-open)."""
    from src.database import SessionLocal
    from src.modules.role_routing.service import role_allows

    db = SessionLocal()
    try:
        # Unconfigured role name - should fail open
        assert role_allows(db, "ghost", "email", "critical") is True
        # Configured role with low threshold - should allow
        assert role_allows(db, "admin", "email", "low") is True
        # Configured role with high threshold - should deny low severity
        assert role_allows(db, "clinician", "email", "low") is False
        # Disabled channel - should deny regardless of severity
        assert role_allows(db, "viewer", "sms", "critical") is False
    finally:
        db.close()
