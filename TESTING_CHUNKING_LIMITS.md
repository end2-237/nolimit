# Guide de Test: Vérifier Chunking & Gzip en Production

## 🧪 Tests Pratiques à Exécuter

### Test 1: Vérifier la Compression Gzip

**Objectif:** Confirmer que gzip réduit vraiment les données de 80-90%

**Code à ajouter dans `CloudSyncPanel.tsx`:**

```typescript
// Test compression ratio
async function testCompression() {
  const testData = {
    products: Array(1000).fill({
      id: Math.random(),
      name: 'Test Product',
      sku: 'SKU-12345',
      price: 99.99,
      stock: 100,
      category: 'category',
      description: 'Long description here...',
    }),
    stocks: Array(5000).fill({
      product_id: Math.random(),
      site_id: 'site-1',
      quantity: 50,
      timestamp: new Date().toISOString(),
    }),
  };

  const jsonString = JSON.stringify(testData);
  const originalSize = new Blob([jsonString]).size;
  
  // Test compression
  const compressed = pako.gzip(new TextEncoder().encode(jsonString), { level: 9 });
  const compressedSize = compressed.length;
  const ratio = ((compressedSize / originalSize) * 100).toFixed(2);
  
  console.log(`
    ✅ Compression Test Results:
    Original size:     ${(originalSize / 1024 / 1024).toFixed(2)} MB
    Compressed size:   ${(compressedSize / 1024 / 1024).toFixed(2)} MB
    Compression ratio: ${100 - parseFloat(ratio)}% reduction
    Expected:          80-90%
    Status:            ${parseFloat(ratio) < 20 ? '✅ PASS' : '❌ FAIL'}
  `);
}

// Run test
await testCompression();
```

**Expected Output:**
```
✅ Compression Test Results:
Original size:     2.50 MB
Compressed size:   0.38 MB
Compression ratio: 84.8% reduction
Expected:          80-90%
Status:            ✅ PASS
```

---

### Test 2: Vérifier le Chunking

**Objectif:** Confirmer que les données sont bien divisées en chunks ≤ 4 MB

**Code:**

```typescript
async function testChunking() {
  const largeData = {
    movements: Array(100000).fill({
      id: Math.random(),
      type: 'transfer',
      quantity: 50,
      from_site: 'SITE-A',
      to_site: 'SITE-B',
      timestamp: new Date().toISOString(),
      reason: 'Stock rebalancing due to demand',
    }),
  };

  // Compress
  const jsonString = JSON.stringify(largeData);
  const compressed = pako.gzip(new TextEncoder().encode(jsonString), { level: 9 });
  
  // Chunk
  const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
  const chunks = [];
  for (let i = 0; i < compressed.length; i += MAX_CHUNK_SIZE) {
    chunks.push(compressed.slice(i, i + MAX_CHUNK_SIZE));
  }
  
  console.log(`
    ✅ Chunking Test Results:
    Total data:        ${(compressed.length / 1024 / 1024).toFixed(2)} MB
    Max chunk size:    ${(MAX_CHUNK_SIZE / 1024 / 1024).toFixed(0)} MB
    Number of chunks:  ${chunks.length}
    
    Chunk breakdown:
    ${chunks.map((c, i) => `  Chunk ${i + 1}: ${(c.length / 1024 / 1024).toFixed(2)} MB`).join('\n')}
    
    Status:            ${chunks.every(c => c.length <= MAX_CHUNK_SIZE) ? '✅ PASS' : '❌ FAIL'}
  `);
}

await testChunking();
```

**Expected Output:**
```
✅ Chunking Test Results:
Total data:        5.23 MB
Max chunk size:    4 MB
Number of chunks:  2

Chunk breakdown:
  Chunk 1: 4.00 MB
  Chunk 2: 1.23 MB

Status:            ✅ PASS
```

---

### Test 3: Vérifier la Performance de Upload

**Objectif:** Mesurer le temps réel d'upload et la stabilité

**Configuration:**

1. **Ouvrir DevTools** (F12)
2. **Network tab** → Filter HTTP/XHR
3. **Go to Cloud Sync Panel**
4. **Click "Backup (Export)"**
5. **Watch les chunks s'uploader**

**Expectations:**

