import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "data");

function storePath(userId) {
  return path.join(DATA_DIR, `teacher_${userId}.json`);
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function readStore(userId) {
  await ensureDataDir();
  const p = storePath(userId);
  try {
    const txt = await fs.readFile(p, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    return { classes: [] };
  }
}

async function writeStore(userId, data) {
  await ensureDataDir();
  const p = storePath(userId);
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
  return data;
}

function id() {
  if (typeof globalThis?.crypto?.randomUUID === "function") return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listClasses(userId) {
  const store = await readStore(userId);
  return store.classes || [];
}

export async function createClass(userId, name, idArg) {
  const store = await readStore(userId);
  const classId = idArg || id();
  const newClass = { id: classId, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), subjects: [] };
  store.classes = [newClass, ...(store.classes || [])];
  await writeStore(userId, store);
  return newClass;
}

export async function listSubjects(userId, classId) {
  const store = await readStore(userId);
  const cls = (store.classes || []).find((c) => c.id === classId);
  return cls ? cls.subjects || [] : [];
}

export async function createSubject(userId, classId, name) {
  const store = await readStore(userId);
  const cls = (store.classes || []).find((c) => c.id === classId);
  if (!cls) throw new Error("Class not found");
  const subject = { id: id(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), contents: [] };
  cls.subjects = [subject, ...(cls.subjects || [])];
  cls.updatedAt = new Date().toISOString();
  await writeStore(userId, store);
  return subject;
}

export async function listContents(userId, subjectId) {
  const store = await readStore(userId);
  for (const c of store.classes || []) {
    const sub = (c.subjects || []).find((s) => s.id === subjectId);
    if (sub) return sub.contents || [];
  }
  return [];
}

export async function createContent(userId, subjectId, contentData) {
  const store = await readStore(userId);
  for (const c of store.classes || []) {
    const sub = (c.subjects || []).find((s) => s.id === subjectId);
    if (sub) {
      const content = { id: id(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...contentData };
      sub.contents = [content, ...(sub.contents || [])];
      sub.updatedAt = new Date().toISOString();
      await writeStore(userId, store);
      return content;
    }
  }
  throw new Error("Subject not found");
}

export async function findContent(userId, contentId) {
  const store = await readStore(userId);
  for (const c of store.classes || []) {
    for (const s of c.subjects || []) {
      const ct = (s.contents || []).find((x) => x.id === contentId);
      if (ct) return ct;
    }
  }
  return null;
}

export async function updateContent(userId, contentId, updates) {
  const store = await readStore(userId);
  for (const c of store.classes || []) {
    for (const s of c.subjects || []) {
      const idx = (s.contents || []).findIndex((x) => x.id === contentId);
      if (idx !== -1) {
        s.contents[idx] = { ...s.contents[idx], ...updates, updatedAt: new Date().toISOString() };
        await writeStore(userId, store);
        return s.contents[idx];
      }
    }
  }
  return null;
}

export async function deleteContent(userId, contentId) {
  const store = await readStore(userId);
  for (const c of store.classes || []) {
    for (const s of c.subjects || []) {
      const idx = (s.contents || []).findIndex((x) => x.id === contentId);
      if (idx !== -1) {
        s.contents.splice(idx, 1);
        await writeStore(userId, store);
        return true;
      }
    }
  }
  return false;
}

export default {
  listClasses,
  createClass,
  listSubjects,
  createSubject,
  listContents,
  createContent,
  findContent,
  updateContent,
  deleteContent,
};
