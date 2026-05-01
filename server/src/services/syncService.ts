/**
 * Hybrid Sync Service
 * - Manages sync between local Electron (SQLite) and Neon (PostgreSQL)
 * - Handles conflict resolution when local changes conflict with remote
 * - Implements Last-Write-Wins (LWW) conflict strategy
 */

import { query } from '../db';

interface SyncRecord {
  table: string;
  id: number;
  data: any;
  timestamp: string;
}

interface ConflictResolution {
  strategy: 'local-wins' | 'remote-wins' | 'merge';
  reason: string;
}

/**
 * Hash a record for change detection
 */
export function hashRecord(data: any): string {
  const json = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Detect conflicts between local and remote records
 */
async function detectConflict(
  table: string,
  id: number,
  localHash: string,
  remoteData: any
): Promise<{ hasConflict: boolean; resolution: ConflictResolution }> {
  const remoteHash = hashRecord(remoteData);
  
  // Get local hash from sync metadata
  const result = await query(
    'SELECT local_hash, remote_hash, last_sync FROM sync_metadata WHERE table_name = $1 AND record_id = $2',
    [table, id]
  );

  const metadata = result.rows[0];

  // No conflict if remote hasn't changed since last sync
  if (metadata?.remote_hash === remoteHash) {
    return {
      hasConflict: false,
      resolution: { strategy: 'local-wins', reason: 'Remote unchanged' }
    };
  }

  // Conflict if both local and remote have changed
  if (metadata && localHash !== metadata.local_hash && remoteHash !== metadata.remote_hash) {
    return {
      hasConflict: true,
      resolution: {
        strategy: 'remote-wins',
        reason: 'Last-Write-Wins: using remote (server) version'
      }
    };
  }

  // No conflict if only local changed
  if (metadata?.remote_hash === remoteHash) {
    return {
      hasConflict: false,
      resolution: { strategy: 'local-wins', reason: 'Only local changed' }
    };
  }

  return {
    hasConflict: false,
    resolution: { strategy: 'local-wins', reason: 'First sync' }
  };
}

/**
 * Apply local changes to remote database (one-way: local → remote only)
 */
export async function pushToRemote(
  records: SyncRecord[]
): Promise<{ success: number; failed: number; conflicts: any[] }> {
  const conflicts: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const record of records) {
    try {
      // Check for conflicts first
      const localHash = hashRecord(record.data);
      const remoteResult = await query(
        `SELECT * FROM ${record.table} WHERE id = $1`,
        [record.id]
      );

      if (remoteResult.rows.length > 0) {
        const conflict = await detectConflict(
          record.table,
          record.id,
          localHash,
          remoteResult.rows[0]
        );

        if (conflict.hasConflict) {
          conflicts.push({
            table: record.table,
            id: record.id,
            resolution: conflict.resolution
          });
          failCount++;
          continue;
        }
      }

      // Upsert record with sync metadata
      const columns = Object.keys(record.data);
      const values = Object.values(record.data);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      
      await query(
        `INSERT INTO ${record.table} (${columns.join(', ')}) 
         VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET 
         ${columns.map(c => `${c} = EXCLUDED.${c}`).join(', ')}, synced_at = CURRENT_TIMESTAMP`,
        values
      );

      // Update sync metadata
      await query(
        `INSERT INTO sync_metadata (table_name, record_id, local_hash, remote_hash, last_sync, conflict_resolution)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
         ON CONFLICT (table_name, record_id) DO UPDATE SET
         local_hash = $3, remote_hash = $4, last_sync = CURRENT_TIMESTAMP, conflict_resolution = $5`,
        [record.table, record.id, localHash, localHash, 'none']
      );

      successCount++;
    } catch (error) {
      console.error(`[Sync] Error pushing ${record.table}:${record.id}:`, error);
      failCount++;
    }
  }

  return { success: successCount, failed: failCount, conflicts };
}

/**
 * Pull remote changes to local (for informational endpoints only)
 * Local Electron app decides what to do with these
 */
export async function pullFromRemote(tables: string[], since?: string) {
  const result: Record<string, any[]> = {};

  for (const table of tables) {
    try {
      const query_text = since
        ? `SELECT * FROM ${table} WHERE synced_at > $1 ORDER BY synced_at DESC`
        : `SELECT * FROM ${table} ORDER BY synced_at DESC`;
      
      const params = since ? [since] : [];
      const dbResult = await query(query_text, params);
      result[table] = dbResult.rows;
    } catch (error) {
      console.error(`[Sync] Error pulling ${table}:`, error);
      result[table] = [];
    }
  }

  return result;
}

/**
 * Get sync status and conflicts
 */
export async function getSyncStatus() {
  try {
    const metadata = await query(
      'SELECT table_name, COUNT(*) as record_count, COUNT(CASE WHEN conflict_resolution != \'none\' THEN 1 END) as conflicts FROM sync_metadata GROUP BY table_name'
    );

    return metadata.rows;
  } catch (error) {
    console.error('[Sync] Error getting status:', error);
    return [];
  }
}

/**
 * Resolve pending conflicts (manual intervention)
 */
export async function resolveConflict(
  table: string,
  id: number,
  strategy: 'local-wins' | 'remote-wins'
) {
  try {
    await query(
      'UPDATE sync_metadata SET conflict_resolution = $1, last_sync = CURRENT_TIMESTAMP WHERE table_name = $2 AND record_id = $3',
      [strategy, table, id]
    );
    return { success: true };
  } catch (error) {
    console.error('[Sync] Error resolving conflict:', error);
    return { success: false, error };
  }
}
