# CORS ve API kapsamlı test
$apiBase = "https://admin-omega-eight-42.vercel.app"

Write-Host "=== CORS Origin Tests ===" -ForegroundColor Cyan

$origins = @("http://localhost:8080", "http://127.0.0.1:5500", "https://www.sahilkuafor.com", "null")
foreach ($origin in $origins) {
    try {
        $reqHeaders = @{ 
            "Origin" = $origin
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "Content-Type"
        }
        $r = Invoke-WebRequest -Uri "$apiBase/api/web-appointment" -Method OPTIONS -Headers $reqHeaders -TimeoutSec 15 -UseBasicParsing
        $allowOrigin = $r.Headers["Access-Control-Allow-Origin"]
        Write-Host "  Origin: $origin => Allow-Origin: $allowOrigin" -ForegroundColor $(if ($allowOrigin -eq "*" -or $allowOrigin -eq $origin) { "Green" } else { "Red" })
    } catch {
        $sc = $_.Exception.Response.StatusCode.value__
        Write-Host "  Origin: $origin => HTTP $sc" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Route.ts CORS Header Kontrolu ===" -ForegroundColor Cyan
# Doğrudan POST isteği ile response headerlarını kontrol et
try {
    $postBody = '{"name":"Test","phone":"05001234567","date":"2026-09-27","time":"10:00","service":"Sakal Sekillendirme"}'
    $reqHeaders2 = @{
        "Content-Type" = "application/json"
        "Origin" = "http://localhost:8080"
    }
    $r2 = Invoke-WebRequest -Uri "$apiBase/api/web-appointment" -Method POST -Headers $reqHeaders2 -Body $postBody -TimeoutSec 20 -UseBasicParsing
    Write-Host "  POST Status: $($r2.StatusCode)"
    Write-Host "  Access-Control-Allow-Origin: $($r2.Headers['Access-Control-Allow-Origin'])"
    Write-Host "  Response: $($r2.Content)"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    Write-Host "  Status: $sc"
    Write-Host "  Body: $body"
}

Write-Host ""
Write-Host "=== Supabase Baglanti Testi ===" -ForegroundColor Cyan
$supUrl = "https://xdbsuikweiqarwaxrmwf.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkYnN1aWt3ZWlxYXJ3YXhybXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNjYxMTAsImV4cCI6MjEwNDY0MjExMH0.J6-MZ-gYXxO2xAhA8GBs63t1-kEM73RjRyesCMYiotA"
try {
    $supHeaders = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    }
    $r3 = Invoke-WebRequest -Uri "$supUrl/rest/v1/appointments?limit=1&select=id,status,start_at" -Headers $supHeaders -TimeoutSec 15 -UseBasicParsing
    Write-Host "  Supabase Status: $($r3.StatusCode)" -ForegroundColor Green
    Write-Host "  Data: $($r3.Content.Substring(0, [Math]::Min(200, $r3.Content.Length)))"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    Write-Host "  Supabase ERROR Status: $sc" -ForegroundColor Red
    $stream = $_.Exception.Response.GetResponseStream()
    if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "  Error: $($reader.ReadToEnd())"
    }
}
