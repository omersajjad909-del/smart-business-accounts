# Create .env file script
Write-Host "=== Creating .env File ===" -ForegroundColor Cyan

$envContent = @"
# Database Connection
# PostgreSQL Database URL
# Format: postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
DATABASE_URL="postgresql://postgres:12345678@localhost:5432/smart_accounts"

# Node Environment
NODE_ENV="development"

# Optional: JWT Secret (for future use)
# JWT_SECRET="your-secret-key-here"
"@

$envPath = Join-Path $PSScriptRoot "..\.env"

if (Test-Path $envPath) {
    Write-Host "⚠️  .env file already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Red
        exit
    }
}

try {
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
    Write-Host "✅ .env file created successfully!" -ForegroundColor Green
    Write-Host "Location: $envPath" -ForegroundColor Gray
    
    # Remove read-only attribute if exists
    $file = Get-Item $envPath -ErrorAction SilentlyContinue
    if ($file) {
        $file.IsReadOnly = $false
        Write-Host "✅ File permissions updated" -ForegroundColor Green
    }
    
    Write-Host "`n📝 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Update DATABASE_URL with your PostgreSQL password" -ForegroundColor White
    Write-Host "2. Run: npx prisma generate" -ForegroundColor White
    Write-Host "3. Run: npx prisma migrate dev" -ForegroundColor White
} catch {
    Write-Host "❌ Error creating .env file: $_" -ForegroundColor Red
    Write-Host "`nManual steps:" -ForegroundColor Yellow
    Write-Host "1. Create .env file in project root" -ForegroundColor White
    Write-Host "2. Add this content:" -ForegroundColor White
    Write-Host $envContent -ForegroundColor Gray
}