| Métrique | Valeur Attendue | Votre Mesure |
|----------|-----------------|---|
| Chunk 1 upload | 2-5 secondes | ___ |
| Total time (13 chunks) | 30-65 secondes | ___ |
| Compression ratio | 80-95% | ___ |
| Final message | "✅ Sauvegarde réussie" | ___ |
| Errors | None | ___ |

**Good Signs:**
```
✅ [09:15:30] Export de la base de données...
✅ [09:15:32] Envoi de 45.2 KB vers le cloud...
✅ [09:15:33] Chunk 1/13 uploaded successfully
✅ [09:15:36] Chunk 2/13 uploaded successfully
...
✅ [09:16:15] Sync completed successfully in 45.23s
```

**Bad Signs (Action Required):**
```
❌ [09:15:30] Chunk 1/13 failed: HTTP 413 (Payload too large)
   → Reduce MAX_PAYLOAD_SIZE in chunkedSync.ts

❌ [09:15:30] Timeout after 30s
   → Increase timeout or reduce chunk size

❌ [09:15:30] Network error: CORS issue
   → Run in Electron mode (not browser)
```

---

### Test 4: Vérifier le Retry Automatique

**Objectif:** Simuler une défaillance réseau et confirmer le retry

**Simulation (sur Chrome DevTools):**

1. **Network tab** → Click "Offline"
2. **Go to Cloud Sync** → Click "Backup"
3. **Wait ~5 seconds**
4. **Network tab** → Click "Online"
5. **Watch retry avec backoff exponentiel**

**Expected Console Logs:**

```
[v0] Uploading chunk 5/13 (4.00 MB)
[v0] Upload failed: Network error
[v0] Retry 1/3 for chunk 5 after 1000ms
   (pause 1 second)
[v0] Retry attempt 2/3...
   (pause 2 seconds)
[v0] Retry attempt 3/3...
   (pause 4 seconds)
[v0] Chunk 5/13 uploaded successfully
```

**Backoff Formula Check:**
- Attempt 0: Immediate (fail)
- Attempt 1: 2^0 × 1000 = 1000ms
- Attempt 2: 2^1 × 1000 = 2000ms
- Attempt 3: 2^2 × 1000 = 4000ms

✅ **Exponential backoff working correctly**

---

### Test 5: Vérifier les Logs Détaillés

**Objectif:** Confirmer que tous les debug logs ([v0]) sont présents

**Open Console (F12) and run:**

```javascript
// Filter to show only v0 logs
console.log("Filtering [v0] logs...");

// Trigger sync
// Then read console

// Expected logs:
/*
[v0] Starting client-side sync...
[v0] Session ID: sync-1234-abcd
[v0] Starting client-side compression...
[v0] Original size: 250.50 MB
[v0] Compressed size: 45.23 MB
[v0] Compression ratio: 81.9%
[v0] Data split into 13 chunk(s) (max 4.0 MB each)
[v0] Uploading 13 chunk(s) to https://...
[v0] Uploading chunk 1/13 (4.00 MB)
[v0] Chunk 1/13 uploaded successfully
... (repeat for each chunk)
[v0] Sync completed successfully in 45.23s
[v0] - Original: 250.50 MB
[v0] - Compressed: 45.23 MB
[v0] - Ratio: 81.9% reduction
*/
```

**Verification Checklist:**
- [ ] "Original size" logged correctly
- [ ] "Compressed size" is 80-95% smaller
- [ ] Compression ratio percentage correct
- [ ] Chunk count matches calculation
- [ ] Each chunk 4.0 MB or less
- [ ] All chunks uploaded successfully
- [ ] Final summary shows correct times

---

### Test 6: Vérifier la Limite de 4.5 MB Vercel

**Objectif:** S'assurer qu'on ne dépasse jamais la limite Vercel

**Code de Monitoring:**

```typescript
// In API handler (server-side)
export async function POST(req: Request) {
  const contentLength = req.headers.get('content-length');
  const payloadSize = parseInt(contentLength || '0');
  
  const vercelLimit = 4.5 * 1024 * 1024; // 4.5 MB
  const maxSafeSize = 4 * 1024 * 1024;   // 4 MB (your limit)
  
  console.log(`
    Payload size:  ${(payloadSize / 1024 / 1024).toFixed(2)} MB
    Vercel limit:  ${(vercelLimit / 1024 / 1024).toFixed(2)} MB
    Your limit:    ${(maxSafeSize / 1024 / 1024).toFixed(0)} MB
    Headroom:      ${((vercelLimit - payloadSize) / 1024 / 1024).toFixed(2)} MB
    Status:        ${payloadSize <= maxSafeSize ? '✅ SAFE' : '❌ TOO LARGE'}
  `);
  
  if (payloadSize > vercelLimit) {
    return new Response('Payload too large', { status: 413 });
  }
  
  // ... process chunk ...
}
```

