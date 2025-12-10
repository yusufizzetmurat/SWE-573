# The Hive - AI Coding Agent Instructions

## Project Architecture

**The Hive** is a TimeBank service exchange platform with Django (REST API + WebSockets) backend and React/TypeScript frontend, orchestrated via Docker.

### Core Stack
- **Backend**: Django 5.2 + DRF + Django Channels (WebSockets), PostgreSQL with PostGIS extension, Redis for channels layer
- **Frontend**: React 18 + TypeScript + Vite, Radix UI components, Leaflet for maps
- **Infrastructure**: Docker Compose for all environments, Daphne ASGI server for WebSocket support

### Key Domain Model
The system revolves around a **TimeBank economy** where 1 service hour = 1 TimeBank hour:
- `Service`: User posts (type: Offer/Need) with duration, location (PostGIS Point), and Wikidata semantic tags
- `Handshake`: Service agreement protocol with states (pending → accepted → completed) and escrow logic
- `User`: Extended AbstractUser with `timebank_balance` (Decimal field, min -10.00 constraint)
- `ChatMessage`: Bound to handshakes for private negotiation via WebSocket channels
- `TransactionHistory`: Immutable ledger for all balance changes

**Provider/Receiver Logic** (critical business rule in `backend/api/services.py::HandshakeService`):
- Offer posts: creator = Provider, requester = Receiver
- Need posts: creator = Receiver, requester = Provider
- Hours always flow from Receiver → Provider after mutual completion confirmation

## Development Workflow

### Setup & Running
```bash
make demo              # Full setup with demo data (takes 2-3 min first run)
make logs              # Tail all container logs
make delete            # Destroy all containers + volumes
```

Access: Frontend at `http://localhost:5173`, Backend at `http://localhost:8000`

### Testing
```bash
make test              # Run backend Django tests + frontend Vitest tests
make test-e2e          # Run Playwright E2E tests (requires running demo)
make test-all          # All test suites
```

E2E test specs in `frontend/e2e/` use demo accounts (e.g., `elif@demo.com / demo123`).

### Database Operations
```bash
make migrate           # Apply Django migrations
make shell             # Django management shell
make db-backup         # Create timestamped backup
```

Migrations in `backend/api/migrations/`. Use Django ORM - never raw SQL without review.

## Backend Patterns

### Service Layer Architecture
Business logic MUST live in service classes (e.g., `backend/api/services.py::HandshakeService`), NOT views.

**Example - Express Interest workflow**:
```python
# views.py - thin controller
handshake = HandshakeService.express_interest(service, request.user)

# services.py - fat service layer with transaction + locking
@staticmethod
def express_interest(service, requester):
    with transaction.atomic():
        # Lock resources in consistent order (by ID) to prevent deadlocks
        service = Service.objects.select_for_update().get(pk=service.pk)
        # ... validation + provisioning logic
```

**Critical**: Always use `select_for_update()` for balance-affecting operations to prevent race conditions. Lock acquisition order MUST be deterministic (sort by ID).

### Model Conventions
- Primary keys: `UUIDField` with `uuid.uuid4` default (except auto-incremented IDs for legacy models)
- Timestamps: Use `auto_now_add=True` and `auto_now=True` for created/updated fields
- Indexes: Add `db_index=True` or `Meta.indexes` for frequently queried fields (e.g., `hot_score`)
- Constraints: Use `Meta.constraints` for DB-level validation (see `timebank_balance_minimum`)

### GeoDjango Usage
Services use PostGIS for location-based queries:
```python
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance

service.location = Point(lng, lat, srid=4326)  # Note: lng, lat order!
Service.objects.annotate(distance=Distance('location', user_point)).filter(distance__lte=D(km=5))
```

The `Service.save()` override auto-syncs `location_lat`/`location_lng` → `location` PointField. Refresh coordinates from DB when doing partial updates to avoid stale data.

### WebSocket Implementation
Django Channels WebSocket consumers in `backend/api/consumers.py`:
- `ChatConsumer`: Private DM per handshake (`ws/chat/<handshake_id>/`)
- `PublicChatConsumer`: Public service discussions (`ws/public-chat/<room_id>/`)

