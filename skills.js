#!/usr/bin/env node

/**
 * Elastic Agent Skills installer for Gemini CLI.
 *
 * Fetches skill metadata and files from the elastic/agent-skills GitHub repo
 * via the REST API. Downloads raw file content directly — no git clone needed.
 * Zero external dependencies: only Node.js built-ins (fs, path, readline) and
 * fetch (Node 18+).
 *
 * Skills are installed into the skills/ directory at the root of the project,
 * next to this script.
 *
 * Usage:
 *    node skills.js --list
 *    node skills.js --install <skill-name> [<skill-name> ...]
 *    node skills.js --install --interactive
 *    node skills.js --install-all
 *    node skills.js --uninstall <skill-name> [<skill-name> ...]
 *    node skills.js --installed
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const REPO_OWNER = "elastic";
const REPO_NAME = "agent-skills";
const BRANCH = "main";
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

const HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "elastic-skill-installer",
};

const CACHE_PATH = path.join(require("os").tmpdir(), "elastic-agent-skills-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Reads the cached repo tree from the OS temp directory.
 * Returns the tree array if the cache exists and is within TTL, otherwise null.
 */
function readCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
    if (Date.now() - data.timestamp < CACHE_TTL_MS) return data.tree;
  } catch (err) {
    console.error(`Cache read failed: ${err.message}. Fetching from GitHub.`);
  }
  return null;
}

/**
 * Writes the repo tree to the OS temp directory with a timestamp.
 */
function writeCache(tree) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ timestamp: Date.now(), tree }));
  } catch (err) {
    console.error(`Cache write failed: ${err.message}`);
  }
}

/**
 * Fetches the full file tree of the repo from the GitHub Git Trees API.
 * Returns an array of {path, type} objects for every file and directory.
 * Uses a local cache (1 hour TTL) to avoid repeated API calls.
 *
 * @param {boolean} forceRefresh - skip cache and fetch fresh from GitHub
 */
