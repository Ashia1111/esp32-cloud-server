$watchDir = "public/uploads"

Write-Host "Watching for changes in $watchDir..."

chokidar "$watchDir/*" -c "
  git add .
  git commit -m 'Auto-commit: New file added'
  git push origin main
"
