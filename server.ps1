param(
  [int]$Port = 5500
)

$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  Write-Error "Failed to start listener on $prefix. Try a different port or run PowerShell as Administrator. Error: $($_.Exception.Message)"
  return
}
Write-Host "Serving $(Get-Location) on $prefix (Ctrl+C to stop)"

function Get-ContentType($ext) {
  switch -Regex ($ext) {
    '\.html$' { 'text/html; charset=utf-8'; break }
    '\.htm$' { 'text/html; charset=utf-8'; break }
    '\.js$' { 'application/javascript; charset=utf-8'; break }
    '\.css$' { 'text/css; charset=utf-8'; break }
    '\.json$' { 'application/json; charset=utf-8'; break }
    '\.png$' { 'image/png'; break }
    '\.jpg$' { 'image/jpeg'; break }
    '\.jpeg$' { 'image/jpeg'; break }
    '\.svg$' { 'image/svg+xml'; break }
    '\.ico$' { 'image/x-icon'; break }
    default { 'application/octet-stream' }
  }
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $relative = $req.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }

    $fullPath = Join-Path -Path (Get-Location) -ChildPath $relative

    if ((Test-Path $fullPath) -and (Get-Item $fullPath).PSIsContainer) {
      $fullPath = Join-Path $fullPath 'index.html'
    }

    if (-not (Test-Path $fullPath)) {
      $res.StatusCode = 404
      $msg = "Not Found"
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    try {
      $bytes = [System.IO.File]::ReadAllBytes($fullPath)
      $res.ContentType = Get-ContentType ([System.IO.Path]::GetExtension($fullPath).ToLowerInvariant())
      $res.ContentLength64 = $bytes.LongLength
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.StatusCode = 200
    } catch {
      $res.StatusCode = 500
      $err = [System.Text.Encoding]::UTF8.GetBytes("Server Error")
      $res.OutputStream.Write($err, 0, $err.Length)
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
