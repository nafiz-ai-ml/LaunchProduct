import { Router } from 'express';
import productRoutes from './product.routes';
import clickRoutes from './click.routes';
import paymentRoutes from './payment.routes';
import webhookRoutes from './webhook.routes';
import leaderboardRoutes from './leaderboard.routes';
import categoryRoutes from './category.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

// Authoritative Pay-to-Rank Account-Free API V1 Sub-Routers
router.use('/products', productRoutes);
router.use('/clicks', clickRoutes);
router.use('/payments', paymentRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/leaderboards', leaderboardRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
