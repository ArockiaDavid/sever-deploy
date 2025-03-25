#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Development ports
DEV_FRONTEND_PORT=3000
DEV_BACKEND_PORT=5001

# Production ports
PROD_FRONTEND_PORT=4000
PROD_BACKEND_PORT=3007

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${RED}Port $port is in use${NC}"
        return 0
    else
        echo -e "${GREEN}Port $port is free${NC}"
        return 1
    fi
}

# Function to kill processes using a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -t -i :$port)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid
    else
        echo -e "${GREEN}No process found on port $port${NC}"
    fi
}

# Function to check environment status
check_status() {
    echo -e "${BLUE}Checking development environment:${NC}"
    check_port $DEV_FRONTEND_PORT
    local dev_frontend_status=$?
    check_port $DEV_BACKEND_PORT
    local dev_backend_status=$?
    
    echo -e "\n${BLUE}Checking production environment:${NC}"
    check_port $PROD_FRONTEND_PORT
    local prod_frontend_status=$?
    check_port $PROD_BACKEND_PORT
    local prod_backend_status=$?
    
    if [ $dev_frontend_status -eq 0 ] || [ $dev_backend_status -eq 0 ]; then
        echo -e "\n${YELLOW}Development environment is running${NC}"
    else
        echo -e "\n${GREEN}Development environment is not running${NC}"
    fi
    
    if [ $prod_frontend_status -eq 0 ] || [ $prod_backend_status -eq 0 ]; then
        echo -e "${YELLOW}Production environment is running${NC}"
    else
        echo -e "${GREEN}Production environment is not running${NC}"
    fi
}

# Function to start development environment
start_dev() {
    echo -e "${BLUE}Starting development environment...${NC}"
    
    # Check if production environment is running
    check_port $PROD_FRONTEND_PORT
    local prod_frontend_status=$?
    check_port $PROD_BACKEND_PORT
    local prod_backend_status=$?
    
    if [ $prod_frontend_status -eq 0 ] || [ $prod_backend_status -eq 0 ]; then
        echo -e "${RED}Production environment is running. Stop it first.${NC}"
        return 1
    fi
    
    # Start backend
    echo -e "${YELLOW}Starting backend on port $DEV_BACKEND_PORT...${NC}"
    cd "$(dirname "$0")/backend" && NODE_ENV=development npm run dev &
    
    # Wait for backend to start
    sleep 5
    
    # Start frontend
    echo -e "${YELLOW}Starting frontend on port $DEV_FRONTEND_PORT...${NC}"
    cd "$(dirname "$0")/frontend" && npm start &
    
    echo -e "${GREEN}Development environment started${NC}"
}

# Function to stop development environment
stop_dev() {
    echo -e "${BLUE}Stopping development environment...${NC}"
    kill_port $DEV_FRONTEND_PORT
    kill_port $DEV_BACKEND_PORT
    echo -e "${GREEN}Development environment stopped${NC}"
}

# Function to start production environment
start_prod() {
    echo -e "${BLUE}Starting production environment...${NC}"
    
    # Check if development environment is running
    check_port $DEV_FRONTEND_PORT
    local dev_frontend_status=$?
    check_port $DEV_BACKEND_PORT
    local dev_backend_status=$?
    
    if [ $dev_frontend_status -eq 0 ] || [ $dev_backend_status -eq 0 ]; then
        echo -e "${RED}Development environment is running. Stop it first.${NC}"
        return 1
    fi
    
    # Start Docker containers
    echo -e "${YELLOW}Starting Docker containers...${NC}"
    docker-compose up -d
    
    echo -e "${GREEN}Production environment started${NC}"
}

# Function to stop production environment
stop_prod() {
    echo -e "${BLUE}Stopping production environment...${NC}"
    
    # Stop Docker containers
    echo -e "${YELLOW}Stopping Docker containers...${NC}"
    docker-compose down
    
    # Make sure all ports are free
    kill_port $PROD_FRONTEND_PORT
    kill_port $PROD_BACKEND_PORT
    
    echo -e "${GREEN}Production environment stopped${NC}"
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}Software Center Environment Manager${NC}"
    echo -e "${YELLOW}=================================${NC}"
    echo "1. Check Status"
    echo "2. Start Development Environment"
    echo "3. Stop Development Environment"
    echo "4. Start Production Environment"
    echo "5. Stop Production Environment"
    echo "6. Exit"
    echo -e "${YELLOW}=================================${NC}"
    echo -n "Enter your choice [1-6]: "
}

# Main function
main() {
    cd "$(dirname "$0")"
    
    while true; do
        show_menu
        read choice
        
        case $choice in
            1) check_status ;;
            2) start_dev ;;
            3) stop_dev ;;
            4) start_prod ;;
            5) stop_prod ;;
            6) echo -e "${GREEN}Exiting...${NC}"; exit 0 ;;
            *) echo -e "${RED}Invalid choice. Please try again.${NC}" ;;
        esac
        
        echo -e "\nPress Enter to continue..."
        read
    done
}

# Run the main function
main
