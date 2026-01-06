import { Router } from 'express';
import teamsRouter from './teams';
import playersRouter from './players';
import gamesRouter from './games';
import franchiseRouter from './franchise';
import scheduleRouter from './schedule';
import seasonRouter from './season';
import playoffsRouter from './playoffs';
import standingsRouter from './standings';
import traitsRouter from './traits';
import authRouter from './auth';
import paymentsRouter from './payments';
import draftRouter from './draft';
import freeagencyRouter from './freeagency';
import tradesRouter from './trades';
import statsRouter from './stats';
import aiRouter from './ai';
import awardsRouter from './awards';
import allstarRouter from './allstar';

const router = Router();

// Mount all routes
router.use('/teams', teamsRouter);
router.use('/players', playersRouter);
router.use('/games', gamesRouter);
router.use('/franchise', franchiseRouter);
router.use('/schedule', scheduleRouter);
router.use('/season', seasonRouter);
router.use('/playoffs', playoffsRouter);
router.use('/standings', standingsRouter);
router.use('/traits', traitsRouter);
router.use('/auth', authRouter);
router.use('/payments', paymentsRouter);
router.use('/draft', draftRouter);
router.use('/freeagency', freeagencyRouter);
router.use('/trades', tradesRouter);
router.use('/stats', statsRouter);
router.use('/ai', aiRouter);
router.use('/awards', awardsRouter);
router.use('/allstar', allstarRouter);

export default router;
