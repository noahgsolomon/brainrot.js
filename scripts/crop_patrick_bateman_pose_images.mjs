// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const POSE_ROOT = path.join(REPO_ROOT, "generate", "public", "pose");
const CHARACTER_FILE_NAME = "PATRICK_BATEMAN.png";
const TARGET_SIZE = 832;
const dryRun = process.argv.includes("--dry-run");

async function collectPatrickPoseImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectPatrickPoseImages(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === CHARACTER_FILE_NAME) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

async function cropCenteredSquare(filePath) {
  const image = sharp(filePath);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width === TARGET_SIZE && height === TARGET_SIZE) {
    return { action: "skip", width, height };
  }

  if (width < TARGET_SIZE || height < TARGET_SIZE) {
    throw new Error(
      `${path.relative(REPO_ROOT, filePath)} is ${width}x${height}, smaller than ${TARGET_SIZE}x${TARGET_SIZE}`,
    );
  }

  const left = Math.floor((width - TARGET_SIZE) / 2);
  const top = Math.floor((height - TARGET_SIZE) / 2);

  if (!dryRun) {
    const cropped = await image
      .extract({
        left,
        top,
        width: TARGET_SIZE,
        height: TARGET_SIZE,
      })
      .png()
      .toBuffer();

    await fs.writeFile(filePath, cropped);
  }

  return { action: "crop", width, height, left, top };
}

const poseFiles = await collectPatrickPoseImages(POSE_ROOT);

if (poseFiles.length === 0) {
  throw new Error(`No ${CHARACTER_FILE_NAME} files found under ${POSE_ROOT}`);
}

for (const filePath of poseFiles) {
  const result = await cropCenteredSquare(filePath);
  const relativePath = path.relative(REPO_ROOT, filePath);

  if (result.action === "skip") {
    console.log(`skip ${relativePath} already ${TARGET_SIZE}x${TARGET_SIZE}`);
    continue;
  }

  console.log(
    `${dryRun ? "would crop" : "cropped"} ${relativePath} from ${result.width}x${result.height} at x=${result.left}, y=${result.top}`,
  );
}

const selectorSource = path.join(
  POSE_ROOT,
  "right",
  "neutral",
  CHARACTER_FILE_NAME,
);
const selectorTarget = path.join(REPO_ROOT, "public", "img", CHARACTER_FILE_NAME);

try {
  await fs.access(selectorTarget);
  if (dryRun) {
    console.log(
      `would copy ${path.relative(REPO_ROOT, selectorSource)} to ${path.relative(REPO_ROOT, selectorTarget)}`,
    );
  } else {
    await fs.copyFile(selectorSource, selectorTarget);
    console.log(
      `copied ${path.relative(REPO_ROOT, selectorSource)} to ${path.relative(REPO_ROOT, selectorTarget)}`,
    );
  }
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}
