#!/bin/bash

# Precious Metals India - Deployment Script
# This script helps deploy the application to various hosting platforms

set -e

echo "🏆 Precious Metals India - Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "server.js" ]; then
    print_error "This script must be run from the precious-metals-india directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Menu function
show_menu() {
    echo ""
    echo "Select deployment option:"
    echo "1. Local Development Server"
    echo "2. Production Build & Test"
    echo "3. Deploy to Heroku"
    echo "4. Deploy to Railway"
    echo "5. Deploy to Vercel"
    echo "6. Docker Build"
    echo "7. Generate Production Files"
    echo "8. Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
}

# Local development
local_dev() {
    print_info "Starting local development server..."
    
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    print_status "Starting server on http://localhost:3000"
    npm run dev
}

# Production build and test
production_test() {
    print_info "Building for production..."
    
    # Install production dependencies
    print_info "Installing production dependencies..."
    npm ci --only=production
    
    # Set environment variables
    export NODE_ENV=production
    export PORT=3000
    
    print_info "Starting production server..."
    print_status "Server will be available at http://localhost:3000"
    print_warning "Press Ctrl+C to stop the server"
    
    npm start
}

# Heroku deployment
deploy_heroku() {
    print_info "Deploying to Heroku..."
    
    if ! command_exists heroku; then
        print_error "Heroku CLI not found. Please install it first:"
        print_info "https://devcenter.heroku.com/articles/heroku-cli"
        return 1
    fi
    
    read -p "Enter your Heroku app name: " app_name
    
    # Login to Heroku
    print_info "Logging in to Heroku..."
    heroku auth:whoami || heroku login
    
    # Create app if it doesn't exist
    if ! heroku apps:info "$app_name" >/dev/null 2>&1; then
        print_info "Creating Heroku app: $app_name"
        heroku create "$app_name"
    fi
    
    # Set environment variables
    print_info "Setting environment variables..."
    heroku config:set NODE_ENV=production --app "$app_name"
    
    # Deploy
    print_info "Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" || true
    git push heroku main
    
    # Open app
    print_status "Deployment complete!"
    heroku open --app "$app_name"
}

# Railway deployment
deploy_railway() {
    print_info "Railway deployment setup..."
    
    if ! command_exists railway; then
        print_error "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    print_info "Logging in to Railway..."
    railway login
    
    print_info "Initializing Railway project..."
    railway init
    
    print_info "Deploying to Railway..."
    railway up
    
    print_status "Railway deployment complete!"
    print_info "Your app is now live at the provided Railway URL"
}

# Vercel deployment
deploy_vercel() {
    print_info "Deploying to Vercel..."
    
    if ! command_exists vercel; then
        print_error "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    print_info "Deploying to Vercel..."
    vercel --prod
    
    print_status "Vercel deployment complete!"
}

# Docker build
docker_build() {
    print_info "Building Docker image..."
    
    if ! command_exists docker; then
        print_error "Docker not found. Please install Docker first:"
        print_info "https://docs.docker.com/get-docker/"
        return 1
    fi
    
    read -p "Enter image name (default: precious-metals-india): " image_name
    image_name=${image_name:-precious-metals-india}
    
    print_info "Building Docker image: $image_name"
    docker build -t "$image_name" .
    
    print_status "Docker image built successfully!"
    print_info "To run the container:"
    print_info "docker run -p 3000:3000 $image_name"
    
    read -p "Do you want to run the container now? (y/n): " run_container
    if [ "$run_container" = "y" ] || [ "$run_container" = "Y" ]; then
        print_info "Starting Docker container..."
        docker run -p 3000:3000 "$image_name"
    fi
}

# Generate production files
generate_production() {
    print_info "Generating production files..."
    
    # Create production directory
    mkdir -p dist
    
    # Copy necessary files
    cp -r public dist/
    cp server.js dist/
    cp package.json dist/
    cp README.md dist/
    cp healthcheck.js dist/
    
    # Create production package.json
    print_info "Creating production package.json..."
    node -e "
        const pkg = require('./package.json');
        delete pkg.devDependencies;
        pkg.scripts = { start: 'node server.js' };
        require('fs').writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));
    "
    
    # Create .env template
    cp env.example dist/.env.example
    
    print_status "Production files generated in ./dist directory"
    print_info "Upload the contents of ./dist to your hosting provider"
}

# Main execution
main() {
    while true; do
        show_menu
        
        case $choice in
            1)
                local_dev
                ;;
            2)
                production_test
                ;;
            3)
                deploy_heroku
                ;;
            4)
                deploy_railway
                ;;
            5)
                deploy_vercel
                ;;
            6)
                docker_build
                ;;
            7)
                generate_production
                ;;
            8)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Check Node.js version
if ! command_exists node; then
    print_error "Node.js not found. Please install Node.js 16+ first"
    exit 1
fi

node_version=$(node -v | sed 's/v//')
required_version="16.0.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    print_error "Node.js version $node_version found, but version 16+ is required"
    exit 1
fi

print_status "Node.js version $node_version detected"

# Run main function
main 