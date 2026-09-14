# Turns on email sign-in for /admin using Cloudflare Access, and prints the
# settings the site needs. Windows PowerShell version.
#
#     $env:CF_API_TOKEN  = '...'   # token with "Access: Apps and Policies - Edit"
#     $env:CF_ACCOUNT_ID = '...'   # shown on the Workers & Pages page
#     powershell -ExecutionPolicy Bypass -File scripts\setup-access.ps1 you@example.com helper@example.com
#
# Everyone listed on the command line may sign in.

param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Emails
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Api      = 'https://api.cloudflare.com/client/v4'
$AppName  = if ($env:APP_NAME)  { $env:APP_NAME }  else { 'Falkner Heritage blog editor' }
$SiteHost = if ($env:SITE_HOST) { $env:SITE_HOST } else { 'falknermsheritage.com' }

if (-not $env:CF_API_TOKEN) {
  Write-Host 'Set your API token first, for example:' -ForegroundColor Red
  Write-Host '    $env:CF_API_TOKEN = "your-token-here"'
  exit 1
}
if (-not $env:CF_ACCOUNT_ID) {
  Write-Host 'Set your account ID first, for example:' -ForegroundColor Red
  Write-Host '    $env:CF_ACCOUNT_ID = "your-account-id"'
  exit 1
}
if (-not $Emails -or $Emails.Count -eq 0) {
  Write-Host 'Give at least one email address, for example:' -ForegroundColor Red
  Write-Host '    powershell -ExecutionPolicy Bypass -File scripts\setup-access.ps1 you@example.com'
  exit 1
}

function Say($text) { Write-Host ''; Write-Host $text -ForegroundColor Cyan }

$headers = @{
  'Authorization' = "Bearer $($env:CF_API_TOKEN)"
  'Content-Type'  = 'application/json'
}

[object[]]$include = @()
foreach ($address in $Emails) {
  $trimmed = $address.Trim().ToLower()
  if ($trimmed) { $include += @{ email = @{ email = $trimmed } } }
}

Say "1. Creating the Access application for $SiteHost/admin ..."

[object[]]$policies = @(
  @{
    name       = 'Blog contributors'
    decision   = 'allow'
    precedence = 1
    include    = $include
  }
)

$payload = @{
  name                 = $AppName
  type                 = 'self_hosted'
  domain               = "$SiteHost/admin"
  session_duration     = '24h'
  app_launcher_visible = $false
  policies             = $policies
} | ConvertTo-Json -Depth 10

try {
  $created = Invoke-RestMethod -Method Post -Headers $headers `
    -Uri "$Api/accounts/$($env:CF_ACCOUNT_ID)/access/apps" -Body $payload
} catch {
  Write-Host 'Cloudflare refused that request:' -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message }
  exit 1
}

if (-not $created.success) {
  Write-Host 'Cloudflare returned an error:' -ForegroundColor Red
  $created.errors | ConvertTo-Json -Depth 10 | Write-Host
  exit 1
}

$aud = $created.result.aud

Say '2. Finding your Zero Trust team domain ...'
$team = ''
try {
  $org = Invoke-RestMethod -Method Get -Headers $headers `
    -Uri "$Api/accounts/$($env:CF_ACCOUNT_ID)/access/organizations"
  if ($org.success) { $team = $org.result.auth_domain }
} catch {
  # Not fatal - it is printed in the dashboard too.
}

if (-not $team) { $team = '<your-team>.cloudflareaccess.com' }

Say 'Done. Add these four settings to your Pages project'
Write-Host ''
Write-Host '  Workers & Pages -> your Pages project -> Settings -> Variables and Secrets'
Write-Host '  (add to BOTH Production and Preview)'
Write-Host ''
Write-Host "    ACCESS_TEAM_DOMAIN   $team"
Write-Host "    ACCESS_AUD           $aud"
Write-Host "    SITE_ORIGIN          https://$SiteHost"
Write-Host "    OWNER_EMAILS         $($Emails[0])"
Write-Host ''
Write-Host 'Then redeploy the Pages project once, and open:'
Write-Host "    https://$SiteHost/admin"
Write-Host ''
