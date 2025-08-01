# ConsensusAI - Suggested Commands

## Development Environment Setup
```bash
# Root level - Start all services
npm run dev                    # Start backend + frontend + Prisma Studio
npm run dev:server            # Backend only
npm run dev:client            # Frontend only  
npm run dev:studio            # Prisma Studio only
npm run clean-ports           # Kill processes on development ports

# Install dependencies
npm run install:all           # Install all dependencies (server + client)
```

## Backend Commands (server/)
```bash
# Development
npm run dev                   # Start development server with ts-node
npm run dev:stable           # Start with nodemon (more stable)
npm run dev:simple           # Simple ts-node start
npm run stripe:dev           # Start Stripe CLI + auto webhook setup

# Database
npm run db:generate          # Generate Prisma client
npm run db:push             # Push schema to database
npm run db:migrate          # Run database migrations
npm run db:studio           # Open Prisma Studio
npm run db:seed             # Run database seeding

# Build & Test
npm run build               # TypeScript compilation
npm run lint                # ESLint check
npm run test                # Run Jest tests
```

## Frontend Commands (client/)
```bash
# Development
npm run dev                 # Start Vite development server
npm run build              # Production build
npm run preview            # Preview production build

# Code Quality
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix ESLint issues
npm run type-check         # TypeScript type checking
npm run check-all          # Type check + lint
```

## System Commands (Darwin/macOS)
```bash
# Process management
lsof -ti:3001 | xargs kill -9    # Kill backend process
lsof -ti:5173 | xargs kill -9    # Kill frontend process
lsof -ti:5555 | xargs kill -9    # Kill Prisma Studio

# Development utilities
git status                       # Git status
find . -name "*.ts" -type f     # Find TypeScript files
grep -r "pattern" src/          # Search in source code
```

## Emergency Recovery
```bash
# 500 Error Recovery
pkill -f "ts-node-dev"                                    # Stop all processes
rm -f prisma/dev.db && npx prisma migrate reset --force  # Reset database
npm run dev                                               # Restart server
```

## Stripe Testing
```bash
# Automated testing
./scripts/stripe-test.sh              # Run automated test script
./scripts/stripe-test.sh interactive  # Interactive test menu
./scripts/stripe-test.sh basic        # Basic integration test
```