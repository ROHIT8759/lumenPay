# LumenPay Test Suite

Comprehensive test coverage for the LumenPay application, including unit tests, integration tests, and database connection tests.

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── auth.test.ts       # Authentication tests
│   ├── transactions.test.ts # Transaction API tests
│   └── wallet.test.ts     # Wallet API tests
├── components/            # Component tests
│   └── TransactionList.test.tsx
├── lib/                   # Service/utility tests
│   └── stellarService.test.ts
└── integration/           # Integration tests
    └── database.test.ts   # Database connection tests
```

## Running Tests

### Install Dependencies

First, install the testing dependencies:

```bash
pnpm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

### Run Specific Test File

```bash
pnpm test __tests__/api/auth.test.ts
```

## Test Categories

### 1. API Tests (`__tests__/api/`)

Tests for all API routes:

- **Authentication** (`auth.test.ts`)
  - Valid/invalid credentials
  - JWT token generation
  - Session management

- **Transactions** (`transactions.test.ts`)
  - Fetching transactions
  - Filtering by status
  - Pagination
  - Creating transactions

- **Wallet** (`wallet.test.ts`)
  - Balance retrieval
  - Wallet linking
  - Address validation

### 2. Component Tests (`__tests__/components/`)

Tests for React components:

- **TransactionList** (`TransactionList.test.tsx`)
  - Rendering transactions
  - Loading states
  - Empty states
  - Click handlers

### 3. Service Tests (`__tests__/lib/`)

Tests for utility functions and services:

- **Stellar Service** (`stellarService.test.ts`)
  - Payment transactions
  - Balance queries
  - Error handling

### 4. Integration Tests (`__tests__/integration/`)

End-to-end tests for database operations:

- **Database** (`database.test.ts`)
  - Supabase connection
  - CRUD operations for:
    - User profiles
    - Transactions
    - Wallets
    - Contacts
  - Error handling
  - Pagination

## Database Test Coverage

The database integration tests cover:

### User Profile Operations

- ✅ Fetch user profile
- ✅ Update user profile
- ✅ Create new profile
- ✅ Delete profile

### Transaction Operations

- ✅ Insert transaction records
- ✅ Fetch user transactions
- ✅ Filter by status (success, pending, failed)
- ✅ Pagination (limit/offset)
- ✅ Sort by date
- ✅ Update transaction status

### Wallet Operations

- ✅ Link wallet address to user
- ✅ Fetch user wallet
- ✅ Update wallet data
- ✅ Validate stellar addresses

### Contact Operations

- ✅ Add contact
- ✅ Fetch user contacts
- ✅ Update contact name
- ✅ Delete contact

### Connection Tests

- ✅ Supabase connection establishment
- ✅ Error handling
- ✅ Connection pooling
- ✅ Timeout handling

## Test Configuration

### Jest Configuration (`jest.config.js`)

- Test environment: jsdom
- Module path aliases: `@/*`
- Coverage collection from: app, components, lib, hooks
- Setup file: `jest.setup.js`

### Setup File (`jest.setup.js`)

- Mock localStorage
- Mock fetch API
- Mock Next.js navigation
- Import testing library matchers

## Environment Variables for Testing

Create a `.env.test` file:

```env
# Supabase (use test instance)
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key

# JWT Secret (test)
JWT_SECRET=test-jwt-secret-change-in-production

# Stellar (testnet)
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

## Writing New Tests

### Example API Test

```typescript
describe("GET /api/your-endpoint", () => {
  it("should return data successfully", async () => {
    const response = await fetch("/api/your-endpoint", {
      headers: { "x-user-id": "test-user" },
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toBeDefined();
  });
});
```

### Example Component Test

```typescript
import { render, screen } from '@testing-library/react'
import YourComponent from '@/components/YourComponent'

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### Example Database Test

```typescript
describe("Database Operation", () => {
  it("should perform operation", async () => {
    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .eq("field", "value");

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run tests
  run: pnpm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Best Practices

1. **Write tests first** (TDD approach)
2. **Mock external dependencies** (APIs, databases)
3. **Test edge cases** (empty data, errors, null values)
4. **Keep tests isolated** (no dependencies between tests)
5. **Use descriptive test names** (describe what's being tested)
6. **Test user behavior** (not implementation details)
7. **Maintain high coverage** (aim for >80%)

## Troubleshooting

### Tests failing with localStorage errors

- Check that `jest.setup.js` properly mocks localStorage

### Module resolution errors

- Verify `jest.config.js` has correct `moduleNameMapper`

### Async tests timing out

- Increase timeout in individual tests: `jest.setTimeout(10000)`

### Database connection issues

- Ensure `.env.test` has correct Supabase credentials
- Use test database, not production

## Coverage Goals

- **Overall**: >80%
- **API Routes**: >90%
- **Components**: >75%
- **Services**: >85%
- **Integration**: >70%

## Maintenance

Run tests before every commit:

```bash
git add .
pnpm test
git commit -m "Your message"
```

Set up pre-commit hook in `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm test
```
