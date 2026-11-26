import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const DEFAULT_OUTPUT_PATH = "/output/entry.txt";
const MAX_CODE_POINTS = 140;

/**
 * 终稿报错文本（迭代 2）：
 * 以真实流式错误码起手，紧接事故黑匣子调查式冷面转折，
 * 不道歉、不解释笑点、不玩陈旧的“故意少打最后一个词”套路。
 */
const ENTRY_TEXT =
  "ERR_MAX_TOKENS: Stream lost mid-sentence; surviving tokens suggest it was about to make sense.";

/**
 * 解析输出文件路径：
 * 优先级：--out / --output / -o > --out-dir > MAKEFUN_OUTPUT_DIR > 默认 /output/entry.txt
 */
function resolveOutputPath(argv: string[], env: NodeJS.ProcessEnv): string {
  let outFile: string | undefined;
  let outDir: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out" || arg === "--output" || arg === "-o") {
      const value = argv[i + 1];
      if (!value || value.trim().length === 0) {
        throw new Error(`Missing path after ${arg}`);
      }
      outFile = value;
      i += 1;
    } else if (arg.startsWith("--out=")) {
      outFile = arg.slice("--out=".length);
      if (outFile.trim().length === 0) {
        throw new Error("Missing path after --out=");
      }
    } else if (arg.startsWith("--output=")) {
      outFile = arg.slice("--output=".length);
      if (outFile.trim().length === 0) {
        throw new Error("Missing path after --output=");
      }
    } else if (arg.startsWith("-o=")) {
      outFile = arg.slice("-o=".length);
      if (outFile.trim().length === 0) {
        throw new Error("Missing path after -o=");
      }
    } else if (arg === "--out-dir") {
      const value = argv[i + 1];
      if (!value || value.trim().length === 0) {
        throw new Error("Missing directory after --out-dir");
      }
      outDir = value;
      i += 1;
    } else if (arg.startsWith("--out-dir=")) {
      outDir = arg.slice("--out-dir=".length);
      if (outDir.trim().length === 0) {
        throw new Error("Missing directory after --out-dir=");
      }
    }
  }

  if (outFile) {
    return resolve(outFile);
  }
  if (outDir) {
    return join(resolve(outDir), "entry.txt");
  }
  if (env.MAKEFUN_OUTPUT_DIR && env.MAKEFUN_OUTPUT_DIR.trim().length > 0) {
    return join(resolve(env.MAKEFUN_OUTPUT_DIR.trim()), "entry.txt");
  }
  return DEFAULT_OUTPUT_PATH;
}

/**
 * 按比赛门控规则校验单行文本：
 * - 非空且非纯空白
 * - 1 到 140 Unicode 码点
 * - 单行（无 CR/LF）且无任何控制字符（C0 / DEL / C1）
 */
function assertValidEntry(text: string): void {
  if (text.trim().length === 0) {
    throw new Error("Entry text must not be empty or whitespace-only.");
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("Entry text must be a single line without newlines.");
  }

  const codePoints = Array.from(text);
  if (codePoints.length < 1 || codePoints.length > MAX_CODE_POINTS) {
    throw new Error(
      `Entry length ${codePoints.length} exceeds allowed 1..${MAX_CODE_POINTS} code points.`
    );
  }

  for (const ch of codePoints) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f)) {
      throw new Error(`Entry contains disallowed control character U+${cp.toString(16).toUpperCase()}.`);
    }
  }
}

function main(): void {
  assertValidEntry(ENTRY_TEXT);
  const outputPath = resolveOutputPath(process.argv.slice(2), process.env);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, ENTRY_TEXT, { encoding: "utf8" });
}

main();
