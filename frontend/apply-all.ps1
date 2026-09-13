$ErrorActionPreference = "Stop"
$frontend = "C:\Users\Administrator\Documents\AMR_NEXUS\frontend"
$backend  = "C:\Users\Administrator\Documents\AMR_NEXUS\backend\amr_nexus_ml"
$analyticsFile = Join-Path $backend "src\api\routers\analytics.py"
$clientFile    = Join-Path $frontend "src\api\client.js"

Write-Host "`n[1/2] Backend: analytics.py" -ForegroundColor Yellow
$analytics = Get-Content $analyticsFile -Raw

if ($analytics -notmatch "from datetime import") {
    $analytics = "from datetime import date`n" + $analytics
    Write-Host "      Prepended datetime import" -ForegroundColor Green
}
if ($analytics -notmatch "from sqlalchemy import func") {
    $analytics = "from sqlalchemy import func`n" + $analytics
    Write-Host "      Prepended func import" -ForegroundColor Green
}

if ($analytics -match "/month_range") {
    Write-Host "      /month_range already present" -ForegroundColor Green
} else {
    $endpoint = @"


@router.get("/month_range")
def get_month_range(db: Session = Depends(get_db)):
    min_date, max_date = db.query(
        func.min(AMRIsolateRecord.sample_collection_date),
        func.max(AMRIsolateRecord.sample_collection_date),
    ).first()

    if not min_date or not max_date:
        current = date.today().replace(day=1).isoformat()[:7]
        return {"min": current, "max": current, "available": False}

    return {
        "min": min_date.isoformat()[:7],
        "max": max_date.isoformat()[:7],
        "available": True,
    }
"@
    Add-Content -Path $analyticsFile -Value $endpoint -Encoding UTF8
    Write-Host "      Appended /month_range endpoint" -ForegroundColor Green
}

Write-Host "`n[2/2] Frontend: client.js" -ForegroundColor Yellow
$client = Get-Content $clientFile -Raw

if ($client -match "getMonthRange") {
    Write-Host "      getMonthRange already present" -ForegroundColor Green
} else {
    $pattern = "(getSummary:\s*\(params = ''\)\s*=>\s*fetch\([^\r\n]*\),)"
    if ($client -match $pattern) {
        $replacement = "`$1`n  getMonthRange: () => fetch(``$`{API_BASE}/analytics/month_range``).then(handleResponse),"
        $client = [regex]::Replace($client, $pattern, $replacement, 1)
        Set-Content -Path $clientFile -Value $client -Encoding UTF8
        Write-Host "      Inserted getMonthRange" -ForegroundColor Green
    } else {
        Write-Host "      ERROR: could not find getSummary line" -ForegroundColor Red
    }
}

Write-Host "`nVerification:" -ForegroundColor Cyan
$ok1 = (Get-Content $analyticsFile -Raw) -match "/month_range"
$ok2 = (Get-Content $clientFile -Raw) -match "getMonthRange"
if ($ok1) { Write-Host "  OK  analytics.py" -ForegroundColor Green } else { Write-Host "  FAIL analytics.py" -ForegroundColor Red }
if ($ok2) { Write-Host "  OK  client.js" -ForegroundColor Green } else { Write-Host "  FAIL client.js" -ForegroundColor Red }
