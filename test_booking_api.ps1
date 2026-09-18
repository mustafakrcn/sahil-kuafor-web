# Randevu API test scripti
$apiBase = "https://admin-omega-eight-42.vercel.app"

Write-Host "=== RANDEVU API TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: OPTIONS (CORS preflight)
Write-Host "1. CORS Preflight (OPTIONS) testi..." -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$apiBase/api/web-appointment" -Method OPTIONS -TimeoutSec 20 -UseBasicParsing
    Write-Host "   ✅ OPTIONS STATUS: $($r.StatusCode)" -ForegroundColor Green
    $corsHeader = $r.Headers["Access-Control-Allow-Origin"]
    Write-Host "   CORS Origin: $corsHeader"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "   ❌ OPTIONS ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status Code: $statusCode"
}

Write-Host ""

# Test 2: POST - Geçerli randevu
Write-Host "2. POST - Geçerli randevu testi..." -ForegroundColor Yellow
$body = @{
    name    = "Test Kullanici"
    phone   = "05001234567"
    date    = "2026-09-25"
    time    = "10:00"
    service = "Sakal Sekillendirme"
    notes   = "API test"
} | ConvertTo-Json

try {
    $r = Invoke-WebRequest -Uri "$apiBase/api/web-appointment" -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 30 -UseBasicParsing
    Write-Host "   ✅ POST STATUS: $($r.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($r.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   ❌ POST ERROR Status: $statusCode" -ForegroundColor Red
        Write-Host "   Response Body: $errorBody"
    } catch {
        Write-Host "   ❌ POST ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: POST - Geçersiz servis adı (Türkçe özel karakter)
Write-Host "3. POST - Türkçe servis adı testi..." -ForegroundColor Yellow
$body2 = @{
    name    = "Test Kullanici"
    phone   = "05001234567"
    date    = "2026-09-26"
    time    = "11:00"
    service = "Sakal Sekillendirme"
    notes   = ""
} | ConvertTo-Json -Compress

try {
    $r = Invoke-WebRequest -Uri "$apiBase/api/web-appointment" -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($body2)) `
        -TimeoutSec 30 -UseBasicParsing
    Write-Host "   STATUS: $($r.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($r.Content)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Status: $statusCode"
        Write-Host "   Body: $errorBody"
    } catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== TEST TAMAMLANDI ===" -ForegroundColor Cyan
