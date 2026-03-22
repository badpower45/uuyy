import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

const explicitOrigins = process.env["CORS_ORIGIN"] ?? process.env["FRONTEND_ORIGIN"] ?? "";
const allowedOrigins = explicitOrigins
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(
	cors({
		origin(origin, callback) {
			// Allow native/mobile tools and server-to-server calls with no browser origin.
			if (!origin) {
				callback(null, true);
				return;
			}

			// If no allowlist is configured, allow all (safe for local/dev).
			if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error(`CORS blocked for origin: ${origin}`));
		},
	}),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
