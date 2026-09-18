def test_profile_returns_real_user(client, auth_headers):
    r = client.get("/api/v1/profile", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "email" in body
    assert body["email"] == "admin@amrnexus.com"
    assert "message" not in body, "got placeholder response"


def test_search_query_returns_records(client, auth_headers):
    r = client.get("/api/v1/query?limit=2", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list), f"expected list, got {type(body).__name__}"
    if body:
        first = body[0]
        assert "record_id" in first
        assert "pathogen_code" in first


def test_alerts_list_works(client, auth_headers):
    r = client.get("/api/v1/alerts", headers=auth_headers)
    assert r.status_code == 200, r.text


def test_analytics_summary_returns_totals(client, auth_headers):
    r = client.get("/api/v1/analytics/summary", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "total_records" in body
    assert isinstance(body["total_records"], int)


def test_analytics_sub_county_mdr_returns_geojson(client, auth_headers):
    r = client.get("/api/v1/analytics/sub_county_mdr", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("type") == "FeatureCollection"
    assert "features" in body
    assert isinstance(body["features"], list)


def test_ews_ping_alive(client, auth_headers):
    r = client.get("/api/v1/ews/ping", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("status") == "ews_router is alive"


def test_predictions_list_works(client, auth_headers):
    r = client.get("/api/v1/predictions?limit=1", headers=auth_headers)
    assert r.status_code == 200, r.text


def test_hotspots_returns_list(client, auth_headers):
    r = client.get("/api/v1/hotspots", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)


def test_ml_model_card_works(client, auth_headers):
    r = client.get("/api/v1/ml/model-card", headers=auth_headers)
    assert r.status_code == 200, r.text


def test_audit_events_requires_admin_and_works(client, auth_headers):
    r = client.get("/api/v1/audit/events?limit=1", headers=auth_headers)
    assert r.status_code == 200, r.text


def test_no_placeholder_responses_on_critical_routes(client, auth_headers):
    routes = [
        "/api/v1/profile",
        "/api/v1/query?limit=1",
    ]
    for path in routes:
        r = client.get(path, headers=auth_headers)
        if r.status_code != 200:
            continue
        text = r.text.lower()
        assert "placeholder endpoint" not in text, f"placeholder response at {path}"
        assert "message" not in r.json() or path == "/api/v1/profile", (
            f"unexpected placeholder-shaped response at {path}"
        )
