# Testing Guide - NLLimit Online Collaboration System

Complete testing procedures for the system.

## Testing Scenarios

### Scenario 1: Multi-User Entry Request Approval

**Goal**: Test that entry requests appear in real-time across users

**Setup**:
- 2 browsers open: one as Admin (Douala), one as Operator (Bafoussam)
- Both logged in

**Steps**:
1. **Operator** (Bafoussam):
   - Go to Movements page
   - Click "Entrée de Stock" (Entry)
   - Select product "Artémisia"
   - Quantity: 50
   - Click "Soumettre la demande" (Submit Request)

2. **Admin** (Douala):
   - Watch MovementsPage → should see "1 demande(s) en attente" notification
   - PendingApprovalsAdmin panel updates instantly
   - Request shows: +50 Artémisia demand from Operator

3. **Admin**:
   - Click "Valider" (Approve) button
   - Confirm approval

4. **Operator**:
   - Check Dashboard → stock updates show +50 Artémisia added
   - Verify no "request pending" notification anymore

**Expected Result**: Real-time updates across both users without page refresh

### Scenario 2: Free Exits (No Approval Needed)

**Goal**: Verify exits are immediate and don't require approval

**Setup**:
- Logged in as any user
- Products in stock

**Steps**:
1. Go to Movements page
2. Click "Vente/Sortie" (Exit/Sale)
3. Select product with sufficient stock
4. Enter quantity (less than available)
5. Click "Confirmer" (Confirm)

**Expected Result**:
- Stock immediately reduced
- No "pending approval" status
- No approval panel shown to admin
- Movement appears as type 'out', status 'confirmed'

### Scenario 3: Report Access Control

**Goal**: Verify reports are filtered by role and site access

**Setup**:
- 3 test users:
  - User A: Operator at Douala
  - User B: Manager at Bafoussam
  - User C: Admin (all sites)

**Test A - Operator Reports**:
1. Login as User A (Operator)
2. Go to Reports page
3. Create new report: "My Test Report"
4. Logout
5. Login as User C (Admin)
6. Go to Reports page
7. Verify User A's report is visible
8. Login as User B (Manager)
9. Verify User A's report is NOT visible (different site)

**Test B - Manager Reports**:
1. Login as User B (Manager for Bafoussam)
2. Go to Reports page
3. Create report for "Mouvements" with "site Bafoussam"
4. Logout
5. Login as User C (Admin)
6. Verify User B's report is visible
7. Create multi-site report
8. Login as User B
9. Verify multi-site reports are NOT visible (permission denied)

**Expected Result**:
- Operators see only own reports
- Managers see own + site-specific reports
- Admins see all reports
- Multi-site reports only visible to admins

### Scenario 4: Site-Based Data Filtering

**Goal**: Verify data is filtered by user's assigned sites

**Setup**:
- Operator assigned to Douala only
- Admin with all sites access

**Steps**:
1. Login as Operator (Douala only)
2. Go to Movements page
3. Verify only movements from Douala show
4. Try to select "Bafoussam" in site filter
5. Verify movements still show only Douala

**Expected Result**:
- Operators only see their assigned sites
- Can't view data from other sites
- Site filters disabled if only 1 site assigned

### Scenario 5: Real-Time Sync on Movement Approval

**Goal**: Test WebSocket syncing when movements are approved

**Setup**:
- 2 browsers: Admin and Manager
- Both on Movements page
- DevTools Network tab open, filter by WS

**Steps**:
1. **Manager**: Create entry request (+30 units product X)
2. **Admin**: Observe PendingApprovalsPanel updates (check WS message)
3. **Admin**: Approve request
4. **Manager**: Check Dashboard → stock updates in real-time (within 1 second)
5. **Both**: Check Movements page → new movement appears

**Expected Result**:
- WebSocket messages sent for: `request:created`, `request:approved`
- UI updates instantly on both users
- No page refresh needed
- Movement appears with status 'approved'

### Scenario 6: Offline Functionality

**Goal**: Verify app works offline and syncs when reconnected

**Setup**:
- Internet connection available
- Browser DevTools open

**Steps**:
1. Open app and load data
2. Go to DevTools > Network tab
3. Throttle to "Offline"
4. Try to create a movement
5. Verify error message appears
6. Throttle back to "Online"
7. Retry movement creation
8. Verify sync succeeds

**Expected Result**:
- App shows "Connection lost" banner when offline
- User can see cached data
- Operations fail with clear error when offline
- Auto-reconnect when connection restored

## Performance Testing

