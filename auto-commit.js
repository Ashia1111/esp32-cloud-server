const chokidar = require('chokidar');
const simpleGit = require('simple-git');
const path = require('path');

// Initialize simple-git
const git = simpleGit();

// Set the path to the directory where the files are uploaded
const uploadDirectory = path.join(__dirname, 'uploads');

// Initialize the watcher to monitor the upload folder
const watcher = chokidar.watch(uploadDirectory, {
  persistent: true,
  ignored: /^\./,
  awaitWriteFinish: true,
});

// Function to commit and push the files to GitHub
const commitAndPush = async () => {
  try {
    console.log('New file detected, committing...');

    // Stage the files
    await git.add(uploadDirectory);

    // Commit the changes
    await git.commit('Auto-commit: Added new uploaded files');

    // Push the changes to GitHub
    await git.push('origin', 'main');
    console.log('Changes committed and pushed to GitHub!');
  } catch (error) {
    console.error('Error during commit or push:', error);
  }
};

// Watch for new `.txt` files (or changes in general) in the uploads folder
watcher.on('add', (filePath) => {
  if (filePath.endsWith('.txt')) {
    console.log(`New .txt file detected: ${filePath}`);
    commitAndPush(); // Call commit and push when a new file is added
  }
});

console.log('Watching for file uploads...');
