import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error("Missing build output:", src);
    process.exit(1);
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

copyDir(
  path.join(root, "projects", "distributed-simulator", "dist"),
  path.join(dist, "simulator"),
);
copyDir(path.join(root, "projects", "async-job-queue", "dist"), path.join(dist, "queue"));
copyDir(path.join(root, "projects", "book-librarian", "dist"), path.join(dist, "librarian"));

console.log("Copied projects into dist/simulator, dist/queue, and dist/librarian");
