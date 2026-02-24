import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const projectName = process.env.PROJECT_NAME || "exectrade";
const artifactInBuild = path.join(buildDir, `${projectName}.zip`);
const tempArtifact = path.join(rootDir, `${projectName}.zip`);

const packCandidates = [
  "build",
  "package.json",
  "package-lock.json",
  "server.ts",
  "src",
  ".npmrc",
  ".platform",
  ".ebextensions",
  "Procfile",
];

const existingPaths = packCandidates.filter((entry) =>
  fs.existsSync(path.join(rootDir, entry))
);

if (!fs.existsSync(buildDir)) {
  throw new Error("build directory not found. Run npm run build first.");
}

for (const file of fs.readdirSync(buildDir)) {
  if (file.endsWith(".zip")) {
    fs.rmSync(path.join(buildDir, file), { force: true });
  }
}

if (fs.existsSync(tempArtifact)) {
  fs.rmSync(tempArtifact, { force: true });
}

if (existingPaths.length === 0) {
  throw new Error("No files found to package.");
}

if (process.platform === "win32") {
  const quotedPaths = existingPaths
    .map((entry) => `'${entry.replace(/'/g, "''")}'`)
    .join(",");

  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path ${quotedPaths} -DestinationPath '${tempArtifact}' -Force"`,
    { cwd: rootDir, stdio: "inherit" }
  );
} else {
  const zipInputs = existingPaths.map((entry) => `"${entry}"`).join(" ");
  execSync(`zip -r "${tempArtifact}" ${zipInputs} -x "build/*.zip"`, {
    cwd: rootDir,
    stdio: "inherit",
  });
}

fs.copyFileSync(tempArtifact, artifactInBuild);
fs.rmSync(tempArtifact, { force: true });

console.log(`Created artifact: ${artifactInBuild}`);
