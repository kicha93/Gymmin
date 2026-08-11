import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const defaultSummaryPath = path.join(repoRoot, "docs", "exercise-summary.json");
const defaultPromptPath = path.join(repoRoot, "docs", "exercise-image-prompt-template.md");
const defaultOutputRoot = path.join(repoRoot, "media-source", "exercises");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const backendProjectPath = path.join(repoRoot, "backend", "Gymmin.Api", "Gymmin.Api.csproj");
const backendAppSettingsPaths = [
  path.join(repoRoot, "backend", "Gymmin.Api", "appsettings.Development.json"),
  path.join(repoRoot, "backend", "Gymmin.Api", "appsettings.json")
];
const envFilePaths = [
  path.join(repoRoot, ".env"),
  path.join(repoRoot, "backend", "Gymmin.Api", ".env")
];
const defaultReferenceFiles = [
  path.join(defaultOutputRoot, "banded-exercises-ab-twist-1", "start.png"),
  path.join(defaultOutputRoot, "banded-exercises-ab-twist-1", "end.png")
];

function parseArgs(argv) {
  const args = {
    delayMs: 1200,
    checkKey: false,
    dryRun: false,
    limit: null,
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    offset: 0,
    onlyId: null,
    outputRoot: defaultOutputRoot,
    overwrite: false,
    promptFile: defaultPromptPath,
    referenceFiles: [],
    size: process.env.OPENAI_IMAGE_SIZE || "1024x1536",
    skipFirst: 2,
    summary: defaultSummaryPath
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === "--check-key") args.checkKey = true;
    else if (arg === "--delay-ms") args.delayMs = Number.parseInt(nextValue(), 10);
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--limit") args.limit = Number.parseInt(nextValue(), 10);
    else if (arg === "--model") args.model = nextValue();
    else if (arg === "--offset") args.offset = Number.parseInt(nextValue(), 10);
    else if (arg === "--only-id") args.onlyId = nextValue();
    else if (arg === "--output-root") args.outputRoot = path.resolve(repoRoot, nextValue());
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg === "--prompt-file") args.promptFile = path.resolve(repoRoot, nextValue());
    else if (arg === "--reference-file") args.referenceFiles.push(path.resolve(repoRoot, nextValue()));
    else if (arg === "--size") args.size = nextValue();
    else if (arg === "--skip-first") args.skipFirst = Number.parseInt(nextValue(), 10);
    else if (arg === "--summary") args.summary = path.resolve(repoRoot, nextValue());
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number");
  }
  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit < 1)) {
    throw new Error("--limit must be a positive number");
  }
  if (!Number.isFinite(args.offset) || args.offset < 0) {
    throw new Error("--offset must be a non-negative number");
  }
  if (!Number.isFinite(args.skipFirst) || args.skipFirst < 0) {
    throw new Error("--skip-first must be a non-negative number");
  }

  return args;
}

function printHelp() {
  console.log(`
Generate exercise images through the OpenAI Images API.

Required:
  OPENAI_API_KEY must be set in the environment.

Examples:
  node scripts/generate-exercise-images-openai.mjs --dry-run --limit 5
  node scripts/generate-exercise-images-openai.mjs --limit 10
  node scripts/generate-exercise-images-openai.mjs --only-id banded-exercises-ab-twist-1 --overwrite

Options:
  --summary <path>       Input summary JSON. Default: docs/exercise-summary.json
  --prompt-file <path>   Prompt template with {{placeholders}}.
  --output-root <path>   PNG source root. Default: media-source/exercises
  --reference-file <p>   Reference image for OpenAI image edit. Can be repeated.
  --model <name>         OpenAI image model. Default: gpt-image-1 or OPENAI_IMAGE_MODEL
  --size <size>          Image size. Default: 1024x1536 or OPENAI_IMAGE_SIZE
  --limit <n>            Process at most n exercises.
  --offset <n>           Skip first n pending exercises.
  --skip-first <n>       Skip first n summary entries. Default: 2
  --only-id <id>         Process one exercise id.
  --delay-ms <n>         Delay between exercises. Default: 1200
  --overwrite            Regenerate even if start.png and end.png exist.
  --dry-run              Print planned work without calling OpenAI.
  --check-key            Resolve OPENAI_API_KEY source and exit without generation.

After generation run: npm run exercise:media:optimize
`);
}

async function readTextIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function getConfigValue(data, keyPath) {
  let current = data;
  for (const key of keyPath) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return null;
    }
    current = current[key];
  }

  return typeof current === "string" && current.trim() ? current.trim() : null;
}

