import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import voteRoutes from './vote.routes';
import claimRoutes from './claim.routes';
import reviewRoutes from './review.routes';
import clickRoutes from './click.routes';
import campaignRoutes from './campaign.routes';
import webhookRoutes from './webhook.routes';
import leaderboardRoutes from './leaderboard.routes';
import categoryRoutes from './category.routes';
import analyticsRoutes from './analytics.routes';
import moderationRoutes from './moderation.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Authoritative API V1 Sub-Routers
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/votes', voteRoutes);
router.use('/claims', claimRoutes);
router.use('/reviews', reviewRoutes);
router.use('/clicks', clickRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/leaderboards', leaderboardRoutes);
router.use('/categories', categoryRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/moderation', moderationRoutes);
router.use('/admin', adminRoutes);

export default router;
