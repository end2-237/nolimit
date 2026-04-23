
# NLLimit - Online Collaborative Inventory Management

A real-time multi-user inventory management system with online collaboration, role-based access control, and simplified workflow.

## Features

✅ **Online Collaboration**
- Real-time data synchronization across multiple users
- Admin in Douala sees operator requests from Bafoussam instantly
- WebSocket-based real-time updates (Socket.io)
- No page refresh needed for real-time changes

✅ **Simplified Workflow**
- Exits/Sales: Free and immediate (no approval needed)
- Entries: Require approval from manager/admin
- Flexible request handling based on user role

✅ **Role-Based Access Control**
- Operators: See only their own reports and assigned sites
- Managers: See reports for assigned sites
- Admins: Full access to all data across all sites
- Enforced at database level for security

✅ **Production Ready**
- Express.js backend with PostgreSQL
- Real-time sync via Socket.io WebSocket
- Comprehensive API for all operations
- Deployment guides for Vercel/Render

## Quick Start

For local development in 5 minutes, see [QUICKSTART.md](./QUICKSTART.md)

```bash
# Install dependencies
pnpm install

# Start frontend (Terminal 1)
pnpm run dev

# Start backend (Terminal 2)
cd server
pnpm run dev

# Open http://localhost:3000
```

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│ React       │◄───────►│ Express API  │◄───────►│ PostgreSQL     │
│ Frontend    │ HTTP    │ Backend      │ TCP     │ Database       │
│ (IndexedDB) │         │ (Socket.io)  │         │                │
└─────────────┘         └──────────────┘         └────────────────┘
       ▲                        ▲
       └────── WebSocket ───────┘
```

## Key Changes from Local Version

1. **Multi-User Support**: Added backend API with real-time WebSocket sync
2. **No Exit Approval**: Exits are immediate (type='out' → status='confirmed')
3. **Report Access Control**: Strict filtering by role and site assignment
4. **Database Backend**: PostgreSQL replaces pure local storage

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing procedures
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Complete change summary
- **[server/README.md](./server/README.md)** - Backend API documentation

## Running the code

### Frontend Only (Local Mode)
```bash
pnpm install
pnpm run dev
# Frontend at http://localhost:3000
# Uses local IndexedDB (no backend needed)
```

### Full Stack (Online Collaboration)
See [QUICKSTART.md](./QUICKSTART.md) for detailed setup including backend setup.
  
