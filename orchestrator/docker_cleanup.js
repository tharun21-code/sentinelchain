const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get container name from command line argument
const containerName = process.argv[2];

if (!containerName) {
  console.error('Usage: node docker_cleanup.js <container_name>');
  process.exit(1);
}

function logEvent(obj) {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(obj) + '\n', 'utf8');
}

try {
  console.log(`Removing Docker container: ${containerName}`);

  logEvent({
    time: new Date().toISOString(),
    type: 'container_cleanup_started',
    container_name: containerName
  });

  // Force remove the container
  execSync(`docker rm -f ${containerName}`, { stdio: 'inherit' });

  logEvent({
    time: new Date().toISOString(),
    type: 'container_removed',
    container_name: containerName,
    status: 'success'
  });

  console.log(`Container ${containerName} successfully removed`);

} catch (error) {
  console.error(`Failed to remove container ${containerName}:`, error.message);

  logEvent({
    time: new Date().toISOString(),
    type: 'container_cleanup_failed',
    container_name: containerName,
    error: error.message
  });

  process.exit(1);
}
