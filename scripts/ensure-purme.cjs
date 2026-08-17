/**
 * 푸르메정원(purme) 전용 Git 가드
 * 구름이네(cloudshelter)·제주감귤(jejumilgam) 등 다른 사이트로 push/deploy 되는 것을 막습니다.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const vercelPath = path.join(root, ".vercel", "project.json");

function fail(msg) {
  console.error("\n배포/푸시 중단 — " + msg);
  console.error("이 프로젝트는 purme(푸르메정원) 전용입니다.");
  console.error("cloudshelter / jejumilgam / 다른 사이트로 절대 push·deploy 하지 마세요.\n");
  process.exit(1);
}

if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
  if (vercel.projectName && vercel.projectName !== "purme") {
    fail(`Vercel 연결이 '${vercel.projectName}' 입니다. purme 만 허용됩니다.`);
  }
}

let remote = "";
try {
  remote = execSync("git remote get-url origin", { cwd: root, encoding: "utf8" }).trim();
} catch {
  fail("git origin remote를 읽을 수 없습니다.");
}

if (/cloudshelter|jejumilgam|dogboho/i.test(remote)) {
  fail(`git origin이 금지된 저장소입니다:\n  ${remote}`);
}
if (!/inchowon58-beep\/purme(\.git)?$/i.test(remote.replace(/\.git$/i, "") + ".git") &&
    !/inchowon58-beep\/purme/i.test(remote)) {
  fail(`git origin이 purme가 아닙니다:\n  ${remote}`);
}

console.log("대상 확인: Git=inchowon58-beep/purme");
