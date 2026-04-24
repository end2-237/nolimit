import express from 'express';
import { pushToRemote, pullFromRemote, getSyncStatus, resolveConflict, hashRecord } from '../services/syncService';

const router = express.Router();

/**
 * POST /api/sync/push
 * Push local changes to remote
 * Body: { records: [{ table, id, data, timestamp }] }
 */
router.post('/push', async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Invalid records format' });
    }

    // Limit batch size
    if (records.length > 10000) {
      return res.status(413).json({ 
        error: 'Too many records in single sync',
        maxAllowed: 10000,
        received: records.length 
      });
    }

    console.log(`[Sync] Pushing ${records.length} records to Neon`);
    const result = await pushToRemote(records);

    res.json({
      success: true,
      pushed: result.success,
      failed: result.failed,
      conflicts: result.conflicts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync] Push error:', error);
    res.status(500).json({
      error: 'Sync push failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sync/pull
 * Pull remote changes since last sync
 * Query: ?since=2026-04-24T10:00:00Z&tables=movements,products,stocks
 */
router.get('/pull', async (req, res) => {
  try {
    const { since, tables: tablesParam } = req.query;
    const tables = (tablesParam as string)?.split(',') || ['movements', 'products', 'stocks', 'alerts'];

    // Validate tables
    const allowedTables = ['movements', 'products', 'stocks', 'alerts', 'users', 'reports'];
    const validTables = tables.filter(t => allowedTables.includes(t));

    if (validTables.length === 0) {
      return res.status(400).json({ error: 'No valid tables specified' });
    }

    console.log(`[Sync] Pulling from tables:`, validTables, `since: ${since || 'beginning'}`);
    const result = await pullFromRemote(validTables, since as string | undefined);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      note: 'These are informational only. Local app decides whether to apply changes.'
    });
  } catch (error) {
    console.error('[Sync] Pull error:', error);
    res.status(500).json({
      error: 'Sync pull failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sync/status
 * Get current sync status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getSyncStatus();

    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      summary: {
        totalRecordsSynced: status.reduce((sum: number, s: any) => sum + (s.record_count || 0), 0),
        totalConflicts: status.reduce((sum: number, s: any) => sum + (s.conflicts || 0), 0)
      }
    });
  } catch (error) {
    console.error('[Sync] Status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sync/resolve
 * Resolve a conflict manually
 * Body: { table, id, strategy: 'local-wins'|'remote-wins' }
 */
router.post('/resolve', async (req, res) => {
  try {
    const { table, id, strategy } = req.body;

    if (!table || !id || !['local-wins', 'remote-wins'].includes(strategy)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const result = await resolveConflict(table, id, strategy);

    if (result.success) {
      res.json({
        success: true,
        message: `Conflict resolved with strategy: ${strategy}`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to resolve conflict',
        message: result.error
      });
    }
  } catch (error) {
    console.error('[Sync] Resolve error:', error);
    res.status(500).json({
      error: 'Conflict resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
