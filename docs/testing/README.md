# Testing Documentation

Quick reference for running tests and viewing test structure for The Hive platform.

## Quick Start

### Running Tests

#### Backend Tests
```bash
# Run all backend tests
make test-backend

# Run only unit tests
make test-backend-unit

# Run only integration tests
make test-backend-integration

# Generate coverage report
make coverage-backend
```

#### Frontend Tests
```bash
# Run all frontend tests
make test-frontend

# Run unit tests
make test-frontend-unit

# Run integration tests
make test-frontend-integration

# Generate coverage report
make coverage-frontend
```

#### E2E Tests
```bash
# Run E2E tests
make test-e2e

# Run E2E tests with UI
make test-e2e-ui

# Run E2E tests in debug mode
make test-e2e-debug
```

#### All Tests
```bash
# Run all tests (backend + frontend + E2E)
make test-all
```

### Viewing Reports

```bash
# Open test reports
make test-reports

# Open coverage reports
make coverage-report
```

## Test Structure

### Backend Tests
- **Unit Tests**: `backend/api/tests/unit/`
  - Model tests
  - Serializer tests
  - Utility function tests
  - Service layer tests

- **Integration Tests**: `backend/api/tests/integration/`
  - API endpoint tests
  - Database operation tests
  - Authentication flow tests

### Frontend Tests
- **Unit Tests**: `frontend/src/components/__tests__/`
  - Component tests
  - Hook tests
  - Utility tests

- **Integration Tests**: `frontend/src/components/__tests__/*.integration.test.tsx`
  - Component + API integration

- **E2E Tests**: `frontend/tests/e2e/`
  - Full user flow tests
  - Cross-browser tests
  - Visual regression tests

## Coverage Targets

- **Overall Coverage**: 70% minimum
- **Critical Paths**: 90% minimum
- **Business Logic**: 85% minimum
- **UI Components**: 60% minimum

## Test Data

Test data is managed through:
- **Factories**: `backend/api/tests/helpers/factories.py`
- **Fixtures**: `backend/api/tests/fixtures/` and `frontend/src/test/fixtures/`
- **Mocks**: `frontend/src/test/mocks/`

## Continuous Integration

Tests are configured to run:
- **Unit tests**: On every commit
- **Integration tests**: On pull requests
- **E2E tests**: Nightly
- **Full suite**: Before releases

## Best Practices

1. **Write tests first** (TDD approach for critical features)
2. **Keep tests independent** (no test dependencies)
3. **Use descriptive test names** (clear what is being tested)
4. **Follow AAA pattern** (Arrange, Act, Assert)
5. **Maintain test data separately** (use factories and fixtures)
6. **Keep tests fast** (unit tests should be < 1s each)
7. **Test edge cases** (boundary conditions, error cases)
8. **Update tests with code changes** (keep tests in sync)

## Troubleshooting

### Tests Failing
1. Check test output for error messages
2. Verify test data is correct
3. Check database state
4. Verify environment variables

### Coverage Below Threshold
1. Review coverage report to identify gaps
2. Add tests for uncovered code
3. Focus on critical paths first

### E2E Tests Flaky
1. Add appropriate waits
2. Use stable selectors
3. Check for race conditions
4. Review test isolation

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)

## Support

For questions or issues with testing:
- Review test documentation
- Check test examples in codebase
