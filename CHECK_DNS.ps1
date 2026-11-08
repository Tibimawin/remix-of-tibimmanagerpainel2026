# DNS Check for Oneplayer Sites
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "DNS Resolution Test for Oneplayer" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$domains = @(
    "fhd1.oneplayer.site",
    "fhd2.oneplayer.site",
    "fhd3.oneplayer.site",
    "fhd4.oneplayer.site",
    "fhd5.oneplayer.site",
    "hd5.oneplayer.site",
    "shd1.oneplayer.site"
)

$successCount = 0
$failCount = 0

foreach ($domain in $domains) {
    Write-Host "Testing: $domain... " -NoNewline
    
    try {
        $result = Resolve-DnsName -Name $domain -ErrorAction Stop
        if ($result) {
            Write-Host "[OK] Resolved to: $($result.IPAddress)" -ForegroundColor Green
            $successCount++
        }
    }
    catch {
        Write-Host "[FAILED] DNS resolution failed" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed:  $failCount" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Cyan

if ($failCount -eq $domains.Count) {
    Write-Host ""
    Write-Host "⚠️  ALL DOMAINS FAILED DNS RESOLUTION!" -ForegroundColor Red
    Write-Host "This means the servers are likely offline or domains expired." -ForegroundColor Yellow
}
