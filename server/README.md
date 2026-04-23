# NLLimit Backend API

Real-time collaborative inventory management system backend.

## Setup

### 1. Prerequisites
- Node.js 16+ 
- PostgreSQL 12+ (Neon recommended for serverless)
- pnpm or npm

### 2. Installation

```bash
cd server
pnpm install
```

### 3. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure the following:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nolimit

# Server
PORT=5000
NODE_ENV=development

# JWT (for API authentication)
JWT_SECRET=your-secret-key-here

# CORS (for frontend connections)
FRONTEND_URL=http://localhost:3000
```

### 4. Database Setup

For PostgreSQL/Neon:

```bash
# Run migrations
pnpm run migrate

# Or manually run SQL:
psql -U user -d nolimit -f src/migrations/001-init-schema.sql
```

### 5. Start Development Server

```bash
pnpm run dev
```

Server will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

### Movements
- `GET /api/movements` - List movements
- `POST /api/movements` - Create movement
- `PUT /api/movements/:id` - Update movement
- `DELETE /api/movements/:id` - Delete movement
- `POST /api/movements/:id/approve` - Approve entry request
- `POST /api/movements/:id/reject` - Reject entry request

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Stocks
- `GET /api/stocks` - List stock levels
- `GET /api/stocks/site/:siteId` - Stock by site

### Reports
- `GET /api/reports` - List saved reports
- `POST /api/reports` - Create report
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/damage` - Damage report

## WebSocket Events

Real-time synchronization via Socket.io:

### Subscriptions
```javascript
socket.emit('subscribe:movements', { userId: 'optional' });
socket.emit('subscribe:requests');
```

### Events
- `movement:created` - New movement recorded
- `movement:updated` - Movement updated
- `movement:deleted` - Movement deleted
- `request:created` - New entry request
- `request:approved` - Request approved
- `request:rejected` - Request rejected
- `stock:updated` - Stock level changed

## Deployment

### Render

```bash
# Build for production
pnpm run build

# Deploy to Render
vercel deploy --prod
```

### Vercel

```bash
# Deploy serverless function
vercel deploy
```

## Database Schema

### tables
- `users` - User accounts
- `sites` - Physical locations
- `products` - Inventory items
- `stocks` - Stock levels by site
- `movements` - Entry/exit/transfer records
- `reports` - Generated reports

## Rate Limiting

API has built-in rate limiting:
- 100 requests/minute per IP (development)
- 1000 requests/minute (production)

## CORS

Frontend must be configured in `.env`:

```env
FRONTEND_URL=http://localhost:3000,https://yourdomain.com
```

## Troubleshooting

### Database Connection Issues
Check `DATABASE_URL` format and PostgreSQL is running.

### WebSocket Not Connecting
Ensure `FRONTEND_URL` matches your client origin.

### Port Already in Use
Change `PORT` in `.env` or kill process using port 5000.

## Support

For issues or questions, check the main README.md
