def test_health_returns_200(client):
    r = client.get("/health")
    assert r.status_code == 200, r.text


def test_health_reports_status(client):
    body = client.get("/health").json()
    assert body.get("status") == "healthy"


def test_health_reports_services(client):
    body = client.get("/health").json()
    services = body.get("services", {})
    assert "http_engine" in services
    assert services["http_engine"] == "online"
