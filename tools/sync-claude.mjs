#!/usr/bin/env node
/**
 * Собирает из локальных сессий Claude Code сводку «на чём я остановился»
 * по каждому проекту и кладёт её в claude-tasks.json.
 *
 *     npm run sync:claude
 *
 * Файл остаётся на вашей машине: он в .gitignore, потому что тексты запросов
 * бывают личными, а репозиторий публичный. В трекер он попадает вручную —
 * кнопкой «Подтянуть из Claude Code».
 */

import { readdirSync, statSync, openSync, readSync, closeSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const PROJECTS_DIR = process.env["CLAUDE_PROJECTS"] || join(homedir(), ".claude", "projects");
const OUT = process.argv[2] || "claude-tasks.json";

const HEAD_BYTES = 256 * 1024; // заголовок сессии: там лежит тема
const TAIL_BYTES = 1536 * 1024; // хвост: последние реплики
const MAX_RECENT = 3;

/** Кусок файла с начала или с конца, без чтения многомегабайтной середины. */
function readChunk(path, bytes, fromEnd) {
  const size = statSync(path).size;
  const length = Math.min(bytes, size);
  const position = fromEnd ? size - length : 0;
  const buf = Buffer.alloc(length);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, length, position);
  } finally {
    closeSync(fd);
  }
  const text = buf.toString("utf8");
  const lines = text.split("\n");
  // обрезанную с краю строку выбрасываем — она не распарсится
  if (fromEnd && size > length) lines.shift();
  else if (!fromEnd && size > length) lines.pop();
  return lines;
}

function parseLines(lines) {
  const out = [];
  for (const line of lines) {
    if (!line.includes('"type"')) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* обрезанная или битая строка — пропускаем */
    }
  }
  return out;
}

/** Текст реплики пользователя; служебные вставки в угловых скобках отбрасываем. */
function userText(record) {
  const content = record?.message?.content;
  const clean = (s) => {
    const t = String(s).trim();
    if (!t || t.startsWith("<") || t.startsWith("[Request interrupted")) return null;
    return t;
  };
  if (typeof content === "string") return clean(content);
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part?.type === "text") {
        const t = clean(part.text);
        if (t) return t;
      }
    }
  }
  return null;
}

function collectProject(dir) {
  const path = join(PROJECTS_DIR, dir);
  let files;
  try {
    files = readdirSync(path)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(path, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  } catch {
    return null;
  }
  if (!files.length) return null;

  const newest = files[0];
  let title = null;
  let cwd = null;
  let branch = null;
  let lastActivity = null;
  const prompts = [];

  for (const record of parseLines(readChunk(newest, HEAD_BYTES, false))) {
    if (record.type === "custom-title" || record.type === "summary") {
      title = record.title || record.summary || title;
    }
    cwd ||= record.cwd;
  }

  for (const record of parseLines(readChunk(newest, TAIL_BYTES, true))) {
    cwd ||= record.cwd;
    branch ||= record.gitBranch;
    if (record.timestamp) lastActivity = record.timestamp;
    if (record.type === "custom-title" || record.type === "summary") {
      title = record.title || record.summary || title;
    }
    if (record.type === "user") {
      const text = userText(record);
      if (text && prompts.at(-1) !== text) prompts.push(text);
    }
  }

  const recent = prompts.slice(-MAX_RECENT).reverse();

  return {
    key: dir,
    title: title || (cwd ? basename(cwd) : dir.replace(/^C--/, "").replace(/-+/g, " ").trim()),
    path: cwd || null,
    branch: branch && branch !== "HEAD" ? branch : null,
    sessions: files.length,
    lastActivity: lastActivity || new Date(statSync(newest).mtimeMs).toISOString(),
    lastPrompt: recent[0] || null,
    recent,
  };
}

function main() {
  let dirs;
  try {
    dirs = readdirSync(PROJECTS_DIR).filter((d) => statSync(join(PROJECTS_DIR, d)).isDirectory());
  } catch {
    console.error(`Не нашёл папку с сессиями: ${PROJECTS_DIR}`);
    console.error("Если Claude Code хранит их в другом месте, задайте путь: CLAUDE_PROJECTS=... npm run sync:claude");
    process.exit(1);
  }

  const items = dirs.map(collectProject).filter(Boolean);
  items.sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));

  const payload = {
    kind: "claude-code-sync",
    version: 1,
    generatedAt: new Date().toISOString(),
    items,
  };
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Проектов: ${items.length} → ${OUT}\n`);
  for (const item of items) {
    console.log(`  ${item.lastActivity.slice(0, 10)}  ${item.title}`);
    if (item.lastPrompt) console.log(`              ${item.lastPrompt.replace(/\s+/g, " ").slice(0, 90)}`);
  }
  console.log("\nДальше: в трекере — «Подтянуть из Claude Code» и выбрать этот файл.");
}

main();
