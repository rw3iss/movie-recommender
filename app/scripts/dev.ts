import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

const port = 3000;

// SCSS Plugin
const scssPlugin: esbuild.Plugin = {
    name: "scss",
    setup(build) {
        build.onLoad({ filter: /\.scss$/ }, async (args) => {
            const sass = await import("sass");
            const result = sass.compile(args.path, {
                style: "expanded",
                sourceMap: true,
            });

            return {
                contents: result.css,
                loader: "css",
            };
        });
    },
};

// Path resolution plugin for @ imports
const pathResolvePlugin: esbuild.Plugin = {
    name: "path-resolve",
    setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => {
            return {
                path: path.join(process.cwd(), "src", args.path.slice(2)),
            };
        });
    },
};

async function dev() {
    try {
        // Ensure public directory exists
        if (!fs.existsSync("public")) {
            fs.mkdirSync("public", { recursive: true });
        }

        // Create a basic index.html if it doesn't exist
        const indexPath = "public/index.html";
        if (!fs.existsSync(indexPath)) {
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#1a202c" />
  <title>Movie Recommendation Engine</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/index.js"></script>
</body>
</html>`;
            fs.writeFileSync(indexPath, html);
        }

        // Create context for watch mode
        const ctx = await esbuild.context({
            entryPoints: ["src/index.tsx"],
            bundle: true,
            outfile: "public/index.js",
            format: "esm",
            target: ["es2020"],
            sourcemap: true,
            plugins: [scssPlugin, pathResolvePlugin],
            define: {
                "process.env.NODE_ENV": '"development"',
                "process.env.API_URL": '"http://localhost:3001"',
            },
            loader: {
                ".png": "file",
                ".jpg": "file",
                ".jpeg": "file",
                ".svg": "file",
                ".gif": "file",
                ".webp": "file",
            },
            assetNames: "assets/[name]",
            publicPath: "/",
            external: [],
        });

        // Start watching for changes
        await ctx.watch();

        // Create a simple static file server
        const server = http.createServer((req, res) => {
            const url = req.url || "/";
            let filePath = path.join("public", url === "/" ? "index.html" : url);

            // Handle client-side routing - serve index.html for non-file requests
            if (!path.extname(filePath) && !fs.existsSync(filePath)) {
                filePath = path.join("public", "index.html");
            }

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end("Not Found");
                return;
            }

            // Determine content type
            const ext = path.extname(filePath);
            const contentTypes: Record<string, string> = {
                ".html": "text/html",
                ".js": "application/javascript",
                ".css": "text/css",
                ".json": "application/json",
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".gif": "image/gif",
                ".svg": "image/svg+xml",
                ".webp": "image/webp",
            };

            const contentType = contentTypes[ext] || "text/plain";

            // Add CORS headers for development
            res.writeHead(200, {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            });

            // Stream the file
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
        });

        // Start the server
        server.listen(port, () => {
            console.log(`🚀 Development server running on http://localhost:${port}`);
            console.log("📁 Serving from: public/");
            console.log("👀 Watching for changes...");
            console.log("🔧 API server should be running on http://localhost:3001");
        });

        // Handle graceful shutdown
        process.on("SIGTERM", async () => {
            console.log("Shutting down development server...");
            server.close();
            await ctx.dispose();
            process.exit(0);
        });

        process.on("SIGINT", async () => {
            console.log("\nShutting down development server...");
            server.close();
            await ctx.dispose();
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Development server failed:", error);
        process.exit(1);
    }
}

dev();