**Expected for 4 MB chunks:**
```
Payload size:  4.02 MB (with JSON metadata)
Vercel limit:  4.50 MB
Your limit:    4.00 MB
Headroom:      0.48 MB
Status:        ✅ SAFE
```

---

### Test 7: Vérifier Supabase Limits

**Objective:** Confirm that Supabase can receive and store the data

**Test Query (in Supabase Dashboard):**

```sql
-- Check table size
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public';

-- Expected output for sync_backups:
-- table_name     | size
-- ───────────────┼──────────
-- sync_backups   | 50 MB (if one backup stored)
-- (other tables) | ...
```

**Check row size:**

```sql
-- For your backup row
SELECT 
  id,
  session_id,
  pg_column_size(compressed_data) as data_size_bytes
FROM sync_backups
WHERE session_id = 'sync-1234-abcd'
LIMIT 1;

-- Expected output:
-- id  | session_id      | data_size_bytes
-- ────┼─────────────────┼─────────────
-- 1   | sync-1234-abcd  | 50000000 (50 MB)
```

**Check quotas:**

```sql
-- In Supabase dashboard:
-- Settings → Billing → Storage
-- - Database size: 50 MB / 500 MB (Free) ✅ OK
-- - Bandwidth: 400 MB / 2000 MB (Free) ✅ OK
```

---

### Test 8: End-to-End Load Test

**Objective:** Test with realistic data volume

**Procedure:**

1. **Export your real database** (File menu → Export Database)
2. **Note file size** (e.g., "250 MB")
3. **Go to Cloud Sync Panel**
4. **Click "Backup (Export)"**
5. **Monitor:**
   - [ ] Console logs appear
   - [ ] Progress updates
   - [ ] No timeout error
   - [ ] Success message
6. **Measure:**
   - [ ] Total time taken
   - [ ] Compression ratio achieved
   - [ ] Data in Supabase (query table)

**Sample Results:**

```
Original export:        250.5 MB
Gzip compressed:        45.2 MB (81.9% reduction) ✅
Chunks created:         12 (4 MB each)
Upload time:            45 seconds (1/sec average)
Network speed:          ~1 MB/s
Success:                ✅ YES
Data in Supabase:       ✅ CONFIRMED

Average compression:    82.1% (within 80-95% expected)
Performance rating:     ✅ EXCELLENT
```

---

### Test 9: Verify Decompression on Download

**Objective:** Test that downloaded data decompresses correctly

**Code:**

```typescript
// In your CloudSyncPanel, test restore
async function testDownloadDecompression() {
  const apiUrl = form.url;
  const apiKey = form.apiKey;
  const siteId = form.siteId;
  
  try {
    // Download compressed data
    const response = await fetch(
      `${apiUrl}/api/sync?siteId=${siteId}`,
      { headers: { 'X-API-KEY': apiKey } }
    );
    
    const { data: base64Data } = await response.json();
    
    // Decompress
    const compressed = new Uint8Array(
      atob(base64Data).split('').map(c => c.charCodeAt(0))
    );
    
    const decompressed = pako.ungzip(compressed);
    const jsonString = new TextDecoder().decode(decompressed);
    const parsed = JSON.parse(jsonString);
    
    console.log(`
      ✅ Decompression Test:
      Original (compressed): ${(compressed.length / 1024 / 1024).toFixed(2)} MB
      Decompressed:          ${(decompressed.length / 1024 / 1024).toFixed(2)} MB
      Parsed products:       ${parsed.products?.length || 0}
      Parsed stocks:         ${Object.keys(parsed.stocks || {}).length} sites
      Status:                ✅ PASS
    `);
  } catch (error) {
    console.error('❌ Decompression failed:', error);
  }
}

await testDownloadDecompression();
```

**Expected Success:**
```
✅ Decompression Test:
Original (compressed): 45.23 MB
Decompressed:          250.50 MB
Parsed products:       5000
Parsed stocks:         12 sites
Status:                ✅ PASS
```

