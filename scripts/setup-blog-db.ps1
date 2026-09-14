# Creates the blog database and loads its tables. Windows PowerShell version.
#
# In PowerShell, from the folder this repository is in:
#     npx wrangler login
#     powershell -ExecutionPolicy Bypass -File scripts\setup-blog-db.ps1
#
# It is safe to run more than once.

$ErrorActionPreference = 'Continue'

$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'falkner-blog' }
$Root   = Split-Path -Parent $PSScriptRoot
$Schema = Join-Path $Root 'schema.sql'

function Say($text) { Write-Host ''; Write-Host $text -ForegroundColor Cyan }

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is needed. Install it from https://nodejs.org and try again.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $Schema)) {
  Write-Host "Could not find schema.sql at $Schema" -ForegroundColor Red
  exit 1
}

Say "1. Making sure a database called '$DbName' exists..."
& npx --yes wrangler d1 create $DbName
if ($LASTEXITCODE -ne 0) {
  Write-Host '   Could not create it. It most likely exists already, which is fine.' -ForegroundColor Yellow
}

Say '2. Creating the tables (posts, images, users)...'
& npx --yes wrangler d1 execute $DbName --remote --file $Schema --yes
if ($LASTEXITCODE -ne 0) {
  Write-Host '   That did not work. Check you are signed in with: npx wrangler login' -ForegroundColor Red
  exit 1
}

Say '3. Your databases (note the ID for the one above):'
& npx --yes wrangler d1 list

Write-Host @'

Next, in the Cloudflare dashboard:

  Workers & Pages  ->  your Pages project  ->  Settings  ->  Bindings
    Add binding  ->  D1 database
      Variable name : DB
      D1 database   : falkner-blog
    Save, for BOTH Production and Preview.

Then run scripts\setup-access.ps1 to turn on email sign-in.

'@
