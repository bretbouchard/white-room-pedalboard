#!/bin/bash

# DAW UI Frontend Setup Script
# This script sets up the development environment for the DAW UI frontend

set -e

echo "🎵 Setting up DAW UI Frontend Development Environment..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🔍 Running type check..."
pnpm type-check

echo "🧹 Running linter..."
pnpm lint

echo "💅 Checking code formatting..."
pnpm format:check

echo "🏗️  Testing production build..."
pnpm build

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 To start development:"
echo "   pnpm dev"
echo ""
echo "📚 Available commands:"
echo "   pnpm dev          - Start development server"
echo "   pnpm build        - Build for production"
echo "   pnpm lint         - Run ESLint"
echo "   pnpm format       - Format code with Prettier"
echo "   pnpm type-check   - Run TypeScript type checking"
echo "   pnpm check-all    - Run all quality checks"
echo ""
echo "🎛️  The DAW UI will be available at http://localhost:3000"
echo "🔌 Backend API proxy configured for http://localhost:8000"