async function fetchRepoTree(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) {
      console.log("Using cached skill data.\n");
      return cached;
    }
  }
  console.log("Fetching skills from elastic/agent-skills repository...\n");
  const url = `${API_BASE}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  writeCache(data.tree);
  return data.tree;
}

/**
 * Scans the file tree for skills matching the pattern skills/{domain}/{skill-dir}/SKILL.md.
 * Returns an object keyed by domain (e.g. "elasticsearch", "cloud") where each value
 * is a sorted array of skill directory names within that domain.
 */
function discoverSkills(tree) {
  const skills = {};
  for (const item of tree) {
    const parts = item.path.split("/");
    if (
      parts.length === 4 &&
      parts[0] === "skills" &&
      parts[3] === "SKILL.md"
    ) {
      const domain = parts[1];
      const skillDir = parts[2];
      if (!skills[domain]) skills[domain] = [];
      skills[domain].push(skillDir);
    }
  }
  for (const domain of Object.keys(skills)) {
    skills[domain].sort();
  }
  return skills;
}

/**
 * Given a domain and skill directory name, returns all file paths belonging to
 * that skill (SKILL.md, references/, scripts/, assets/, etc.).
 */
function findSkillFiles(tree, domain, skillDir) {
  const prefix = `skills/${domain}/${skillDir}/`;
  return tree
    .filter((item) => item.path.startsWith(prefix) && item.type === "blob")
    .map((item) => item.path);
}

/**
 * Resolves a user-provided skill name to its domain and directory.
 * Handles both formats: the raw directory name ("elasticsearch-esql") and
 * the canonical name ("cloud-setup" -> domain "cloud", dir "setup").
 * Returns {domain, skillDir} or null if not found.
 */
function resolveSkill(skills, name) {
  for (const [domain, list] of Object.entries(skills)) {
    if (list.includes(name)) return { domain, skillDir: name };
  }
  for (const [domain, list] of Object.entries(skills)) {
    const prefixed = list.find((s) => `${domain}-${s}` === name);
    if (prefixed) return { domain, skillDir: prefixed };
  }
  return null;
}

/**
 * Downloads a single file from the repo via raw.githubusercontent.com.
 */
async function downloadFile(filePath) {
  const url = `${RAW_BASE}/${filePath}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to download ${filePath}: ${res.status}`);
  }
  return await res.text();
}

/**
 * Returns the skills directory: skills/ next to this script (project root).
 * Creates the directory if it does not already exist.
 */
function getSkillsDir() {
  const dir = path.resolve(__dirname, "skills");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Produces the canonical skill name used for the install directory.
 * Avoids double-prefixing: "elasticsearch-esql" stays as-is,
 * but "setup" in domain "cloud" becomes "cloud-setup".
 */
function canonicalName(domain, skillDir) {
  if (skillDir.startsWith(`${domain}-`)) return skillDir;
  return `${domain}-${skillDir}`;
}

/**
 * Builds a flat numbered list of all skills in display order
 * (domains sorted alphabetically, skills sorted within each domain).
 * Returns an array of {domain, skillDir, name} objects where the
 * array index + 1 is the skill number.
 */
function buildNumberedList(skills) {
  const list = [];
  for (const domain of Object.keys(skills).sort()) {
    for (const skillDir of skills[domain]) {
      list.push({ domain, skillDir, name: canonicalName(domain, skillDir) });
    }
  }
  return list;
}

/**
 * Shows an interactive multi-select picker for skills.
 * Controls: up/down arrows (or j/k), Space to toggle, Enter to install,
 * q/esc/Ctrl+C to cancel.
 */
function selectSkillsInteractive(numbered) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Interactive mode requires a TTY terminal.");
  }
  if (numbered.length === 0) {
    throw new Error("No skills available to select.");
  }

  return new Promise((resolve) => {
    let selected = 0;
    let top = 0;
    const selectedIndices = new Set();

    const visibleRows = Math.max(6, (process.stdout.rows || 20) - 6);

    function ensureVisible() {
      if (selected < top) top = selected;
      if (selected >= top + visibleRows) top = selected - visibleRows + 1;
    }

    function render() {
      ensureVisible();
      const end = Math.min(top + visibleRows, numbered.length);

      process.stdout.write("\x1b[2J\x1b[H");
      process.stdout.write("Select one or more skills to install\n");
      process.stdout.write("Use ↑/↓ (or j/k), Space to toggle, Enter to install, q to cancel\n\n");

      for (let i = top; i < end; i++) {
        const item = numbered[i];
        const checked = selectedIndices.has(i) ? "[*]" : "[ ]";
        const line = `${checked} [${item.domain}] ${item.name}`;
        if (i === selected) {
          process.stdout.write(`\x1b[7m${line}\x1b[0m\n`);
        } else {
          process.stdout.write(`${line}\n`);
        }
      }

      process.stdout.write(`\nSelected: ${selectedIndices.size}`);

      if (end < numbered.length) {
        process.stdout.write(`\n... ${numbered.length - end} more\n`);
      }
    }

    function cleanup() {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      process.stdout.write("\x1b[?25h\x1b[0m\n");
    }

    function onKeypress(_, key = {}) {
      if (key.name === "up" || key.name === "k") {
        selected = selected > 0 ? selected - 1 : numbered.length - 1;
        render();
        return;
      }
      if (key.name === "down" || key.name === "j") {
        selected = selected < numbered.length - 1 ? selected + 1 : 0;
        render();
        return;
      }
      if (key.name === "return") {
        const names = Array.from(selectedIndices)
          .sort((a, b) => a - b)
          .map((idx) => numbered[idx].name);
        cleanup();
        resolve(names);
        return;
      }
      if (key.name === "space") {
        if (selectedIndices.has(selected)) {
          selectedIndices.delete(selected);
        } else {
          selectedIndices.add(selected);
        }
        render();
        return;
      }
      if (key.name === "escape" || key.name === "q" || (key.ctrl && key.name === "c")) {
        cleanup();
        resolve([]);
      }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    process.stdin.on("keypress", onKeypress);

    render();
  });
}

/**
 * Downloads all files for a single skill and writes them to the target directory.
 * Creates the directory structure (references/, scripts/, etc.) as needed.
 */
async function installSkill(tree, skills, name, targetDir) {
  const match = resolveSkill(skills, name);
  if (!match) {
    console.error(`Error: skill "${name}" not found. Run --list to see available skills.`);
    process.exit(1);
  }

  const { domain, skillDir } = match;
  const skillName = canonicalName(domain, skillDir);
  const files = findSkillFiles(tree, domain, skillDir);
  const skillTargetDir = path.join(targetDir, skillName);

  console.log(`Installing ${skillName}...`);

  for (const filePath of files) {
    const content = await downloadFile(filePath);
    const relativePath = filePath.replace(`skills/${domain}/${skillDir}/`, "");
    const destPath = path.join(skillTargetDir, relativePath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, content, "utf-8");
  }

  console.log(`  ${skillName} installed (${files.length} files)`);
  return skillName;
}

/**
 * Fetches and prints all available skills grouped by domain.
 */
async function listSkills(forceRefresh = false) {
  const tree = await fetchRepoTree(forceRefresh);
  const skills = discoverSkills(tree);
  const numbered = buildNumberedList(skills);

  console.log("Available Elastic Agent Skills\n");

  let currentDomain = null;
  for (let i = 0; i < numbered.length; i++) {
    const { domain, name } = numbered[i];
    if (domain !== currentDomain) {
      if (currentDomain !== null) console.log();
      const count = skills[domain].length;
      console.log(`${domain} (${count}):`);
      currentDomain = domain;
    }
    console.log(`  ${String(i + 1).padStart(2)}) ${name}`);
  }
  console.log(`\nTotal: ${numbered.length} skills`);
  console.log("\nInstall by name, e.g: --install elasticsearch-esql cloud-setup");
  console.log("Or install by number, e.g: --install 1 5 12");
}

/**
 * Installs one or more skills by name. Fetches the repo tree once,
 * then downloads each skill's files sequentially.
 */
async function handleInstall(names, targetDir, forceRefresh = false) {
  const tree = await fetchRepoTree(forceRefresh);
  const skills = discoverSkills(tree);
  const numbered = buildNumberedList(skills);
  const installed = [];

  for (const input of names) {
    const num = parseInt(input, 10);
    const name = (!isNaN(num) && num >= 1 && num <= numbered.length)
      ? numbered[num - 1].name
      : input;
    const result = await installSkill(tree, skills, name, targetDir);
    installed.push(result);
  }

  console.log(`\nInstalled ${installed.length} skill(s).`);
  console.log("Reload skills with /skills reload or restart Gemini CLI.");
}

/**
 * Installs a single skill chosen in an interactive picker.
 */
async function handleInstallInteractive(targetDir, forceRefresh = false) {
  const tree = await fetchRepoTree(forceRefresh);
  const skills = discoverSkills(tree);
  const numbered = buildNumberedList(skills);

  const selectedNames = await selectSkillsInteractive(numbered);
  if (selectedNames.length === 0) {
    console.log("No skills selected. Installation canceled.");
    return;
  }

  console.log("\nSelected skills:");
  for (const name of selectedNames) {
    console.log(`  - ${name}`);
  }
  console.log();

  const installed = [];
  for (const name of selectedNames) {
    const result = await installSkill(tree, skills, name, targetDir);
    installed.push(result);
  }

  console.log(`\nInstalled ${installed.length} skill(s).`);
  console.log("Reload skills with /skills reload or restart Gemini CLI.");
}

/**
 * Removes one or more installed skills by deleting their directories.
 */
function handleUninstall(names, targetDir) {
  let removed = 0;
  for (const name of names) {
    const skillPath = path.join(targetDir, name);
    if (fs.existsSync(skillPath)) {
      fs.rmSync(skillPath, { recursive: true, force: true });
      console.log(`Uninstalled ${name}`);
      removed++;
    } else {
      console.error(`Skill "${name}" not found in ${targetDir}`);
    }
  }
  if (removed > 0) {
    console.log(`\nRemoved ${removed} skill(s). Restart session to apply.`);
  }
}

/**
 * Scans the target directory for installed skills (directories containing a SKILL.md)
 * and prints them sorted alphabetically.
 */
function handleListInstalled(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.log("No skills installed.");
    return;
  }
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const skills = entries.filter(
    (e) => e.isDirectory() && fs.existsSync(path.join(targetDir, e.name, "SKILL.md"))
  );
  if (skills.length === 0) {
    console.log("No skills installed.");
    return;
  }
  console.log(`Installed skills (${skills.length}):\n`);
  for (const s of skills.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  - ${s.name}`);
  }
}

