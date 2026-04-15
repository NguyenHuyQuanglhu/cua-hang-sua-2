import { Router, Response } from 'express';
import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, storeContext, AuthRequest } from '../middleware/auth';
import { getConnection } from '../db/connection';

const router = Router();

router.use(authenticate);
router.use(storeContext);

// GET /api/in-app-notifications - Get notifications for current user/store
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;
    const { page = '1', pageSize = '20', unreadOnly = 'false', type } = req.query;

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    const pool = await getConnection();
    const request = pool.request();

    let whereClause = 'store_id = @storeId AND (user_id IS NULL OR user_id = @userId)';
    request.input('storeId', sql.UniqueIdentifier, storeId);
    request.input('userId', sql.UniqueIdentifier, userId || null);

    if (unreadOnly === 'true') {
      whereClause += ' AND is_read = 0';
    }

    if (type) {
      whereClause += ' AND type = @type';
      request.input('type', sql.NVarChar(50), type);
    }

    // Get total count
    const countResult = await request.query(`
      SELECT COUNT(*) as total 
      FROM Notifications 
      WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // Get paginated notifications
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSizeNum);

    const result = await request.query(`
      SELECT 
        id, store_id, user_id, type, title, message, data,
        is_read, priority, action_url, created_at, read_at, expires_at
      FROM Notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    res.json({
      success: true,
      data: result.recordset.map((n) => ({
        id: n.id,
        storeId: n.store_id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        isRead: n.is_read,
        priority: n.priority,
        actionUrl: n.action_url,
        createdAt: n.created_at,
        readAt: n.read_at,
        expiresAt: n.expires_at,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// GET /api/in-app-notifications/unread-count - Get unread count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;

    const pool = await getConnection();
    const result = await pool
      .request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .input('userId', sql.UniqueIdentifier, userId || null)
      .query(`
        SELECT COUNT(*) as count
        FROM Notifications
        WHERE store_id = @storeId 
        AND (user_id IS NULL OR user_id = @userId)
        AND is_read = 0
      `);

    res.json({
      success: true,
      count: result.recordset[0].count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// POST /api/in-app-notifications - Create a notification
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const {
      userId,
      type,
      title,
      message,
      data,
      priority = 'normal',
      actionUrl,
      expiresAt,
    } = req.body;

    if (!type || !title || !message) {
      res.status(400).json({ error: 'Type, title, and message are required' });
      return;
    }

    const id = uuidv4();
    const pool = await getConnection();

    await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('storeId', sql.UniqueIdentifier, storeId)
      .input('userId', sql.UniqueIdentifier, userId || null)
      .input('type', sql.NVarChar(50), type)
      .input('title', sql.NVarChar(255), title)
      .input('message', sql.NVarChar(sql.MAX), message)
      .input('data', sql.NVarChar(sql.MAX), data ? JSON.stringify(data) : null)
      .input('priority', sql.NVarChar(20), priority)
      .input('actionUrl', sql.NVarChar(500), actionUrl || null)
      .input('expiresAt', sql.DateTime, expiresAt || null)
      .query(`
        INSERT INTO Notifications (
          id, store_id, user_id, type, title, message, data,
          priority, action_url, expires_at
        ) VALUES (
          @id, @storeId, @userId, @type, @title, @message, @data,
          @priority, @actionUrl, @expiresAt
        )
      `);

    res.status(201).json({ success: true, id });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// PUT /api/in-app-notifications/:id/read - Mark as read
router.put('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const userId = req.user?.id;

    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('storeId', sql.UniqueIdentifier, storeId)
      .input('userId', sql.UniqueIdentifier, userId || null)
      .query(`
        UPDATE Notifications
        SET is_read = 1, read_at = GETDATE()
        WHERE id = @id 
        AND store_id = @storeId
        AND (user_id IS NULL OR user_id = @userId)
      `);

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/in-app-notifications/read-all - Mark all as read
router.put('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.storeId!;
    const userId = req.user?.id;

    const pool = await getConnection();
    await pool
      .request()
      .input('storeId', sql.UniqueIdentifier, storeId)
      .input('userId', sql.UniqueIdentifier, userId || null)
      .query(`
        UPDATE Notifications
        SET is_read = 1, read_at = GETDATE()
        WHERE store_id = @storeId
        AND (user_id IS NULL OR user_id = @userId)
        AND is_read = 0
      `);

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/in-app-notifications/:id - Delete a notification
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = req.storeId!;
    const userId = req.user?.id;

    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.UniqueIdentifier, id)
      .input('storeId', sql.UniqueIdentifier, storeId)
      .input('userId', sql.UniqueIdentifier, userId || null)
      .query(`
        DELETE FROM Notifications
        WHERE id = @id 
        AND store_id = @storeId
        AND (user_id IS NULL OR user_id = @userId)
      `);

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
