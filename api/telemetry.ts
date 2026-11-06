import { Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'telemetry.db');
  db = new DatabaseSync(dbPath);

  // WAL mode for fast concurrent writes and reads
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      platform TEXT NOT NULL,
      device_id TEXT NOT NULL,
      table_id TEXT,
      theme TEXT,
      version TEXT,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_telemetry_event ON telemetry_events(event);
    CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry_events(device_id);
  `);

  return db;
}

export async function telemetryHandler(req: Request, res: Response) {
  const database = getDb();
  const subPath = req.path.replace(/^\/api\/telemetry\/?/, '');

  if (req.method === 'POST' && (subPath === 'ping' || subPath === '')) {
    try {
      const { event, platform, deviceId, tableId, theme, version } = req.body || {};

      if (!event || !platform || !deviceId) {
        return res.status(400).json({ status: 'error', message: 'Missing event, platform or deviceId' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

      const insertStmt = database.prepare(`
        INSERT INTO telemetry_events (event, platform, device_id, table_id, theme, version, ip)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        String(event).slice(0, 50),
        String(platform).slice(0, 30),
        String(deviceId).slice(0, 100),
        tableId ? String(tableId).slice(0, 100) : null,
        theme ? String(theme).slice(0, 30) : null,
        version ? String(version).slice(0, 30) : null,
        clientIp
      );

      return res.json({ status: 'ok' });
    } catch (err: any) {
      console.error('Telemetry ping error:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  if (req.method === 'GET' && subPath === 'stats') {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days as string, 10) || 7, 1), 90);

      // 1. Today stats (UTC)
      const todayStmt = database.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN event = 'app_launch' THEN 1 ELSE 0 END) as launches,
          SUM(CASE WHEN event = 'app_resume' THEN 1 ELSE 0 END) as resumes,
          COUNT(DISTINCT device_id) as unique_devices
        FROM telemetry_events
        WHERE date(created_at) = date('now')
      `);
      const todayRow = (todayStmt.get() as any) || {};

      // 2. Period stats
      const periodStmt = database.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN event = 'app_launch' THEN 1 ELSE 0 END) as launches,
          SUM(CASE WHEN event = 'app_resume' THEN 1 ELSE 0 END) as resumes,
          COUNT(DISTINCT device_id) as unique_devices
        FROM telemetry_events
        WHERE created_at >= datetime('now', '-' || ? || ' days')
      `);
      const periodRow = (periodStmt.get(days) as any) || {};

      // 3. Platform breakdown in period
      const platformStmt = database.prepare(`
        SELECT platform, COUNT(*) as count, COUNT(DISTINCT device_id) as unique_devices
        FROM telemetry_events
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY platform
        ORDER BY count DESC
      `);
      const platforms = platformStmt.all(days);

      // 4. Daily breakdown
      const dailyStmt = database.prepare(`
        SELECT 
          date(created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN event = 'app_launch' THEN 1 ELSE 0 END) as launches,
          SUM(CASE WHEN event = 'app_resume' THEN 1 ELSE 0 END) as resumes,
          COUNT(DISTINCT device_id) as unique_devices
        FROM telemetry_events
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY date(created_at)
        ORDER BY date ASC
      `);
      const daily = dailyStmt.all(days);

      // 5. Hourly breakdown in period
      const hourlyStmt = database.prepare(`
        SELECT strftime('%H', created_at) as hour, COUNT(*) as count
        FROM telemetry_events
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY hour
        ORDER BY hour ASC
      `);
      const hourly = hourlyStmt.all(days);

      return res.json({
        status: 'ok',
        generatedAt: new Date().toISOString(),
        today: {
          total: todayRow.total || 0,
          launches: todayRow.launches || 0,
          resumes: todayRow.resumes || 0,
          unique_devices: todayRow.unique_devices || 0
        },
        period: {
          days,
          total: periodRow.total || 0,
          launches: periodRow.launches || 0,
          resumes: periodRow.resumes || 0,
          unique_devices: periodRow.unique_devices || 0
        },
        platforms,
        daily,
        hourly
      });
    } catch (err: any) {
      console.error('Telemetry stats error:', err);
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  return res.status(404).json({ status: 'error', message: 'Not found' });
}
