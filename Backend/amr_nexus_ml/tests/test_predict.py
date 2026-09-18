VALID_RECORD = {
    "sector": "human",
    "sub_sector": "hospital",
    "pathogen_code": "Klebsiella pneumoniae",
    "specimen_type": "blood",
    "county": "Nairobi",
    "sub_county": "Kasarani",
    "antibiotic_class": "Carbapenem",
    "test_method": "Disk diffusion",
    "sample_month": 9,
    "sample_collection_date": "2026-09-15",
    "prior_antibiotic_exposure": False,
}


def test_predict_requires_auth(client):
    r = client.post("/api/v1/predict", json=VALID_RECORD)
    assert r.status_code == 401, r.text


def test_predict_returns_200(client, auth_headers):
    r = client.post("/api/v1/predict", json=VALID_RECORD, headers=auth_headers)
    assert r.status_code == 200, r.text


def test_predict_response_shape(client, auth_headers):
    r = client.post("/api/v1/predict", json=VALID_RECORD, headers=auth_headers)
    body = r.json()
    required = [
        "mdr_flag",
        "mdr_probability",
        "anomaly_detected",
        "anomaly_score",
        "shap_top_feature",
        "shap_value",
        "shap_summary",
        "source",
        "fallback_used",
        "calibration_applied",
        "model_version",
    ]
    for field in required:
        assert field in body, f"missing field: {field}"


def test_predict_probability_in_range(client, auth_headers):
    r = client.post("/api/v1/predict", json=VALID_RECORD, headers=auth_headers)
    body = r.json()
    prob = body["mdr_probability"]
    assert isinstance(prob, (int, float))
    assert 0.0 <= prob <= 1.0, f"probability out of range: {prob}"


def test_predict_source_is_valid(client, auth_headers):
    r = client.post("/api/v1/predict", json=VALID_RECORD, headers=auth_headers)
    body = r.json()
    assert body["source"] in ("ml", "fallback")
    assert isinstance(body["fallback_used"], bool)
    if body["source"] == "ml":
        assert body["fallback_used"] is False


def test_predict_returns_model_version(client, auth_headers):
    r = client.post("/api/v1/predict", json=VALID_RECORD, headers=auth_headers)
    body = r.json()
    assert isinstance(body["model_version"], str)
    assert len(body["model_version"]) > 0


def test_predict_rejects_missing_required_field(client, auth_headers):
    bad = dict(VALID_RECORD)
    del bad["pathogen_code"]
    r = client.post("/api/v1/predict", json=bad, headers=auth_headers)
    assert r.status_code == 422, r.text


def test_predict_rejects_invalid_sample_month(client, auth_headers):
    bad = dict(VALID_RECORD)
    bad["sample_month"] = 99
    r = client.post("/api/v1/predict", json=bad, headers=auth_headers)
    assert r.status_code == 422, r.text
