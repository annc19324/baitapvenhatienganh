/**
 * EngWork CRUD Routes — Cross-device sync for homework assignments,
 * submissions, and site config.
 *
 * Uses PostgreSQL via Prisma (EngworkKV table) for persistent storage
 * that survives Render restarts and is shared across all devices.
 *
 * Key format:
 *   "assignment:<id>"    → one assignment JSON
 *   "submission:<id>"    → one submission JSON
 *   "site_config"        → site appearance JSON
 *   "__initialized__"    → "1" once seeds have been pushed
 *
 * Admin auth: x-admin-key header must equal ENGWORK_ADMIN_KEY env var.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

const router = Router();

// ─── Auto-create table if prisma db push hasn't run on Render ───────────────

let _tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!_tableReady) {
    _tableReady = prisma
      .$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "engwork_kv" (
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "engwork_kv_pkey" PRIMARY KEY ("key")
        );
      `)
      .then(() => undefined)
      .catch((err) => {
        _tableReady = null;
        console.error('[EngWork] Failed to ensure engwork_kv table:', err);
      });
  }
  return _tableReady;
}

router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  await ensureTable();
  next();
});

// ─── Helpers ──────────────────────────────────────────────────────────────

async function kvGet(key: string): Promise<any | null> {
  try {
    const row = await prisma.engworkKV.findUnique({ where: { key } });
    if (!row) return null;
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: any): Promise<void> {
  const json = JSON.stringify(value);
  await prisma.engworkKV.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  });
}

async function kvDelete(key: string): Promise<boolean> {
  try {
    await prisma.engworkKV.delete({ where: { key } });
    return true;
  } catch {
    return false;
  }
}

async function getLastUpdated(): Promise<string> {
  const row = await prisma.engworkKV.findFirst({
    orderBy: { updatedAt: 'desc' },
  });
  return row?.updatedAt?.toISOString() ?? new Date().toISOString();
}

// ─── Admin auth ───────────────────────────────────────────────────────────

const ADMIN_KEY = process.env.ENGWORK_ADMIN_KEY || 'annc19324:Zeanokai@1';

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-admin-key'] as string | undefined;
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// ─── Sync timestamp ───────────────────────────────────────────────────────

/**
 * GET /api/engwork/sync-ts
 * Returns the latest updatedAt timestamp across all KV entries.
 */
router.get('/sync-ts', async (_req: Request, res: Response) => {
  try {
    const ts = await getLastUpdated();
    const initialized = !!(await prisma.engworkKV.findUnique({ where: { key: '__initialized__' } }));
    res.json({ success: true, lastUpdated: ts, initialized });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/assignments
 * Returns all assignments as array (reads all keys prefixed "assignment:").
 */
router.get('/assignments', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.engworkKV.findMany({
      where: { key: { startsWith: 'assignment:' } },
    });
    const data = rows.map((r) => JSON.parse(r.value));
    const initialized = !!(await prisma.engworkKV.findUnique({ where: { key: '__initialized__' } }));
    res.json({ success: true, initialized, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/engwork/assignments/:id
 */
router.get('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const item = await kvGet(`assignment:${req.params.id}`);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PUT /api/engwork/assignments/:id   (admin)
 * Upsert an assignment.
 */
router.put('/assignments/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = { ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    await kvSet(`assignment:${req.params.id}`, data);
    await kvSet('__initialized__', '1');
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * DELETE /api/engwork/assignments/:id   (admin)
 */
router.delete('/assignments/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await kvDelete(`assignment:${req.params.id}`);
    await kvSet('__initialized__', '1');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/engwork/assignments/bulk   (admin)
 * Upsert many assignments at once (used for initial seeding or restoring curriculum).
 * Pass ?force=true to overwrite even if already initialized.
 */
router.post('/assignments/bulk', requireAdmin, async (req: Request, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const alreadyInit = !!(await prisma.engworkKV.findUnique({ where: { key: '__initialized__' } }));
    if (alreadyInit && !force) {
      return res.json({ success: true, skipped: true, message: 'Already initialized' });
    }
    const list: any[] = Array.isArray(req.body) ? req.body : [];
    await Promise.all(
      list.map((a) => (a?.id ? kvSet(`assignment:${a.id}`, a) : Promise.resolve()))
    );
    await kvSet('__initialized__', '1');
    res.json({ success: true, count: list.length });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/submissions
 */
router.get('/submissions', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.engworkKV.findMany({
      where: { key: { startsWith: 'submission:' } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: rows.map((r) => JSON.parse(r.value)) });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/engwork/submissions/:id
 */
router.get('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const item = await kvGet(`submission:${req.params.id}`);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PUT /api/engwork/submissions/:id
 * Upsert — any device (student submitting or admin editing).
 */
router.put('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const data = { ...req.body, id: req.params.id };
    await kvSet(`submission:${req.params.id}`, data);
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * DELETE /api/engwork/submissions/:id  (admin)
 */
router.delete('/submissions/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await kvDelete(`submission:${req.params.id}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/engwork/submissions/bulk-delete  (admin)
 * Delete all submissions matching studentName.
 */
router.post('/submissions/bulk-delete', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { studentName } = req.body as { studentName?: string };
    if (!studentName) return res.json({ success: true, deleted: 0 });
    const norm = studentName.trim().toLowerCase();
    const rows = await prisma.engworkKV.findMany({
      where: { key: { startsWith: 'submission:' } },
    });
    let count = 0;
    for (const row of rows) {
      const sub = JSON.parse(row.value);
      if ((sub.studentName || '').trim().toLowerCase() === norm) {
        await prisma.engworkKV.delete({ where: { key: row.key } });
        count++;
      }
    }
    res.json({ success: true, deleted: count });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/engwork/submissions/rename-student  (admin)
 */
router.post('/submissions/rename-student', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { oldName, newName } = req.body as { oldName?: string; newName?: string };
    if (!oldName || !newName) return res.json({ success: true, updated: 0 });
    const norm = oldName.trim().toLowerCase();
    const rows = await prisma.engworkKV.findMany({
      where: { key: { startsWith: 'submission:' } },
    });
    let count = 0;
    for (const row of rows) {
      const sub = JSON.parse(row.value);
      if ((sub.studentName || '').trim().toLowerCase() === norm) {
        sub.studentName = newName.trim();
        await kvSet(row.key, sub);
        count++;
      }
    }
    res.json({ success: true, updated: count });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SITE CONFIG
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/site-config
 */
router.get('/site-config', async (_req: Request, res: Response) => {
  try {
    const data = (await kvGet('site_config')) ?? {};
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * PUT /api/engwork/site-config  (admin)
 */
router.put('/site-config', requireAdmin, async (req: Request, res: Response) => {
  try {
    await kvSet('site_config', req.body);
    res.json({ success: true, data: req.body });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
