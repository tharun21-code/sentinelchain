const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let repoPath = './repos/testrepo';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repoPath' && i + 1 < args.length) {
    repoPath = args[i + 1];
    break;
  }
}

function logEvent(obj) {
  const eventsPath = path.join(__dirname, '..', 'ledger', 'events.log');
  fs.appendFileSync(eventsPath, JSON.stringify(obj) + '\n', 'utf8');
}

function detectProjectType(targetPath) {
  const hasPackageJson = fs.existsSync(path.join(targetPath, 'package.json'));
  const hasRequirementsTxt = fs.existsSync(path.join(targetPath, 'requirements.txt'));
  const hasPyprojectToml = fs.existsSync(path.join(targetPath, 'pyproject.toml'));

  if (hasPackageJson) return 'node';
  if (hasRequirementsTxt || hasPyprojectToml) return 'python';
  return null;
}

function createDockerfileScanner(targetPath, projectType) {
  const dockerfilePath = path.join(targetPath, 'Dockerfile.scanner');

  if (fs.existsSync(dockerfilePath)) {
    console.log('Dockerfile.scanner already exists, skipping creation');
    return;
  }

  let dockerfileContent;

  if (projectType === 'node') {
    dockerfileContent = `# Scanner Dockerfile for Node.js applications
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["npm", "start"]
`;
  } else if (projectType === 'python') {
    dockerfileContent = `# Scanner Dockerfile for Python applications
FROM python:3.11-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY requirements.txt pyproject.toml poetry.lock ./
RUN pip install --no-cache-dir -r requirements.txt || pip install poetry && poetry install --no-dev

# Bundle app source
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health').raise_for_status()"

# Start the application
CMD ["python", "app.py"]
`;
  }

  fs.writeFileSync(dockerfilePath, dockerfileContent);
  console.log(`Created Dockerfile.scanner for ${projectType} project`);
}

function getRandomPort() {
  // Use a port range that avoids common conflicts
  return Math.floor(Math.random() * (65535 - 1024) + 1024);
}

function waitForHttpService(host, port, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function checkService() {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for HTTP service'));
        return;
      }

      const http = require('http');
      const req = http.get(`http://${host}:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(checkService, 2000);
        }
      });

      req.on('error', () => {
        setTimeout(checkService, 2000);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        setTimeout(checkService, 2000);
      });
    }

    checkService();
  });
}

async function runDockerContainer() {
  try {
    const projectType = detectProjectType(repoPath);
    if (!projectType) {
      throw new Error('Unable to detect project type (Node.js or Python)');
    }

    console.log(`Detected ${projectType} project in ${repoPath}`);

    // Create Dockerfile if needed
    createDockerfileScanner(repoPath, projectType);

    // Generate container name and ports
    const containerName = `sentinelchain-scanner-${Date.now()}`;
    const hostPort = getRandomPort();
    const internalPort = projectType === 'node' ? 3000 : 8000;

    logEvent({
      time: new Date().toISOString(),
      type: 'container_build_started',
      repo_path: repoPath,
      container_name: containerName,
      project_type: projectType
    });

    // Build Docker image
    const imageName = `sentinelchain-scanner:${containerName}`;
    execSync(`docker build -f Dockerfile.scanner -t ${imageName} .`, {
      cwd: repoPath,
      stdio: 'inherit'
    });

    logEvent({
      time: new Date().toISOString(),
      type: 'container_build_success',
      container_name: containerName,
      image_name: imageName
    });

    // Run container with limited resources
    console.log(`Starting container ${containerName} on port ${hostPort}`);
    const runCommand = `docker run -d --name ${containerName} --memory=512m --cpus=0.5 -p ${hostPort}:${internalPort} ${imageName}`;

    const containerId = execSync(runCommand, { encoding: 'utf8' }).trim();

    logEvent({
      time: new Date().toISOString(),
      type: 'container_run_started',
      container_name: containerName,
      container_id: containerId,
      host_port: hostPort,
      internal_port: internalPort
    });

    // Wait for HTTP service to be ready
    console.log(`Waiting for HTTP service on port ${hostPort}...`);
    await waitForHttpService('localhost', hostPort, 120000); // 2 minute timeout

    logEvent({
      time: new Date().toISOString(),
      type: 'container_run_success',
      container_name: containerName,
      host_port: hostPort,
      internal_port: internalPort,
      status: 'ready'
    });

    console.log(`Container ${containerName} is ready on http://localhost:${hostPort}`);

    // Return container information
    const result = {
      ok: true,
      containerName,
      hostPort,
      internalPort,
      projectType
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    console.error('Docker runner failed:', error.message);
    logEvent({
      time: new Date().toISOString(),
      type: 'container_error',
      repo_path: repoPath,
      error: error.message
    });

    // Try to cleanup on failure
    try {
      execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

runDockerContainer();
