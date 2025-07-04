import * as esbuild from "esbuild";
import * as fs from "fs";
import * as path from "path";

const isProduction = process.env.NODE_ENV === "production";

// SCSS Plugin
const scssPlugin: esbuild.Plugin = {
    name: "scss",
    setup(build) {
        build.onLoad({ filter: /\.scss$/ }, async (args) => {
            const sass = await import("sass");
            const result = sass.compile(args.path, {
                style: isProduction ? "compressed" : "expanded",
                sourceMap: !isProduction,
            });

            return {
                contents: result.css,
                loader: "css",
            };
        });
    },
};

async function build() {
    try {
        // Clean dist directory
        if (fs.existsSync("dist")) {
            fs.rmSync("dist", { recursive: true });
        }
        fs.mkdirSync("dist", { recursive: true });

        // Copy public files
        if (fs.existsSync("public")) {
            fs.cpSync("public", "dist", { recursive: true });
        }

        // Build configuration
        const buildOptions: esbuild.BuildOptions = {
            entryPoints: ["src/index.tsx"],
            bundle: true,
            outfile: "dist/js/bundle.js",
            format: "esm",
            target: ["es2020"],
            minify: isProduction,
            sourcemap: !isProduction,
            splitting: false,
            plugins: [scssPlugin],
            define: {
                "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
                "process.env.API_URL": JSON.stringify(process.env.API_URL || "http://localhost:3001"),
            },
            loader: {
                ".png": "file",
                ".jpg": "file",
                ".jpeg": "file",
                ".svg": "file",
                ".gif": "file",
                ".webp": "file",
            },
            assetNames: "assets/[name]-[hash]",
            publicPath: "/",
            metafile: true,
        };

        console.log("🏗️  Building for", isProduction ? "production" : "development");

        const result = await esbuild.build(buildOptions);

        if (result.metafile) {
            await fs.promises.writeFile("dist/metafile.json", JSON.stringify(result.metafile, null, 2));
        }

        console.log("✅ Build completed successfully!");
        console.log("📁 Output directory: dist/");
    } catch (error) {
        console.error("❌ Build failed:", error);
        process.exit(1);
    }
}

build();
