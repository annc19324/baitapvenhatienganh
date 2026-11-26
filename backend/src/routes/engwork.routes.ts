/**
 * EngWork CRUD Routes — Cross-device sync for homework assignments,
 * submissions, and site config.
 *
 * Uses in-process JSON store with disk persistence (data/engwork.json).
 * No Prisma migration required.
 *
 * Secret admin key read from env ENGWORK_ADMIN_KEY (default: 'annc19324:Zeanokai@1')
 */

import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// ─── Persistence helpers ───────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'engwork.json');

type Store = {
  initialized?: boolean;
  assignments: Record<string, any>;
  submissions: Record<string, any>;
  siteConfig: Record<string, any>;
  lastUpdated: string;
};

function loadStore(): Store {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return { initialized: false, assignments: {}, submissions: {}, siteConfig: {}, lastUpdated: new Date().toISOString() };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Store;
  } catch {
    return { initialized: false, assignments: {}, submissions: {}, siteConfig: {}, lastUpdated: new Date().toISOString() };
  }
}

function saveStore(store: Store): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[EngWork] Failed to save store:', e);
  }
}

// ─── Admin auth middleware ─────────────────────────────────────────────────

const ADMIN_KEY = process.env.ENGWORK_ADMIN_KEY || 'annc19324:Zeanokai@1';

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-admin-key'] as string | undefined;
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// ─── Sync timestamp ──────────────────────────────────────────────────────

/**
 * GET /api/engwork/sync-ts
 * Returns the last-updated timestamp so clients can decide if they need to re-fetch.
 */
router.get('/sync-ts', (_req: Request, res: Response) => {
  const store = loadStore();
  res.json({ success: true, lastUpdated: store.lastUpdated });
});

// ═══════════════════════════════════════════════════════════
// ASSIGNMENTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/assignments
 * Returns all assignments as array.
 */
router.get('/assignments', (_req: Request, res: Response) => {
  const store = loadStore();
  res.json({ success: true, initialized: !!store.initialized, data: Object.values(store.assignments) });
});

/**
 * GET /api/engwork/assignments/:id
 */
router.get('/assignments/:id', (req: Request, res: Response) => {
  const store = loadStore();
  const item = store.assignments[req.params.id];
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

/**
 * PUT /api/engwork/assignments/:id   (admin)
 * Upsert an assignment.
 */
router.put('/assignments/:id', requireAdmin, (req: Request, res: Response) => {
  const store = loadStore();
  store.initialized = true;
  store.assignments[req.params.id] = { ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  saveStore(store);
  res.json({ success: true, data: store.assignments[req.params.id] });
});

/**
 * DELETE /api/engwork/assignments/:id   (admin)
 */
router.delete('/assignments/:id', requireAdmin, (req: Request, res: Response) => {
  const store = loadStore();
  store.initialized = true;
  if (!store.assignments[req.params.id]) return res.status(404).json({ success: false, message: 'Not found' });
  delete store.assignments[req.params.id];
  saveStore(store);
  res.json({ success: true });
});

/**
 * POST /api/engwork/assignments/bulk   (admin)
 * Replace entire assignments store (used for seeding or restoring curriculum).
 */
router.post('/assignments/bulk', requireAdmin, (req: Request, res: Response) => {
  const store = loadStore();
  store.initialized = true;
  const list: any[] = Array.isArray(req.body) ? req.body : [];
  const map: Record<string, any> = {};
  list.forEach((a) => { if (a?.id) map[a.id] = a; });
  store.assignments = { ...store.assignments, ...map };
  saveStore(store);
  res.json({ success: true, count: list.length });
});

// ═══════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/submissions
 */
router.get('/submissions', (_req: Request, res: Response) => {
  const store = loadStore();
  res.json({ success: true, data: Object.values(store.submissions) });
});

/**
 * GET /api/engwork/submissions/:id
 */
router.get('/submissions/:id', (req: Request, res: Response) => {
  const store = loadStore();
  const item = store.submissions[req.params.id];
  if (!item) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: item });
});

/**
 * PUT /api/engwork/submissions/:id
 * Upsert a submission. Any client can create; admin can edit.
 */
router.put('/submissions/:id', (req: Request, res: Response) => {
  const store = loadStore();
  store.submissions[req.params.id] = { ...req.body, id: req.params.id };
  saveStore(store);
  res.json({ success: true, data: store.submissions[req.params.id] });
});

/**
 * DELETE /api/engwork/submissions/:id  (admin)
 */
router.delete('/submissions/:id', requireAdmin, (req: Request, res: Response) => {
  const store = loadStore();
  if (!store.submissions[req.params.id]) return res.status(404).json({ success: false, message: 'Not found' });
  delete store.submissions[req.params.id];
  saveStore(store);
  res.json({ success: true });
});

/**
 * POST /api/engwork/submissions/bulk-delete  (admin)
 * Delete all submissions matching studentName.
 */
router.post('/submissions/bulk-delete', requireAdmin, (req: Request, res: Response) => {
  const { studentName } = req.body as { studentName?: string };
  const store = loadStore();
  let count = 0;
  if (studentName) {
    const norm = studentName.trim().toLowerCase();
    Object.keys(store.submissions).forEach((k) => {
      if ((store.submissions[k].studentName || '').trim().toLowerCase() === norm) {
        delete store.submissions[k];
        count++;
      }
    });
  }
  saveStore(store);
  res.json({ success: true, deleted: count });
});

/**
 * POST /api/engwork/submissions/rename-student  (admin)
 * Rename all submissions for a student.
 */
router.post('/submissions/rename-student', requireAdmin, (req: Request, res: Response) => {
  const { oldName, newName } = req.body as { oldName?: string; newName?: string };
  const store = loadStore();
  let count = 0;
  if (oldName && newName) {
    const norm = oldName.trim().toLowerCase();
    Object.keys(store.submissions).forEach((k) => {
      if ((store.submissions[k].studentName || '').trim().toLowerCase() === norm) {
        store.submissions[k].studentName = newName.trim();
        count++;
      }
    });
  }
  saveStore(store);
  res.json({ success: true, updated: count });
});

// ═══════════════════════════════════════════════════════════
// SITE CONFIG
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/engwork/site-config
 */
router.get('/site-config', (_req: Request, res: Response) => {
  const store = loadStore();
  res.json({ success: true, data: store.siteConfig });
});

/**
 * PUT /api/engwork/site-config  (admin)
 */
router.put('/site-config', requireAdmin, (req: Request, res: Response) => {
  const store = loadStore();
  store.siteConfig = { ...req.body };
  saveStore(store);
  res.json({ success: true, data: store.siteConfig });
});

export default router;
