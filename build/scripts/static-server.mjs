import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function resolveExact(root, pathname) {
  const decoded = decodeURIComponent(pathname).replaceAll("/", sep);
  const normalized = normalize(decoded).replace(/^[/\\]+/, "");
  if (!normalized || normalized === ".") return join(root, "index.html");
  if (normalized.split(sep).includes("..")) return null;

  const segments = normalized.split(sep).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    if (!existsSync(current) || !statSync(current).isDirectory()) return null;
    if (!readdirSync(current).includes(segment)) return null;
    current = join(current, segment);
  }

  if (existsSync(current) && statSync(current).isDirectory()) {
    if (!readdirSync(current).includes("index.html")) return null;
    current = join(current, "index.html");
  }

  return existsSync(current) && statSync(current).isFile() ? current : null;
}

export function createStaticServer({ root, port = 4173, host = "127.0.0.1" }) {
  const absoluteRoot = resolve(root);
  const server = createServer((request, response) => {
    const url = new URL(request.url || "/", `http://${request.headers.host || host}`);
    const file = resolveExact(absoluteRoot, url.pathname);

    if (!file) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  });

  return new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolveServer(server));
  });
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const rootArg = process.argv.find((arg) => arg.startsWith("--root="))?.slice(7)
    || fileURLToPath(new URL("../work/qualiacology-unified-hub", import.meta.url));
  const portArg = Number(process.argv.find((arg) => arg.startsWith("--port="))?.slice(7) || 4173);
  await createStaticServer({ root: rootArg, port: portArg });
  console.log(`Serving ${resolve(rootArg)} at http://127.0.0.1:${portArg}`);
}