JWT authentication via query string (`?token=...`), verified in `connect()`. Use `@database_sync_to_async` for ORM access. Redis channels layer configured in `settings.py::CHANNEL_LAYERS`.

### Serializer Patterns
- Use `UserSummarySerializer` for nested user data to avoid circular refs and N+1 queries
- Prefetch related data in viewsets with `select_related()`/`prefetch_related()` before serialization
- Input sanitization: Use `bleach` library for HTML fields (see serializers.py examples)
- API docs: Add `@extend_schema_serializer` with `OpenApiExample` for Swagger/Redoc

### API Throttling
Custom throttle classes in `backend/api/throttles.py`:
- `ConfirmationThrottle`: Rate-limit handshake confirmations (anti-spam)
- `HandshakeThrottle`: Limit express interest actions

Apply via `throttle_classes` in ViewSets.

## Frontend Patterns

### Component Structure
- Page components: `src/components/{HomePage, Dashboard, ProfilePage}.tsx`
- Modals: `{ServiceConfirmation, PositiveRep, DisputeResolution}Modal.tsx`
- UI primitives: `src/components/ui/` (shadcn/ui style Radix wrappers)

### State Management
No global state library - use React hooks:
- `useState` for local component state
- `useEffect` for data fetching (wrap in error boundaries)
- Context: Only `ThemeProvider` for dark mode (see `src/lib/theme-context`)

### API Integration
Axios instance configured in `src/lib/` (check existing patterns before creating new endpoints). Base URL from `VITE_API_URL` env var (default: `http://localhost:8000/api`).

WebSocket connections use native WebSocket API with JWT token in query string.

### Styling
- Tailwind CSS utility classes (configured in `tailwind.config.js`)
- Follow existing spacing/color patterns from `index.css`
- Dark mode: Use `dark:` prefix, theme toggled via ThemeProvider

### Map Integration
Leaflet with react-leaflet wrapper:
```tsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
// See HomePageMap.tsx and ServiceMap.tsx for reference patterns
```

PostGIS coordinates from backend are `[lat, lng]` for Leaflet consumption.

## Critical Requirements Context

From `docs/Final List of Requirements.md` - enforce these rules:

**REQ-TB-003 (Reciprocity Block)**: Users with balance >10 hours MUST be blocked from posting new "Offers" (prevent hoarding).

**REQ-TB-004/005 (Escrow)**: Hours provision (escrow) on handshake acceptance, transfer only after **both** parties confirm completion.

**REQ-SRV-004/005**: Unlimited pending handshakes allowed, but `max_participants` limit enforced for accepted handshakes.

**REQ-REP-001**: Use categorical "Positive Reps" (Punctual, Helpful, Kindness) - no 5-star ratings.

**REQ-REP-004**: Hot score algorithm: `Score = (PositiveRep - NegativeRep + Comments) / (TimeHours + 2)^1.5`

## Production Considerations

Production uses `docker-compose.prod.yml`:
- `Dockerfile.prod` for both backend/frontend (optimized multi-stage builds)
- Backend: Gunicorn/Daphne with static file collection
- Frontend: Nginx serving pre-built Vite artifacts
- Use `make prod-demo` for production testing

**Security**: Set `DEBUG=False`, `SECRET_KEY`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` in `.env` file.

## Code Style & Quality

- Backend: Follow Django conventions, use type hints where appropriate (see `services.py`)
- Frontend: TypeScript strict mode, explicit types for props/state
- Error handling: Return descriptive error responses with `ErrorCodes` enum (see `exceptions.py`)
- Logging: Use Django logger (`import logging; logger = logging.getLogger(__name__)`) for debugging

## Testing Conventions

- **Backend tests**: Django TestCase in `backend/api/tests/`, organized by feature (e.g., `test_handshake_protocol.py`)
- **Frontend unit tests**: Vitest in `src/**/*.{test,spec}.tsx`, use React Testing Library
- **E2E tests**: Playwright in `frontend/e2e/`, use helper fixtures from `e2e/helpers/`

Run all tests before submitting changes: `make test-all`

---

When modifying code, respect these patterns and consult adjacent files for consistency. For architecture decisions not covered here, check implementation in similar existing features.
