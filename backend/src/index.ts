// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import unitRoutes from './routes/units';
import productRoutes from './routes/products';
import customerRoutes from './routes/customers';
import supplierRoutes from './routes/suppliers';
import salesRoutes from './routes/sales';
import purchaseRoutes from './routes/purchases';
import shiftRoutes from './routes/shifts';
import cashFlowRoutes from './routes/cash-flow';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import storesRoutes from './routes/stores';
import reportsRoutes from './routes/reports';
import paymentsRoutes from './routes/payments';
import supplierPaymentsRoutes from './routes/supplier-payments';
import onlineStoresRoutes from './routes/online-stores';
import storefrontRoutes from './routes/storefront';
import tenantsRoutes from './routes/tenants';
import syncDataRoutes from './routes/sync-data';
import loyaltyPointsRoutes from './routes/loyalty-points';
import subscriptionRoutes from './routes/subscription';
import unitConversionRoutes from './routes/unit-conversion';
import uploadRoutes from './routes/upload';
import bulkImportRoutes from './routes/bulk-import';
import refundsRoutes from './routes/refunds';
import notificationsRoutes from './routes/notifications';
import paymentGatewayRoutes from './routes/payment-gateway';
import shippingRoutes from './routes/shipping';
import mpcOptimizerRoutes from './routes/mpc-optimizer';
import promotionRoutes from './routes/promotions';
import voucherRoutes from './routes/vouchers';
import printingRoutes from './routes/printing';
import devicesRoutes from './routes/devices';
import debtReminderRoutes from './routes/debt-reminder';

const app = express();
const PORT = process.env.PORT || 3001;

// Log database config for debugging
console.log('Database config:', {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

// Static files - serve uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', {
    authorization: req.headers.authorization ? 'Bearer ***' : 'none',
    'x-store-id': req.headers['x-store-id'] || 'none',
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/cash-flow', cashFlowRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/supplier-payments', supplierPaymentsRoutes);
app.use('/api/online-stores', onlineStoresRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/sync-data', syncDataRoutes);
app.use('/api/loyalty-points', loyaltyPointsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api', unitConversionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bulk', bulkImportRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payment-gateway', paymentGatewayRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/mpc', mpcOptimizerRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/printing', printingRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/debt-reminder', debtReminderRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

export default app;
