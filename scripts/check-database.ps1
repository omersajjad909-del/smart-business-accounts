# Database Connection Check Script
Write-Host "=== PostgreSQL Database Check ===" -ForegroundColor Cyan

# Check if port 5432 is open
Write-Host "`n1. Checking port 5432..." -ForegroundColor Yellow
$portCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
if ($portCheck.TcpTestSucceeded) {
    Write-Host "   ✅ Port 5432 is open" -ForegroundColor Green
} else {
    Write-Host "   ❌ Port 5432 is closed - PostgreSQL is not running" -ForegroundColor Red
}

# Check PostgreSQL services
Write-Host "`n2. Checking PostgreSQL services..." -ForegroundColor Yellow
$pgServices = Get-Service | Where-Object {$_.Name -like "*postgres*" -or $_.DisplayName -like "*PostgreSQL*"}
if ($pgServices) {
    foreach ($service in $pgServices) {
        $status = if ($service.Status -eq "Running") { "✅" } else { "❌" }
        Write-Host "   $status $($service.DisplayName): $($service.Status)" -ForegroundColor $(if ($service.Status -eq "Running") { "Green" } else { "Red" })
    }
} else {
    Write-Host "   ⚠️  No PostgreSQL services found" -ForegroundColor Yellow
}

# Check if psql is available
Write-Host "`n3. Checking PostgreSQL installation..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlPath) {
    Write-Host "   ✅ PostgreSQL client found: $($psqlPath.Source)" -ForegroundColor Green
} else {
    Write-Host "   ❌ PostgreSQL client not found in PATH" -ForegroundColor Red
}

# Test Prisma connection
Write-Host "`n4. Testing Prisma connection..." -ForegroundColor Yellow
try {
    $result = npx prisma db pull --schema=prisma/schema.prisma 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Prisma can connect to database" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Prisma connection failed" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error testing Prisma: $_" -ForegroundColor Red
}

Write-Host "`n=== Check Complete ===" -ForegroundColor Cyan
Write-Host "`nTo start PostgreSQL:" -ForegroundColor Yellow
Write-Host "1. Open Services (Win+R, type: services.msc)" -ForegroundColor White
Write-Host "2. Find 'PostgreSQL' service" -ForegroundColor White
Write-Host "3. Right-click → Start" -ForegroundColor White
Write-Host "`nOr use command (as Admin):" -ForegroundColor Yellow
Write-Host "net start postgresql-x64-XX" -ForegroundColor White
