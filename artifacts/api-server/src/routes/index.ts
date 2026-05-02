import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import sprintsRouter from "./sprints";
import missionsRouter from "./missions";
import threatsRouter from "./threats";
import activityRouter from "./activity";
import detectionsRouter from "./detections";
import incidentsRouter from "./incidents";
import copilotRouter from "./copilot";
import authRouter from "./auth";
import licensesRouter from "./licenses";
import adminRouter from "./admin";
import vouchersRouter from "./vouchers";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(authRouter);
router.use(licensesRouter);
router.use(adminRouter);
router.use(vouchersRouter);
router.use(announcementsRouter);
router.use(healthRouter);
router.use(agentsRouter);
router.use(sprintsRouter);
router.use(missionsRouter);
router.use(threatsRouter);
router.use(activityRouter);
router.use(detectionsRouter);
router.use(incidentsRouter);
router.use(copilotRouter);

export default router;