function parseEnvFileValue(source, key) {
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();
    if (name !== key) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    return rawValue.replace(/^["']|["']$/g, "").trim() || null;
  }

  return null;
}

async function getBackendUserSecretsId() {
  const projectFile = await readTextIfExists(backendProjectPath);
  const match = projectFile?.match(/<UserSecretsId>([^<]+)<\/UserSecretsId>/i);
  return match?.[1]?.trim() || null;
}

function getUserSecretsPaths(userSecretsId) {
  const paths = [];
  if (process.env.APPDATA) {
    paths.push(path.join(process.env.APPDATA, "Microsoft", "UserSecrets", userSecretsId, "secrets.json"));
  }
  if (process.env.USERPROFILE) {
    paths.push(path.join(process.env.USERPROFILE, "AppData", "Roaming", "Microsoft", "UserSecrets", userSecretsId, "secrets.json"));
  }
  if (process.env.HOME) {
    paths.push(path.join(process.env.HOME, ".microsoft", "usersecrets", userSecretsId, "secrets.json"));
  }

  return [...new Set(paths)];
}

async function readOpenAiKeyFromJson(filePath) {
  const source = await readTextIfExists(filePath);
  if (!source) {
    return null;
  }

  try {
    const parsed = JSON.parse(source.replace(/^\uFEFF/, ""));
    return parsed.OPENAI_API_KEY?.trim?.()
      || parsed["OPENAI_API_KEY"]?.trim?.()
      || getConfigValue(parsed, ["OpenAI", "ApiKey"])
      || getConfigValue(parsed, ["OpenAI", "API_KEY"]);
  } catch {
    return null;
  }
}

async function resolveOpenAiApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return { key: process.env.OPENAI_API_KEY.trim(), source: "OPENAI_API_KEY environment variable" };
  }

  for (const envPath of envFilePaths) {
    const source = await readTextIfExists(envPath);
    const key = source ? parseEnvFileValue(source, "OPENAI_API_KEY") : null;
    if (key) {
      return { key, source: path.relative(repoRoot, envPath) };
    }
  }

  const userSecretsId = await getBackendUserSecretsId();
  if (userSecretsId) {
    for (const secretsPath of getUserSecretsPaths(userSecretsId)) {
      const key = await readOpenAiKeyFromJson(secretsPath);
      if (key) {
        return { key, source: `ASP.NET user-secrets (${userSecretsId})` };
      }
    }
  }

  for (const appSettingsPath of backendAppSettingsPaths) {
    const key = await readOpenAiKeyFromJson(appSettingsPath);
    if (key) {
      return { key, source: path.relative(repoRoot, appSettingsPath) };
    }
  }

  return { key: null, source: null };
}

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find exercise array literal in ${fileName}`);
  }
  return source.slice(start, end + 1);
}

async function loadCatalogExercises() {
  const files = (await readdir(catalogDir))
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort((left, right) => left.localeCompare(right));
  const exercises = [];

  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    const parsed = JSON.parse(getArrayLiteral(source, fileName));
    exercises.push(...parsed);
  }

  return exercises;
}

function normalizeKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase("pl");
}

function buildCatalogLookup(catalogExercises) {
  const lookup = new Map();

  for (const exercise of catalogExercises) {
    const keys = [
      `${normalizeKey(exercise.polishName)}|${normalizeKey(exercise.name)}|${normalizeKey(exercise.category)}`,
      `${normalizeKey(exercise.name)}|${normalizeKey(exercise.category)}`,
      `${normalizeKey(exercise.polishName)}|${normalizeKey(exercise.category)}`
    ];

    for (const key of keys) {
      if (!lookup.has(key)) {
        lookup.set(key, exercise);
      }
    }
  }

  return lookup;
}

function resolveExerciseId(summaryItem, lookup) {
  const keys = [
    `${normalizeKey(summaryItem.polishName)}|${normalizeKey(summaryItem.englishName)}|${normalizeKey(summaryItem.exerciseType)}`,
    `${normalizeKey(summaryItem.englishName)}|${normalizeKey(summaryItem.exerciseType)}`,
    `${normalizeKey(summaryItem.polishName)}|${normalizeKey(summaryItem.exerciseType)}`
  ];

  for (const key of keys) {
    const catalogExercise = lookup.get(key);
    if (catalogExercise?.id) {
      return catalogExercise.id;
    }
  }

  return null;
}

function renderPrompt(template, exercise) {
  const requiredEquipment = Array.isArray(exercise.requiredEquipment) && exercise.requiredEquipment.length
    ? exercise.requiredEquipment.join(", ")
    : "none";

  return template
    .replaceAll("{{id}}", exercise.id)
    .replaceAll("{{polishName}}", exercise.polishName)
    .replaceAll("{{englishName}}", exercise.englishName)
    .replaceAll("{{exerciseType}}", exercise.exerciseType)
    .replaceAll("{{requiredEquipment}}", requiredEquipment);
}

async function hasExistingImages(outputDir) {
  try {
    const files = await readdir(outputDir);
    return files.includes("start.png") && files.includes("end.png");
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".svg") return "image/svg+xml";
  return "image/png";
}

async function existingFiles(filePaths) {
  const result = [];
  for (const filePath of filePaths) {
    try {
      await access(filePath);
      result.push(filePath);
    } catch {
      // Missing optional references are ignored so dry runs and fresh clones stay usable.
    }
  }
  return result;
}

async function appendReferenceFiles(formData, referenceFiles) {
  for (const filePath of referenceFiles) {
    const fileBuffer = await readFile(filePath);
    const mimeType = getMimeType(filePath);
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("image[]", blob, path.basename(filePath));
  }
}

async function callOpenAiImages({ apiKey, model, prompt, referenceFiles, size }) {
  const formData = new FormData();
  formData.append("model", model);
  formData.append("n", "2");
  formData.append("prompt", prompt);
  formData.append("size", size);
  await appendReferenceFiles(formData, referenceFiles);

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    body: formData,
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    method: "POST"
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI Images API returned ${response.status}: ${responseText}`);
  }

  const responseBody = JSON.parse(responseText);
  const images = Array.isArray(responseBody.data)
    ? responseBody.data.map((item) => item?.b64_json).filter(Boolean)
    : [];

  if (images.length < 2) {
    throw new Error(`OpenAI Images API returned ${images.length} images, expected 2.`);
  }

  return images.slice(0, 2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKeyInfo = await resolveOpenAiApiKey();
  if (args.checkKey) {
    if (!apiKeyInfo.key) {
      throw new Error("OPENAI_API_KEY is not configured. Checked environment, .env files, backend user-secrets, and backend appsettings.");
    }

    console.log(`OpenAI API key source: ${apiKeyInfo.source}`);
    return;
  }

  if (!apiKeyInfo.key && !args.dryRun) {
    throw new Error("OPENAI_API_KEY is not configured. Checked environment, .env files, backend user-secrets, and backend appsettings.");
  }

  const [summaryRaw, promptTemplate, catalogExercises] = await Promise.all([
    readFile(args.summary, "utf8"),
    readFile(args.promptFile, "utf8"),
    loadCatalogExercises()
  ]);
  const summary = JSON.parse(summaryRaw);
  const lookup = buildCatalogLookup(catalogExercises);
  const referenceFiles = await existingFiles(args.referenceFiles.length ? args.referenceFiles : defaultReferenceFiles);
  if (!args.dryRun && referenceFiles.length === 0) {
    throw new Error("No reference image files found. Pass at least one --reference-file before running generation.");
  }
  const unresolved = [];
  const planned = [];

  for (const [summaryIndex, item] of summary.entries()) {
    if (!args.onlyId && summaryIndex < args.skipFirst) {
      continue;
    }

    const id = resolveExerciseId(item, lookup);
    if (!id) {
      unresolved.push(item);
      continue;
    }

    if (args.onlyId && id !== args.onlyId) {
      continue;
    }

    const exercise = { ...item, id };
    const outputDir = path.join(args.outputRoot, id);
    const exists = await hasExistingImages(outputDir);

    if (exists && !args.overwrite) {
      continue;
    }

    planned.push({ exercise, outputDir });
  }

  const selected = planned.slice(args.offset, args.limit === null ? undefined : args.offset + args.limit);

  console.log(`Summary entries: ${summary.length}`);
  console.log(`Catalog entries: ${catalogExercises.length}`);
  console.log(`Unresolved entries: ${unresolved.length}`);
  console.log(`Pending entries: ${planned.length}`);
  console.log(`Selected entries: ${selected.length}`);
  console.log(`Output root: ${path.relative(repoRoot, args.outputRoot)}`);
  console.log(`Reference files: ${referenceFiles.map((filePath) => path.relative(repoRoot, filePath)).join(", ") || "none"}`);
  console.log(`Skip first summary entries: ${args.onlyId ? 0 : args.skipFirst}`);
  if (!args.dryRun) {
    console.log(`OpenAI API key source: ${apiKeyInfo.source}`);
  }

  if (args.dryRun) {
    for (const { exercise } of selected.slice(0, 20)) {
      console.log(`[dry-run] ${exercise.id} | ${exercise.polishName} | ${exercise.englishName}`);
    }
    if (selected.length > 20) {
      console.log(`[dry-run] ...and ${selected.length - 20} more`);
    }
    return;
  }

  for (let index = 0; index < selected.length; index += 1) {
    const { exercise, outputDir } = selected[index];
    const prompt = renderPrompt(promptTemplate, exercise);

    console.log(`[${index + 1}/${selected.length}] Generating ${exercise.id}`);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "prompt.txt"), prompt, "utf8");

    const [startBase64, endBase64] = await callOpenAiImages({
      apiKey: apiKeyInfo.key,
      model: args.model,
      prompt,
      referenceFiles,
      size: args.size
    });

    await Promise.all([
      writeFile(path.join(outputDir, "start.png"), Buffer.from(startBase64, "base64")),
      writeFile(path.join(outputDir, "end.png"), Buffer.from(endBase64, "base64")),
      writeFile(path.join(outputDir, "metadata.json"), `${JSON.stringify({
        englishName: exercise.englishName,
        exerciseType: exercise.exerciseType,
        generatedAt: new Date().toISOString(),
        id: exercise.id,
        model: args.model,
        polishName: exercise.polishName,
        requiredEquipment: exercise.requiredEquipment,
        size: args.size
      }, null, 2)}\n`, "utf8")
    ]);

    if (args.delayMs > 0 && index < selected.length - 1) {
      await sleep(args.delayMs);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
