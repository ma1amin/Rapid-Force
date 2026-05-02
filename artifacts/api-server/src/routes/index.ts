import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import sprintsRouter from "./sprints";
import missionsRouter from "./missions";
import threatsRouter from "./threats";
import activityRouter from "./activity";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(sprintsRouter);
router.use(missionsRouter);
router.use(threatsRouter);
router.use(activityRouter);

export default router;
