import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import { getConnection } from '../db/connection';
import cron from 'node-cron';

class NotificationGeneratorService {
  private cronJob: any = null;

  start() {
    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('[NotificationGenerator] Running scheduled checks...');
      await this.checkLowStock();
      await this.checkDebtReminders();
      await this.checkShiftEnding();
    });

    console.log('[NotificationGenerator] Service started');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[NotificationGenerator] Service stopped');
    }
  }

  private async checkLowStock() {
    try {
      const pool = await getConnection();

      // Get products with low stock
      const result = await pool.request().query(`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.store_id,
          ISNULL(SUM(i.quantity), 0) as current_stock
        FROM Products p
        LEFT JOIN Inventory i ON p.id = i.product_id
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.store_id
        HAVING ISNULL(SUM(i.quantity), 0) <= 10
      `);

      for (const product of result.recordset) {
        // Check if notification already exists for this product (within last 24 hours)
        const existingNotif = await pool
          .request()
          .input('storeId', sql.UniqueIdentifier, product.store_id)
          .input('type', sql.NVarChar(50), 'low_stock')
          .input('productId', sql.NVarChar(sql.MAX), `%"productId":"${product.product_id}"%`)
          .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND type = @type
            AND data LIKE @productId
            AND created_at > DATEADD(HOUR, -24, GETDATE())
          `);

        if (existingNotif.recordset.length === 0) {
          // Create notification
          await pool
            .request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('storeId', sql.UniqueIdentifier, product.store_id)
            .input('type', sql.NVarChar(50), 'low_stock')
            .input('title', sql.NVarChar(255), 'Cảnh báo tồn kho thấp')
            .input('message', sql.NVarChar(sql.MAX), `Sản phẩm "${product.product_name}" chỉ còn ${product.current_stock} sản phẩm trong kho`)
            .input('data', sql.NVarChar(sql.MAX), JSON.stringify({
              productId: product.product_id,
              productName: product.product_name,
              currentStock: product.current_stock,
            }))
            .input('priority', sql.NVarChar(20), 'high')
            .input('actionUrl', sql.NVarChar(500), '/products')
            .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, NULL, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);

          console.log(`[NotificationGenerator] Created low stock notification for ${product.product_name}`);
        }
      }
    } catch (error) {
      console.error('[NotificationGenerator] Error checking low stock:', error);
    }
  }

  private async checkDebtReminders() {
    try {
      const pool = await getConnection();

      // Get customers with debt > 0
      const result = await pool.request().query(`
        SELECT 
          c.id as customer_id,
          c.name as customer_name,
          c.store_id,
          c.totalDebt as debt_amount
        FROM Customers c
        WHERE c.totalDebt > 0
        AND c.status = 'active'
      `);

      for (const customer of result.recordset) {
        // Check if notification already exists for this customer (within last 7 days)
        const existingNotif = await pool
          .request()
          .input('storeId', sql.UniqueIdentifier, customer.store_id)
          .input('type', sql.NVarChar(50), 'debt_reminder')
          .input('customerId', sql.NVarChar(sql.MAX), `%"customerId":"${customer.customer_id}"%`)
          .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND type = @type
            AND data LIKE @customerId
            AND created_at > DATEADD(DAY, -7, GETDATE())
          `);

        if (existingNotif.recordset.length === 0) {
          // Create notification
          await pool
            .request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('storeId', sql.UniqueIdentifier, customer.store_id)
            .input('type', sql.NVarChar(50), 'debt_reminder')
            .input('title', sql.NVarChar(255), 'Nhắc nhở công nợ')
            .input('message', sql.NVarChar(sql.MAX), `Khách hàng "${customer.customer_name}" đang nợ ${customer.debt_amount.toLocaleString('vi-VN')}đ`)
            .input('data', sql.NVarChar(sql.MAX), JSON.stringify({
              customerId: customer.customer_id,
              customerName: customer.customer_name,
              debtAmount: customer.debt_amount,
            }))
            .input('priority', sql.NVarChar(20), 'normal')
            .input('actionUrl', sql.NVarChar(500), '/reports/debt')
            .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, NULL, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);

          console.log(`[NotificationGenerator] Created debt reminder for ${customer.customer_name}`);
        }
      }
    } catch (error) {
      console.error('[NotificationGenerator] Error checking debt reminders:', error);
    }
  }

  private async checkShiftEnding() {
    try {
      const pool = await getConnection();

      // Get active shifts that will end in 30 minutes
      const result = await pool.request().query(`
        SELECT 
          s.id as shift_id,
          s.user_id,
          s.store_id,
          u.name as user_name,
          u.maxShiftHours,
          s.start_time
        FROM Shifts s
        INNER JOIN Users u ON s.user_id = u.id
        WHERE s.status = 'active'
        AND u.maxShiftHours IS NOT NULL
        AND u.maxShiftHours > 0
        AND DATEADD(HOUR, u.maxShiftHours, s.start_time) <= DATEADD(MINUTE, 30, GETDATE())
        AND DATEADD(HOUR, u.maxShiftHours, s.start_time) > GETDATE()
      `);

      for (const shift of result.recordset) {
        // Check if notification already exists for this shift
        const existingNotif = await pool
          .request()
          .input('storeId', sql.UniqueIdentifier, shift.store_id)
          .input('userId', sql.UniqueIdentifier, shift.user_id)
          .input('type', sql.NVarChar(50), 'shift_ending')
          .input('shiftId', sql.NVarChar(sql.MAX), `%"shiftId":"${shift.shift_id}"%`)
          .query(`
            SELECT id FROM Notifications
            WHERE store_id = @storeId
            AND user_id = @userId
            AND type = @type
            AND data LIKE @shiftId
            AND created_at > DATEADD(HOUR, -1, GETDATE())
          `);

        if (existingNotif.recordset.length === 0) {
          // Create notification
          await pool
            .request()
            .input('id', sql.UniqueIdentifier, uuidv4())
            .input('storeId', sql.UniqueIdentifier, shift.store_id)
            .input('userId', sql.UniqueIdentifier, shift.user_id)
            .input('type', sql.NVarChar(50), 'shift_ending')
            .input('title', sql.NVarChar(255), 'Ca làm việc sắp kết thúc')
            .input('message', sql.NVarChar(sql.MAX), `Ca làm việc của bạn sẽ tự động đóng trong 30 phút nữa`)
            .input('data', sql.NVarChar(sql.MAX), JSON.stringify({
              shiftId: shift.shift_id,
              userName: shift.user_name,
              maxShiftHours: shift.maxShiftHours,
            }))
            .input('priority', sql.NVarChar(20), 'high')
            .input('actionUrl', sql.NVarChar(500), '/shifts')
            .query(`
              INSERT INTO Notifications (
                id, store_id, user_id, type, title, message, data, priority, action_url
              ) VALUES (
                @id, @storeId, @userId, @type, @title, @message, @data, @priority, @actionUrl
              )
            `);

          console.log(`[NotificationGenerator] Created shift ending notification for ${shift.user_name}`);
        }
      }
    } catch (error) {
      console.error('[NotificationGenerator] Error checking shift ending:', error);
    }
  }
}

export const notificationGeneratorService = new NotificationGeneratorService();
