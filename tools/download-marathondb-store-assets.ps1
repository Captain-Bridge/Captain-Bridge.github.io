[CmdletBinding()]
param(
    [string]$OutputDirectory = "source/marathon-lore/content/docs/store/imports/marathondb-store-all-$(Get-Date -Format 'yyyy-MM-dd')",
    [int]$RequestDelayMilliseconds = 150
)

$ErrorActionPreference = 'Stop'
$apiBase = 'https://marathonapi.gdb.gg'
$siteBase = 'https://marathondb.gg'
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputDirectory))
$assetsRoot = Join-Path $outputRoot 'assets'

function Invoke-MarathonRequest {
    param([Parameter(Mandatory)][string]$Uri)

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            $result = Invoke-RestMethod -Uri $Uri -Headers @{ 'User-Agent' = 'myblog-marathon-lore-asset-import/1.0' }
            Start-Sleep -Milliseconds $RequestDelayMilliseconds
            return $result
        } catch {
            if ($attempt -eq 3) { throw }
            Start-Sleep -Milliseconds (500 * $attempt)
        }
    }
}

function Get-PagedRecords {
    param([Parameter(Mandatory)][string]$Endpoint)

    $first = Invoke-MarathonRequest "$apiBase/api/${Endpoint}?page=1&per_page=100"
    $records = @($first.data)
    $pageCount = [int]($first.total_pages ?? 1)
    for ($page = 2; $page -le $pageCount; $page++) {
        $response = Invoke-MarathonRequest "$apiBase/api/${Endpoint}?page=$page&per_page=100"
        $records += @($response.data)
    }
    return $records
}

function Test-StoreRecord {
    param([Parameter(Mandatory)]$Record)

    $acquisitionText = @(
        $Record.acquisition_note,
        $Record.acquisition_summary,
        $Record.acquisition_detail
    ) -join ' '

    return (
        $Record.source -eq 'store' -or
        $Record.source_type -eq 'store' -or
        $null -ne $Record.price -or
        $null -ne $Record.cost -or
        $acquisitionText -match '(?i)cosmetics store|premium store|store purchase|purchas(?:e|ed|able).*store|available.*store|from the store|part of.+(?:pack|bundle)'
    )
}

function Get-ImageUrls {
    param($Value)

    $found = [System.Collections.Generic.List[string]]::new()
    function Visit-Value {
        param($Current)

        if ($null -eq $Current) { return }
        if ($Current -is [string]) {
            if ($Current -match '(?i)(?:^https?://|^/).+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?.*)?$') {
                $found.Add($Current)
            }
            return
        }
        if ($Current -is [System.Collections.IDictionary]) {
            foreach ($entry in $Current.GetEnumerator()) { Visit-Value $entry.Value }
            return
        }
        if ($Current -is [System.Collections.IEnumerable] -and $Current -isnot [System.Management.Automation.PSCustomObject]) {
            foreach ($item in $Current) { Visit-Value $item }
            return
        }
        foreach ($property in $Current.PSObject.Properties) { Visit-Value $property.Value }
    }

    Visit-Value $Value
    return @($found | Sort-Object -Unique)
}

function Resolve-AssetUrl {
    param([Parameter(Mandatory)][string]$Url)

    if ($Url.StartsWith('/')) { return "$apiBase$Url" }
    return $Url
}

function Get-LocalAssetPath {
    param([Parameter(Mandatory)][string]$Url)

    $uri = [Uri](Resolve-AssetUrl $Url)
    $hostDirectory = $uri.Host -replace '[^a-zA-Z0-9.-]', '_'
    $relativePath = [Uri]::UnescapeDataString($uri.AbsolutePath).TrimStart('/')
    $segments = $relativePath -split '/' | ForEach-Object { $_ -replace '[<>:"|?*]', '_' }
    return Join-Path $assetsRoot (Join-Path $hostDirectory (Join-Path $segments[0] ($segments[1..($segments.Count - 1)] -join [System.IO.Path]::DirectorySeparatorChar)))
}

function Download-Asset {
    param([Parameter(Mandatory)][string]$Url)

    $resolvedUrl = Resolve-AssetUrl $Url
    $localPath = Get-LocalAssetPath $resolvedUrl
    $localDirectory = Split-Path -Parent $localPath
    New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null

    if (-not (Test-Path -LiteralPath $localPath)) {
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            try {
                Invoke-WebRequest -UseBasicParsing -Uri $resolvedUrl -OutFile $localPath -Headers @{ 'User-Agent' = 'myblog-marathon-lore-asset-import/1.0' }
                Start-Sleep -Milliseconds $RequestDelayMilliseconds
                break
            } catch {
                if ($attempt -eq 3) { throw }
                Start-Sleep -Milliseconds (500 * $attempt)
            }
        }
    }

    $file = Get-Item -LiteralPath $localPath
    return [ordered]@{
        sourceUrl = $resolvedUrl
        localPath = [System.IO.Path]::GetRelativePath($outputRoot, $localPath).Replace('\', '/')
        bytes = $file.Length
    }
}

