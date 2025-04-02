$repoPath = "C:\Users\Craig Owenn\Downloads\text-to-csv-app"  # Update with your actual repo path
Set-Location $repoPath  # Change directory to the project root

while ($true) {  # Infinite loop to keep checking for changes
    try {
        # Check for untracked files or changes
        $changes = git status --porcelain

        if ($changes) {
            Write-Host "New changes detected. Committing..."

            # Add all untracked files
            git add .

            # Check if 'git add' was successful
            if ($?) {
                Write-Host "Files staged successfully."
            } else {
                Write-Host "Failed to stage files."
                return  # Exit if adding files failed
            }

            # Commit the changes with --no-verify to bypass any hooks
            $commitMessage = "Auto-commit: Added new uploaded files"
            git commit --no-verify -m $commitMessage

            # Check if commit was successful
            if ($?) {
                Write-Host "Commit successful."
            } else {
                Write-Host "Commit failed."
                return  # Exit if commit failed
            }

            # Push the commit to the remote repository (GitHub)
            git push origin main

            # Check if push was successful
            if ($?) {
                Write-Host "Changes committed and pushed successfully."
            } else {
                Write-Host "Push failed."
                return  # Exit if push failed
            }
        } else {
            Write-Host "No changes detected."
        }
    } catch {
        Write-Host "Error occurred: $_"  # Output any errors that occur during commit or push
    }

    Start-Sleep -Seconds 10  # Check for changes every 10 seconds
}