/**
 * Installs every available skill from the repo.
 */
async function handleInstallAll(targetDir, forceRefresh = false) {
  const tree = await fetchRepoTree(forceRefresh);
  const skills = discoverSkills(tree);
  const allNames = [];
  for (const list of Object.values(skills)) {
    allNames.push(...list);
  }
  await handleInstall(allNames, targetDir);
}

/**
 * Parses CLI arguments and dispatches to the appropriate handler.
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  node skills.js --list
  node skills.js --install <skill-name> [<skill-name> ...]
  node skills.js --install --interactive
  node skills.js --install-all
  node skills.js --uninstall <skill-name> [<skill-name> ...]
  node skills.js --installed

Options:
  --list            List all available skills from elastic/agent-skills
  --install         Install one or more skills by name
  --interactive     Interactive multi-select skill picker (Space to toggle)
  --install-all     Install all available skills
  --uninstall       Remove one or more installed skills
  --installed       List locally installed skills
  --refresh         Skip cache and fetch fresh skill data from GitHub

Skills are installed to the skills/ directory at the root of this project.`);
    process.exit(0);
  }

  const targetDir = getSkillsDir();
  const forceRefresh = args.includes("--refresh");

  if (args.includes("--list")) {
    await listSkills(forceRefresh);
  } else if (args.includes("--installed")) {
    handleListInstalled(targetDir);
  } else if (args.includes("--install-all")) {
    await handleInstallAll(targetDir, forceRefresh);
  } else if (args.includes("--install")) {
    const installIdx = args.indexOf("--install");
    const interactive = args.includes("--interactive") || args.includes("-i");
    const names = [];
    for (let i = installIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      names.push(args[i]);
    }
    if (interactive) {
      if (names.length > 0) {
        console.error("Error: --interactive cannot be combined with explicit skill names.");
        process.exit(1);
      }
      await handleInstallInteractive(targetDir, forceRefresh);
    } else {
      if (names.length === 0) {
        console.error("Error: --install requires at least one skill name, or use --interactive.");
        process.exit(1);
      }
      await handleInstall(names, targetDir, forceRefresh);
    }
  } else if (args.includes("--uninstall")) {
    const uninstallIdx = args.indexOf("--uninstall");
    const names = [];
    for (let i = uninstallIdx + 1; i < args.length; i++) {
      if (args[i].startsWith("--")) break;
      names.push(args[i]);
    }
    if (names.length === 0) {
      console.error("Error: --uninstall requires at least one skill name.");
      process.exit(1);
    }
    handleUninstall(names, targetDir);
  } else {
    console.error("Unknown command. Use --help for usage.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
