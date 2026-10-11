#!/usr/bin/env node
/**
 * Fail if server-only secrets appear in the client bundle (.next/static).
 * Run after `npm run build`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), ".next", "static");
const patterns = [
  { name: "service_role JWT hint", re: /service_role/i },
  { name: "sb_secret_ prefix", re: /sb_secret_[A-Za-z0-9]+/ },
  { name: "SUPABASE_SERVICE_ROLE_KEY assignment", re: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/ },
  { name: "AI_PROVIDER_API_KEY assignment", re: /AI_PROVIDER_API_KEY\s*[:=]/ },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(`Missing ${dir}. Run npm run build first.`);
    process.exit(2);
  }
  for (const name of entries) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (/\.(js|css|html|json|txt|map)$/.test(name)) out.push(path);
  }
  return out;
}

const files = walk(ROOT);
const hits = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const { name, re } of patterns) {
    if (re.test(text)) {
      hits.push({ file: file.replace(process.cwd() + "/", ""), name });
    }
  }
}

if (hits.length) {
  console.error("Secret leak audit FAILED:");
  for (const h of hits) console.error(`  ${h.name} in ${h.file}`);
  process.exit(1);
}

console.log(`Secret leak audit OK (${files.length} files under .next/static).`);
