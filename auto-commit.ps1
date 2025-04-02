$repoPath = "C:\Users\Craig Owenn\Downloads\text-to-csv-app"  # Update with your actual repo path
Set-Location $repoPath  # Change directory to the project root

while ($true) {  # Infinite loop to keep checking for changes
    $changes = git status --porcelain

    if ($changes) {
        Write-Host "New changes detected. Committing..."
        git add .
        git commit -m "Auto-commit: Added new files and folders"
        git push origin main
    }

    Start-Sleep -Seconds 10  # Check for changes every 10 seconds
}
