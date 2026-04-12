import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const assetsDir = path.join(rootDir, "assets");
const port = Number(process.env.PORT) || 3000;

const app = express();

app.use(express.static(publicDir));
app.use("/assets", express.static(assetsDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "bachmann-jass-local" });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Bachmann Jass läuft auf http://localhost:${port}`);
});
