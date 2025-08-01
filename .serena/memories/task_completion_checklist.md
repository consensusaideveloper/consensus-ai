# ConsensusAI - Task Completion Checklist

## Pre-Implementation Checklist
- [ ] **Database Operations**: Confirm both Firebase + SQLite operations are included
- [ ] **Data Integrity**: Include error-time complete rollback processing
- [ ] **AI API Connection**: Test connection with `GET /api/analysis/health`
- [ ] **Single API Call**: Ensure 1 analysis = 1 API call only
- [ ] **Internationalization**: Implement translations avoiding Japanese-English mixed expressions
- [ ] **Error Handling**: Implement appropriate error processing

## During Implementation
- [ ] **Minimal Changes**: Only implement what's necessary for the task
- [ ] **Code Quality**: Follow existing code conventions and patterns
- [ ] **Type Safety**: Maintain TypeScript strict typing
- [ ] **No Mock Data**: Avoid including mock data in implementation code

## Post-Implementation Checklist
- [ ] **Test Data Cleanup**: Completely remove test data created during verification
- [ ] **Test Code Removal**: Remove temporary test code after implementation confirmation
- [ ] **Production Environment Clean**: Ensure no test data/code remains in production
- [ ] **Codebase Cleanliness**: Remove temporary implementation from development
- [ ] **Error Check**: Run lint/build commands to verify no errors after all modifications
- [ ] **Database Files Update**: If DB-related changes made, update `sqlite-firebase-data-structure-analysis.md` and `firebase-database-rules.json`

## Error Checking Commands
```bash
# Frontend
cd client
npm run lint        # ESLint check
npm run build       # Production build error check

# Backend  
cd server
npm run build       # TypeScript compilation check
npx tsc --noEmit    # TypeScript error check only
```

## Important Notes
- **Existing Lint Warnings**: Current codebase has existing lint warnings - only focus on new additions
- **Compile Errors**: TypeScript compilation errors and type errors MUST be fixed
- **Testing Account**: Use only `yuto.masamura@gmail.com` account for testing
- **Database Integrity**: Both SQLite and Firebase must reflect identical data states