$categoryDefinitions = @(
    [ordered]@{ name = 'runner-skins'; endpoint = 'runner-skins'; detailEndpoint = 'runner-skins'; pagePath = 'runner-skins' },
    [ordered]@{ name = 'weapon-skins'; endpoint = 'skins'; detailEndpoint = 'skins'; pagePath = 'weapon-skins' },
    [ordered]@{ name = 'stickers'; endpoint = 'stickers'; detailEndpoint = 'stickers'; pagePath = 'stickers' },
    [ordered]@{ name = 'backgrounds'; endpoint = 'backgrounds'; detailEndpoint = 'backgrounds'; pagePath = 'backgrounds' },
    [ordered]@{ name = 'charms'; endpoint = 'charms'; detailEndpoint = 'charms'; pagePath = 'charms' },
    [ordered]@{ name = 'emblems'; endpoint = 'emblems'; detailEndpoint = 'emblems'; pagePath = 'emblems' }
)

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
$manifestRecords = [System.Collections.Generic.List[object]]::new()
$failures = [System.Collections.Generic.List[object]]::new()
$seenAssets = @{}
$categorySummary = [System.Collections.Generic.List[object]]::new()

foreach ($category in $categoryDefinitions) {
    Write-Host "Reading $($category.name)..."
    $allRecords = @(Get-PagedRecords $category.endpoint)
    $storeRecords = @($allRecords | Where-Object { Test-StoreRecord $_ })
    $categorySummary.Add([ordered]@{
        category = $category.name
        totalRecords = $allRecords.Count
        storeRecords = $storeRecords.Count
    })

    foreach ($record in $storeRecords) {
        $slug = [string]$record.slug
        $encodedSlug = [Uri]::EscapeDataString($slug)
        $apiUrl = "$apiBase/api/$($category.detailEndpoint)/$encodedSlug"
        $detail = $null
        try {
            $detailResponse = Invoke-MarathonRequest $apiUrl
            $detail = $detailResponse.data ?? $detailResponse
        } catch {
            $failures.Add([ordered]@{ category = $category.name; slug = $slug; stage = 'detail'; url = $apiUrl; error = $_.Exception.Message })
        }

        $urls = @(Get-ImageUrls @($record, $detail))
        $assets = [System.Collections.Generic.List[object]]::new()
        foreach ($url in $urls) {
            $resolvedUrl = Resolve-AssetUrl $url
            try {
                if (-not $seenAssets.ContainsKey($resolvedUrl)) {
                    $downloadedAsset = Download-Asset $resolvedUrl
                    $seenAssets[$resolvedUrl] = $downloadedAsset
                }
                $assets.Add($seenAssets[$resolvedUrl])
            } catch {
                $failures.Add([ordered]@{ category = $category.name; slug = $slug; stage = 'asset'; url = $resolvedUrl; error = $_.Exception.Message })
            }
        }

        $manifestRecords.Add([ordered]@{
            category = $category.name
            slug = $slug
            name = $record.name
            sourcePage = "$siteBase/$($category.pagePath)/$encodedSlug/"
            apiUrl = $apiUrl
            listRecord = $record
            detailRecord = $detail
            assets = @($assets)
        })
    }
}

$manifest = [ordered]@{
    generatedAt = (Get-Date).ToString('o')
    source = [ordered]@{
        site = $siteBase
        api = $apiBase
        affiliation = 'Community database; not affiliated with or endorsed by Bungie'
    }
    selection = 'Records marked as store, containing a price/cost, or explicitly describing store/bundle purchase in acquisition fields'
    integratedIntoStore = $false
    categories = @($categorySummary)
    recordCount = $manifestRecords.Count
    uniqueAssetCount = $seenAssets.Count
    records = @($manifestRecords)
}

$manifest | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $outputRoot 'manifest.json') -Encoding utf8
$failures | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $outputRoot 'failures.json') -Encoding utf8

$summary = [ordered]@{
    outputDirectory = $outputRoot
    records = $manifestRecords.Count
    uniqueAssets = $seenAssets.Count
    failures = $failures.Count
    bytes = (Get-ChildItem -LiteralPath $assetsRoot -Recurse -File | Measure-Object Length -Sum).Sum
}
$summary | ConvertTo-Json
