# Complete Environment Setup Script
Write-Host "=== Environment Setup ===" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"

# Check if .env exists
if (Test-Path $envPath) {
    Write-Host "`n⚠️  .env file already exists!" -ForegroundColor Yellow
    Write-Host "Current content:" -ForegroundColor Gray
    Get-Content $envPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    $action = Read-Host "`nWhat do you want to do? (1=Keep existing, 2=Overwrite, 3=Exit)"
    if ($action -eq "3") { exit }
    if ($action -eq "1") {
        Write-Host "Keeping existing .env file" -ForegroundColor Green
        $skipCreate = $true
    }
}

if (-not $skipCreate) {
    # Get database password
    Write-Host "`n📝 Database Configuration:" -ForegroundColor Yellow
    $dbPassword = Read-Host "Enter PostgreSQL password (default: 12345678)" 
    if ([string]::IsNullOrWhiteSpace($dbPassword)) {
        $dbPassword = "12345678"
    }
    
    $dbUser = Read-Host "Enter PostgreSQL username (default: postgres)"
    if ([string]::IsNullOrWhiteSpace($dbUser)) {
        $dbUser = "postgres"
    }
    
    $dbName = Read-Host "Enter database name (default: smart_accounts)"
    if ([string]::IsNullOrWhiteSpace($dbName)) {
        $dbName = "smart_accounts"
    }
    
    # Create .env content
    $envContent = @"
# Database Connection
# PostgreSQL Database URL
DATABASE_URL="postgresql://$dbUser`:$dbPassword@localhost:5432/$dbName"

# Node Environment
NODE_ENV="development"

# Optional: JWT Secret (for future use)
# JWT_SECRET="your-secret-key-here"
"@
    
    try {
        # Remove read-only if exists
        if (Test-Path $envPath) {
            $file = Get-Item $envPath
            $file.IsReadOnly = $false
        }
        
        # Create/Update .env file
        $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
        Write-Host "`n✅ .env file created/updated successfully!" -ForegroundColor Green
        Write-Host "Location: $envPath" -ForegroundColor Gray
        
        # Set environment variable for current session
        $env:DATABASE_URL = "postgresql://$dbUser`:$dbPassword@localhost:5432/$dbName"
        Write-Host "✅ Environment variable set for current session" -ForegroundColor Green
        
    } catch {
        Write-Host "`n❌ Error: $_" -ForegroundColor Red
        Write-Host "`nManual steps:" -ForegroundColor Yellow
        Write-Host "1. Create .env file in: $projectRoot" -ForegroundColor White
        Write-Host "2. Add this content:" -ForegroundColor White
        Write-Host $envContent -ForegroundColor Gray
        exit 1
    }
}

# Validate Prisma schema
Write-Host "`n🔍 Validating Prisma schema..." -ForegroundColor Yellow
try {
    Push-Location $projectRoot
    $validation = npx prisma validate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma schema is valid" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Prisma validation warnings (may need DATABASE_URL in environment)" -ForegroundColor Yellow
        Write-Host $validation -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not validate (this is OK if DATABASE_URL is set)" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Make sure PostgreSQL is running" -ForegroundColor White
Write-Host "2. Run: npx prisma generate" -ForegroundColor White
Write-Host "3. Run: npx prisma migrate dev" -ForegroundColor White
Write-Host "4. Test: npm run db:test" -ForegroundColor White

Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
