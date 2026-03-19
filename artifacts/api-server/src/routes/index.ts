import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driversRouter from "./drivers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driversRouter);

export default router;
