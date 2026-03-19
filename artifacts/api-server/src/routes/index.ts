import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driversRouter from "./drivers";
import routingRouter from "./routing";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driversRouter);
router.use(routingRouter);
router.use(ordersRouter);

export default router;
