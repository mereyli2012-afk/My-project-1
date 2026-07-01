$projectPath = "C:\Users\merey\Documents\Project\My-project-1"
$port = 5173

$server = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($server) {
  exit 0
}

Start-Process -FilePath "C:\Program Files\nodejs\npm.cmd" `
  -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "$port" `
  -WorkingDirectory $projectPath `
  -WindowStyle Hidden
