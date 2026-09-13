import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { infoRouter } from "./routes/info.js";
import { convertRouter } from "./routes/convert.js";
import { startCleanupSweeper } from "./lib/cleanup.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Render (and most PaaS hosts) put the app behind a reverse proxy that sets
// X-Forwarded-For; trust exactly one hop so express-rate-limit reads the
// real client IP instead of rejecting the header as spoofed.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: ORIGIN }));
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api", infoRouter);
app.use("/api", convertRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

startCleanupSweeper();

app.listen(PORT, () => {
  console.log(`Convertly API listening on port ${PORT}`);
});
