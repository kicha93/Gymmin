import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.basename(process.cwd()) === "mobile" ? path.resolve(process.cwd(), "..", "..") : process.cwd();
const app = fs.readFileSync(path.join(root, "apps", "mobile", "App.tsx"), "utf8");
const homeScreen = fs.readFileSync(path.join(root, "apps", "mobile", "src", "screens", "HomeScreen.tsx"), "utf8");
const workoutsScreen = fs.readFileSync(path.join(root, "apps", "mobile", "src", "screens", "WorkoutsScreen.tsx"), "utf8");
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
  "buildAiWorkoutPrompt({ creatorDraft, language })",
  "deleteAllGymminUserData",
  "cleanupLegacyAuthCredentials",
]) {
  if (!app.includes(marker)) failures.push(`App.tsx: missing marker ${marker}`);
}
for (const forbidden of ["useSystemStatusController", "authPanel=", "systemStatusCallout=", "pendingCreatorJob", "pollWorkoutCreatorJob", "workoutAiRewrite", "onModifyWithAi"]) {
  if (app.includes(forbidden)) failures.push(`App.tsx: legacy runtime marker remains: ${forbidden}`);
}
if (!app.includes('style={[styles.profileHeaderButton, { backgroundColor: theme.secondaryBand }]}')) {
  failures.push("App.tsx: persistent local profile header action is missing");
}
if (app.includes("shouldShowProfileHeaderButton")) {
  failures.push("App.tsx: profile header action must not be gated");
}
if (homeScreen.includes("workoutCreatorButton")) {
  failures.push("HomeScreen.tsx: workout creator must not be duplicated on Home");
}
if (!workoutsScreen.includes("{creatorButton}")) {
  failures.push("WorkoutsScreen.tsx: workout creator must remain available on Workouts");
}
for (const forbidden of ["hasUserDefinedWorkouts", "shouldShowWorkoutCreator", "systemStatusCallout", "offlineCallout"]) {
  if (homeScreen.includes(forbidden)) failures.push(`HomeScreen.tsx: legacy creator/network gate remains: ${forbidden}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Local product runtime guard passed: migration, backup, profile, AI creation copy/paste, bug email, and data deletion remain local; AI rewrite is absent.");
