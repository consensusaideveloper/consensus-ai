# ConsensusAI - Code Style and Conventions

## TypeScript Standards
- **Strict TypeScript**: Full type safety with strict mode enabled
- **Interface Definitions**: Comprehensive interface definitions in `types/` directories
- **Type Hints**: Explicit typing for all function parameters and return values
- **No `any` Types**: Avoid using `any`, use proper typing or `unknown`

## Database Rules (Critical)
- **Dual Database Operations**: ALL CRUD operations MUST execute on both SQLite + Firebase
- **Transaction Safety**: If one database fails, rollback the other completely
- **Execution Order**: SQLite → Firebase for Create/Update/Delete operations
- **Data Consistency**: Ensure both databases reflect identical data states
- **Sync Fields**: Include `firebaseId`, `syncStatus`, `lastSyncAt` in models

## React/Frontend Conventions
- **Functional Components**: Use function components with hooks
- **TypeScript Props**: All component props must be typed with interfaces
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Context Usage**: Use React Context for global state (AuthContext, etc.)
- **Internationalization**: Use `useLanguage()` hook with `t('key')` function
- **No Mixed Languages**: Avoid Japanese-English mixed expressions

## API Design Standards
- **RESTful Routes**: Follow REST conventions for endpoint design
- **Error Responses**: Consistent error response format across all endpoints
- **HTTP Status Codes**: Proper status codes (200, 201, 400, 401, 404, 500)
- **Request Validation**: Use Zod schemas for request validation
- **Authentication**: Consistent auth middleware usage

## File Organization
```
server/src/
├── routes/          # API endpoints
├── services/        # Business logic
├── middleware/      # Express middleware
├── lib/            # Library configurations
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
└── constants/      # Constants and enums

client/src/
├── components/     # React components
├── contexts/       # React contexts
├── translations/   # Internationalization
├── lib/           # Library configurations
└── types/         # TypeScript types
```

## Naming Conventions
- **Files**: camelCase for files, PascalCase for components
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase with clear naming
- **Database Tables**: snake_case (Prisma convention)