### Load Test: Many Movements

```javascript
// Run in browser console
const db = window.__db__;
const startTime = performance.now();

// Create 100 movements
for (let i = 0; i < 100; i++) {
  db.createMovement({
    type: 'in',
    status: 'confirmed',
    product_id: 1,
    quantity: 10,
    to_site_id: 'DLA',
    user_id: 1,
  });
}

const endTime = performance.now();
console.log(`Created 100 movements in ${endTime - startTime}ms`);
console.log(`Average: ${(endTime - startTime) / 100}ms per movement`);
```

**Expected**: < 100ms for 100 movements

### WebSocket Stress Test

```bash
# Use wscat to send many messages
npm install -g wscat
wscat -c ws://localhost:5000

# Send 100 messages
for i in {1..100}; do
  echo "test message $i" | wscat -c ws://localhost:5000
done
```

**Expected**: No dropped connections, < 100ms response time per message

## Browser Compatibility Testing

### Browsers to Test
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari 14+, Chrome Mobile

### Test Checklist
- [ ] All buttons clickable on mobile
- [ ] Forms responsive on small screens
- [ ] WebSocket connects on all browsers
- [ ] IndexedDB works for offline storage
- [ ] Export CSV downloads correctly

## Security Testing

### SQL Injection Test
1. Go to Movements page
2. Try Search: `' OR '1'='1`
3. Verify no unexpected results
4. Check backend logs for sanitization

### XSS Test
1. Create product with name: `<script>alert('XSS')</script>`
2. Verify script doesn't execute
3. Check name is displayed as text

### Authentication Test
1. Login as User A
2. Open DevTools > Storage > IndexedDB
3. Copy user token from 'auth' store
4. Logout
5. Try to modify token in DevTools
6. Verify backend rejects stale token
7. Verify user must re-login

## Regression Testing Checklist

Run after each major change:

### Authentication
- [ ] Login works
- [ ] Logout works
- [ ] Session persists on page reload
- [ ] Invalid credentials rejected
- [ ] Password validation enforced

### Movements
- [ ] Create entry (pending)
- [ ] Create exit (confirmed)
- [ ] Transfer between sites
- [ ] Approve entry request
- [ ] Reject entry request

### Reporting
- [ ] Generate inventory report
- [ ] Generate sales report
- [ ] Generate damage report
- [ ] Export to CSV
- [ ] Export to JSON
- [ ] View saved reports
- [ ] Delete report

### Permissions
- [ ] Operator sees only own data
- [ ] Manager sees assigned sites
- [ ] Admin sees all data
- [ ] Export disabled if no permission
- [ ] Report creation respects permissions

### Real-Time Sync
- [ ] Movement created in one user shows in another
- [ ] Stock updates instantly across users
- [ ] Request approval syncs in real-time
- [ ] Report generation notifies creator

## Deployment Verification

After deploying to production:

### Health Checks
```bash
# 1. Check API is running
curl https://api.yourdomain.com/health

# 2. Check WebSocket connects
wscat -c wss://api.yourdomain.com

# 3. Check frontend loads
curl https://yourdomain.com

# 4. Check database connects
psql "your-connection-string" -c "SELECT 1;"
```

### Smoke Test
1. Open frontend in browser
2. Login with test account
3. Create movement
4. Verify it appears for other user
5. Create report
6. Verify admin can see it
7. Approve entry request
8. Verify stock updates

### Performance Monitoring
- Frontend load time: < 3 seconds
- API response time: < 200ms
- WebSocket latency: < 100ms
- Database query time: < 50ms

## Bug Reporting

When you find a bug:

1. **Reproduce**: Document exact steps
2. **Screenshot**: Capture current state
3. **Logs**: Check browser console for errors
4. **Backend logs**: Check server logs
5. **Report**:
   - Title: Clear description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Browser/OS/version
   - Screenshots/video if possible

## Continuous Testing

### Automated Tests (Future)
```bash
# Unit tests (components, services)
pnpm run test:unit

# Integration tests (API endpoints)
pnpm run test:integration

# E2E tests (full user flows)
pnpm run test:e2e

# Test coverage
pnpm run test:coverage
```

## Success Criteria

✅ System is ready for production when:

- All test scenarios pass
- No console errors on main flows
- WebSocket connects reliably
- Real-time sync works across all browsers
- Reports filter correctly by permission
- Exits don't require approval
- Entries do require approval
- Performance meets targets
- No security vulnerabilities found
- Mobile interface is usable
- Deployment verified successfully
