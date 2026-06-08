param([int]$Port = 5173)
$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$Port/"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = $req.Url.LocalPath.TrimStart('/')
      if ($path -eq '' -or $path -eq '/') { $path = 'DermaCand_app.html' }
      $file = Join-Path $root $path
      if (Test-Path $file -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $mime = switch ($ext) {
          '.html' { 'text/html; charset=utf-8' }
          '.js'   { 'application/javascript' }
          '.json' { 'application/json' }
          '.css'  { 'text/css' }
          '.png'  { 'image/png' }
          '.svg'  { 'image/svg+xml' }
          default { 'application/octet-stream' }
        }
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $res.ContentType = $mime
        $res.ContentLength64 = [long]$bytes.LongLength
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $res.ContentLength64 = $msg.LongLength
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      Write-Host "Error: $_"
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
