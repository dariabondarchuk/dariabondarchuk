# Применение миграций и seed к БД Render (запускать из любой папки)
$ErrorActionPreference = "Stop"
$backend = "C:\Users\Asus\pdn-registry\pdn-registry\backend"

if (-not (Test-Path "$backend\package.json")) {
    Write-Host "Не найден backend: $backend"
    exit 1
}

Set-Location $backend
Write-Host "Папка: $(Get-Location)"

if (-not $env:DATABASE_URL -or $env:DATABASE_URL -match "USER:PASSWORD|HOST/DB") {
    Write-Host ""
    Write-Host "Сначала задайте РЕАЛЬНЫЙ DATABASE_URL из Render:"
    Write-Host "  Dashboard → PostgreSQL → Connections → External Database URL"
    Write-Host "  Добавьте в конец: ?sslmode=require  (если его ещё нет)"
    Write-Host ""
    Write-Host 'Пример:'
    Write-Host '  $env:DATABASE_URL="postgresql://pdn_xxx:xxxx@dpg-xxxxx-a.oregon-postgres.render.com/pdn_xxx?sslmode=require"'
    Write-Host "Затем снова: .\seed-render.ps1"
    exit 1
}

Write-Host "migrate deploy..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "db:seed..."
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Готово. Логин: admin@samolet.ru / admin123"
Write-Host "Откройте https://pdn-registry.onrender.com/login"
