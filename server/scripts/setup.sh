#!/bin/bash

# ConsensusAI Backend Setup Script
echo "🚀 Setting up ConsensusAI Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Setup environment variables
if [ ! -f .env ]; then
    echo "🔧 Setting up environment variables..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - Set OPENAI_API_KEY to your OpenAI API key"
    echo "   - Adjust DATABASE_URL if needed"
    echo "   - Set PORT if you want to use a different port"
else
    echo "✅ .env file already exists"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client generated"

# Setup database
echo "🗄️  Setting up database..."
npm run db:push

if [ $? -ne 0 ]; then
    echo "❌ Failed to setup database"
    exit 1
fi

echo "✅ Database setup completed"

# Seed database with test data
echo "🌱 Seeding database with test data..."
npm run db:seed

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to seed database. You can run 'npm run db:seed' manually later."
else
    echo "✅ Database seeded successfully"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build the project"
    exit 1
fi

echo "✅ Project built successfully"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the development server: npm run dev"
echo "3. Or start the production server: npm start"
echo ""
echo "🔗 Useful URLs (when server is running):"
echo "   - Health check: http://localhost:3000/health"
echo "   - Database info: http://localhost:3000/api/info"
echo "   - Realtime stats: http://localhost:3000/api/realtime/stats"
echo ""
echo "📖 For more information, check docs/backend-progress.md"