---

### Test 10: Stress Test (Large Dataset)

**Objective:** Find practical limits of your system

**Setup:**

```typescript
async function stressTest() {
  const testSizes = [
    { name: '100 MB', products: 5000 * 100, stocks: 10000 * 100 },
    { name: '500 MB', products: 5000 * 500, stocks: 10000 * 500 },
    { name: '1 GB', products: 5000 * 1000, stocks: 10000 * 1000 },
  ];
  
  for (const test of testSizes) {
    const data = {
      products: Array(test.products).fill({
        id: Math.random(),
        name: 'Product',
        sku: 'SKU',
        price: 99.99,
      }),
      stocks: Array(test.stocks).fill({
        product_id: Math.random(),
        quantity: 100,
      }),
    };
    
    const startTime = performance.now();
    const result = await chunkedSync.syncData(data, apiUrl, apiKey, siteId);
    const duration = performance.now() - startTime;
    
    console.log(`
      Test: ${test.name}
      Time: ${(duration / 1000).toFixed(2)}s
      Chunks: ${result.chunks}
      Ratio: ${result.compressionRatio.toFixed(1)}%
      Speed: ${(result.uploadedSize / duration * 1000 / 1024 / 1024).toFixed(2)} MB/s
    `);
  }
}

await stressTest();
```

**Expected Output:**

```
Test: 100 MB
Time: 15.23s
Chunks: 3
Ratio: 81.5%
Speed: 5.45 MB/s

Test: 500 MB
Time: 75.45s
Chunks: 13
Ratio: 82.1%
Speed: 5.32 MB/s

Test: 1 GB
Time: 150.78s
Chunks: 26
Ratio: 81.9%
Speed: 5.28 MB/s

✅ Linear scaling (expected)
✅ No memory issues
✅ Network stable
```

---

## 📊 Test Results Template

Copy this and fill as you run tests:

```
┌─────────────────────────────────────────────────────────┐
│           CHUNKING & COMPRESSION TEST RESULTS           │
├─────────────────────────────────────────────────────────┤
│ Date: _______________  Device: _______________         │
│ Network: _______________  Connection: _________          │
│                                                         │
│ TEST 1: Compression                                    │
│   Original size:    __________ MB                       │
│   Compressed size:  __________ MB                       │
│   Ratio:            __________% (Expected: 80-95%)      │
│   Status:           ✅ / ❌                              │
│                                                         │
│ TEST 2: Chunking                                       │
│   Total chunks:     __________ (Expected: 4 MB each)   │
│   Largest chunk:    __________ MB (Expected: < 4 MB)   │
│   Status:           ✅ / ❌                              │
│                                                         │
│ TEST 3: Upload Performance                             │
│   Total time:       __________ seconds                 │
│   Avg per chunk:    __________ seconds                 │
│   Network speed:    __________ Mbps                    │
│   Status:           ✅ / ❌                              │
│                                                         │
│ TEST 4: Retry Handling                                 │
│   Simulated failures: __________ (0-3 retries)         │
│   Successfully recovered: ✅ / ❌                        │
│                                                         │
│ TEST 5: Download/Decompress                            │
│   Decompressed size: __________ MB                      │
│   Matches original: ✅ / ❌                              │
│   Data integrity: ✅ / ❌                                │
│                                                         │
│ NOTES:                                                  │
│ _____________________________________________________  │
│ _____________________________________________________  │
│                                                         │
│ CONCLUSION: PRODUCTION READY ✅ / NEEDS WORK ❌        │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Final Verification Checklist

Before deploying to production, verify:

- [ ] **Compression** - Ratio is 80-95%
- [ ] **Chunking** - Each chunk ≤ 4 MB
- [ ] **Retry** - Automatic retry with backoff works
- [ ] **Timeout** - No timeout errors on typical data
- [ ] **Network** - Works on 4G/WiFi/3G
- [ ] **Storage** - Data persists in Supabase
- [ ] **Download** - Decompression works correctly
- [ ] **Logs** - All [v0] debug logs appear
- [ ] **Error handling** - User sees clear error messages
- [ ] **Progress** - Progress bar updates smoothly

**All checked?** ✅ **SHIP IT!**

**Any failed?** ❌ **Check CHUNKING_GZIP_ANALYSIS.md for solutions**
