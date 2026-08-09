import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.basename(process.cwd()) === "mobile" ? path.resolve(process.cwd(), "..", "..") : process.cwd();
const app = fs.readFileSync(path.join(root, "apps", "mobile", "App.tsx"), "utf8");
const requiredFiles = [
  "apps/mobile/src/components/AiCopyPasteFlow.tsx",
  "apps/mobile/src/domain/aiCopyPaste.ts",
  "apps/mobile/src/domain/bugReportEmail.ts",
  "apps/mobile/src/domain/localDataDeletion.ts",
  "apps/mobile/src/domain/localOnlyStorageMigration.ts",
  "apps/mobile/src/domain/localUserProfile.ts",
  "apps/mobile/src/domain/localBackup/gymminBackup.ts",
  "apps/mobile/src/features/profile/useLocalUserProfile.ts",
];
const failures = [];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`missing local product module: ${relative}`);
}
for (const marker of [
  "buildAiWorkoutPrompt({ creatorDraft, language, mode: \"create\" })",
  "buildAiWorkoutPrompt({ instruction, language, mode: \"rewrite\", sourceWorkout })",
  "deleteAllGymminUserData",
  "cleanupLegacyAuthCredentials",
]) {
  if (!app.includes(marker)) failures.push(`App.tsx: missing marker ${marker}`);
}
for (const forbidden of ["useSystemStatusController", "authPanel=", "systemStatusCallout=", "pendingCreatorJob", "pollWorkoutCreatorJob"]) {
  if (app.includes(forbidden)) failures.push(`App.tsx: legacy runtime marker remains: ${forbidden}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Local product runtime guard passed: migration, backup, profile, AI copy/paste, bug email, and data deletion remain local.");
