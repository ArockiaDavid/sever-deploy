# Environment Management Guide

This guide explains how to manage development and production environments for the Software Center application.

## Port Configuration

We've configured separate ports for development and production environments to avoid conflicts:

### Development Environment
- Frontend: Port 3000
- Backend: Port 5001

### Production Environment (Docker)
- Frontend: Port 4000
- Backend: Port 3007

## Using the Environment Management Script

We've created a script to help you manage your environments. The script allows you to:

1. Check the status of both environments
2. Start/stop the development environment
3. Start/stop the production environment (Docker containers)
4. Ensure there are no port conflicts between environments

### Running the Script

```bash
cd Software-center-latest
./manage-env.sh
```

### Script Options

1. **Check Status**: Shows which ports are in use and which environments are running
2. **Start Development Environment**: Starts the backend and frontend in development mode
3. **Stop Development Environment**: Stops all development processes
4. **Start Production Environment**: Starts the Docker containers for production
5. **Stop Production Environment**: Stops the Docker containers and ensures all ports are free

## Manual Management

If you prefer to manage environments manually:

### Development Environment

Start backend:
```bash
cd Software-center-latest/backend
npm run dev
```

Start frontend:
```bash
cd Software-center-latest/frontend
npm start
```

### Production Environment

Start Docker containers:
```bash
cd Software-center-latest
docker-compose up -d
```

Stop Docker containers:
```bash
cd Software-center-latest
docker-compose down
```

## Troubleshooting

If you encounter issues with ports being in use:

1. Check which processes are using the ports:
   ```bash
   lsof -i :3000
   lsof -i :4000
   lsof -i :5001
   lsof -i :3007
   ```

2. Kill the processes if needed:
   ```bash
   kill -9 <PID>
   ```

3. Use the management script to ensure clean environment switching:
   ```bash
   ./manage-env.sh
