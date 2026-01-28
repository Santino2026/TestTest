import { Router } from 'express';
import lotteryRouter from './lottery';
import prospectsRouter from './prospects';
import orderRouter from './order';
import executionRouter from './execution';

const router = Router();

// Mount all sub-routers
router.use(lotteryRouter);
router.use(prospectsRouter);
router.use(orderRouter);
router.use(executionRouter);

export default router;
