# Database Utilities

This directory contains utility scripts for database management and maintenance.

## Scripts

### `apply-schema.js`
Applies the database schema from the SQL files in the `database/` directory.
```bash
node backend/src/utils/database/apply-schema.js
```

### `seed-demo-users.js`
Seeds the database with demo users for testing and development.
```bash
node backend/src/utils/database/seed-demo-users.js
```

### `fix-demo-users.js`
Fixes demo user passwords if they become corrupted or need to be reset.
```bash
node backend/src/utils/database/fix-demo-users.js
```

### `cleanup-test-data.js`
Cleans up test data created during development and testing.
```bash
node backend/src/utils/database/cleanup-test-data.js
```

### `test-db.js`
Tests database connectivity and verifies demo user credentials.
```bash
node backend/src/utils/database/test-db.js
```

## Demo Accounts

After running the seed script, you can use these accounts:

- **Admin**: admin@education.com / password123
- **Teacher**: jane.teacher@education.com / password123  
- **Student**: john.student@education.com / password123
- **Parent**: mary.parent@education.com / password123