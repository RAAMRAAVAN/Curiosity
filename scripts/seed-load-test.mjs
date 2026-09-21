#!/usr/bin/env node

import bcrypt from "bcryptjs";
import { prisma } from "../server/prisma.js";

const MARKER_KEY = "load-test.dataset.v1";
const CENTER_COUNT = 150;
const STUDENTS_PER_CENTER = 50;
const TEACHERS_PER_CENTER = 6;
const CLASSES_PER_CENTER = 3;
const ATTENDANCE_DAYS = Number(process.env.LOAD_TEST_ATTENDANCE_DAYS || 7);
const LOAD_PASSWORD = process.env.LOAD_TEST_SEED_PASSWORD || "LoadTest@2026!";
const BATCH_SIZE = 500;

const loadId = (kind, index) => `load_${kind}_${String(index).padStart(4, "0")}`;
const chunk = (items, size = BATCH_SIZE) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

async function createInBatches(model, rows) {
  for (const batch of chunk(rows)) {
    await model.createMany({ data: batch });
  }
}

async function cleanup() {
  console.log("Removing load-test-prefixed records...");
  const marker = await prisma.appSetting.findUnique({ where: { key: MARKER_KEY } });
  const markerData = marker?.value ? JSON.parse(marker.value) : {};
  await prisma.appSetting.deleteMany({
    where: { OR: [{ key: MARKER_KEY }, { key: { startsWith: "rbac.userAccess.load_" } }] },
  });
  await prisma.user.deleteMany({ where: { id: { startsWith: "load_" } } });
  await prisma.assessment.deleteMany({ where: { id: { startsWith: "load_" } } });
  await prisma.class.deleteMany({ where: { id: { startsWith: "load_" } } });
  await prisma.center.deleteMany({ where: { id: { startsWith: "load_" } } });
  if (markerData.previousRolesValue) {
    await prisma.appSetting.upsert({
      where: { key: "rbac.roles.v1" },
      create: { key: "rbac.roles.v1", value: markerData.previousRolesValue },
      update: { value: markerData.previousRolesValue },
    });
  }
  console.log("Load-test records removed.");
}

async function seed() {
  const existing = await prisma.appSetting.findUnique({ where: { key: MARKER_KEY } });
  if (existing) {
    throw new Error("A load-test dataset already exists. Run `node scripts/seed-load-test.mjs cleanup` first.");
  }

  const existingRolesSetting = await prisma.appSetting.findUnique({ where: { key: "rbac.roles.v1" } });
  await prisma.appSetting.create({
    data: {
      key: MARKER_KEY,
      value: JSON.stringify({ state: "seeding", previousRolesValue: existingRolesSetting?.value || null }),
    },
  });

  const passwordHash = await bcrypt.hash(LOAD_PASSWORD, 10);
  const centers = Array.from({ length: CENTER_COUNT }, (_, index) => ({
    id: loadId("center", index),
    name: `Load Test Center ${String(index + 1).padStart(3, "0")}`,
    slug: `L${String(index + 1).padStart(2, "0")}`,
    status: true,
  }));
  const classes = centers.flatMap((center, centerIndex) => Array.from({ length: CLASSES_PER_CENTER }, (_, classIndex) => ({
    id: loadId(`class_${centerIndex}_${classIndex}`, 0),
    className: `Load ${String(centerIndex + 1).padStart(3, "0")} Class ${classIndex + 1}`,
    centerId: center.id,
    status: true,
  })));
  const classByCenter = new Map();
  for (const item of classes) {
    const centerIndex = Number(item.id.split("_")[2]);
    const list = classByCenter.get(centerIndex) || [];
    list.push(item);
    classByCenter.set(centerIndex, list);
  }

  const teacherUsers = centers.flatMap((center, centerIndex) => Array.from({ length: TEACHERS_PER_CENTER }, (_, teacherIndex) => ({
    id: loadId(`teacher_${centerIndex}_${teacherIndex}`, 0),
    name: `Load Teacher ${centerIndex + 1}-${teacherIndex + 1}`,
    email: `load.teacher.${centerIndex + 1}.${teacherIndex + 1}@curiosity.test`,
    password: passwordHash,
    role: "TEACHER",
    centerId: center.id,
    status: true,
  })));
  const studentUsers = centers.flatMap((center, centerIndex) => Array.from({ length: STUDENTS_PER_CENTER }, (_, studentIndex) => ({
    id: loadId(`student_${centerIndex}_${studentIndex}`, 0),
    name: `Load Student ${centerIndex + 1}-${studentIndex + 1}`,
    email: `load.student.${centerIndex + 1}.${studentIndex + 1}@curiosity.test`,
    password: passwordHash,
    role: "STUDENT",
    centerId: center.id,
    status: true,
  })));
  const adminUsers = Array.from({ length: 5 }, (_, index) => ({
    id: loadId("admin", index),
    name: `Load Admin ${index + 1}`,
    email: index === 0 ? "load.admin@curiosity.test" : `load.admin.${index + 1}@curiosity.test`,
    password: passwordHash,
    role: "ADMIN",
    status: true,
  }));
  const managementUsers = Array.from({ length: 30 }, (_, index) => ({
    id: loadId("management", index),
    name: `Load Management ${index + 1}`,
    email: `load.management.${index + 1}@curiosity.test`,
    password: passwordHash,
    role: "MANAGEMENT",
    status: true,
  }));

  await createInBatches(prisma.center, centers);
  await createInBatches(prisma.class, classes);
  await createInBatches(prisma.user, [...teacherUsers, ...studentUsers, ...adminUsers, ...managementUsers]);
  await createInBatches(prisma.teacher, teacherUsers.map((user, index) => ({
    id: loadId("teacher_profile", index), userId: user.id, centerId: user.centerId, name: user.name, status: true,
  })));
  await createInBatches(prisma.student, studentUsers.map((user, index) => {
    const centerIndex = Math.floor(index / STUDENTS_PER_CENTER);
    const classList = classByCenter.get(centerIndex);
    return { id: loadId("student_profile", index), userId: user.id, centerId: user.centerId, studyingClass: classList[index % CLASSES_PER_CENTER].id, status: true };
  }));
  await createInBatches(prisma.admin, adminUsers.map((user, index) => ({ id: loadId("admin_profile", index), userId: user.id, status: true })));
  await createInBatches(prisma.management, managementUsers.map((user, index) => ({ id: loadId("management_profile", index), userId: user.id, status: true })));

  let attendanceRows = 0;
  for (let dayOffset = 0; dayOffset < ATTENDANCE_DAYS; dayOffset += 1) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - dayOffset);
    const dayRows = [];
    for (let index = 0; index < studentUsers.length; index += 1) {
      const centerIndex = Math.floor(index / STUDENTS_PER_CENTER);
      const classList = classByCenter.get(centerIndex);
      dayRows.push({
        id: loadId(`attendance_${dayOffset}`, index),
        attendanceDate: date,
        studentId: studentUsers[index].id,
        centerId: studentUsers[index].centerId,
        classId: classList[index % CLASSES_PER_CENTER].id,
        status: index % 17 === 0 ? "ABSENT" : "PRESENT",
        markedBy: teacherUsers[centerIndex * TEACHERS_PER_CENTER].id,
      });
    }
    await createInBatches(prisma.studentAttendance, dayRows);
    attendanceRows += dayRows.length;
  }

  const assessments = centers.map((center, centerIndex) => ({
    id: loadId("assessment", centerIndex),
    classId: classByCenter.get(centerIndex)[0].id,
    title: `Load Assessment ${centerIndex + 1}`,
    description: "Synthetic assessment for load testing.",
    type: "ASSESSMENT",
    totalMarks: 5,
    status: true,
  }));
  await createInBatches(prisma.assessment, assessments);

  const questions = assessments.flatMap((assessment, assessmentIndex) => Array.from({ length: 5 }, (_, questionIndex) => ({
    id: loadId(`question_${assessmentIndex}`, questionIndex),
    assessmentId: assessment.id,
    questionText: `Load question ${questionIndex + 1}`,
    marks: 1,
    displayOrder: questionIndex + 1,
    status: true,
  })));
  const options = questions.flatMap((question, questionIndex) => Array.from({ length: 4 }, (_, optionIndex) => ({
    id: loadId(`option_${questionIndex}`, optionIndex),
    questionId: question.id,
    optionText: `Option ${optionIndex + 1}`,
    isCorrect: optionIndex === 0,
    displayOrder: optionIndex + 1,
    status: true,
  })));
  await createInBatches(prisma.assessmentQuestion, questions);
  await createInBatches(prisma.assessmentOption, options);

  const results = [];
  const assessmentAttendances = [];
  for (let centerIndex = 0; centerIndex < centers.length; centerIndex += 1) {
    const assessment = assessments[centerIndex];
    for (let studentIndex = 0; studentIndex < STUDENTS_PER_CENTER; studentIndex += 1) {
      const globalStudentIndex = centerIndex * STUDENTS_PER_CENTER + studentIndex;
      const student = studentUsers[globalStudentIndex];
      results.push({
        id: loadId(`result_${centerIndex}`, studentIndex),
        assessmentId: assessment.id,
        userId: student.id,
        score: studentIndex % 6,
        totalQuestions: 5,
        totalMarks: 5,
        percentage: (studentIndex % 6) * 20,
        grade: studentIndex % 6 === 5 ? "A" : "B",
        answers: "[]",
        status: true,
      });
      assessmentAttendances.push({
        id: loadId(`assessment_attendance_${centerIndex}`, studentIndex),
        assessmentId: assessment.id,
        userId: student.id,
        status: studentIndex % 17 === 0 ? "ABSENT" : "PRESENT",
        markedBy: teacherUsers[centerIndex * TEACHERS_PER_CENTER].id,
        markedAt: new Date(),
      });
    }
  }
  await createInBatches(prisma.assessmentResult, results);
  await createInBatches(prisma.assessmentAttendance, assessmentAttendances);

  const roles = [
    { id: "load_role_it_admin", name: "Load IT Admin", permissions: ["*"] },
    { id: "load_role_manager", name: "Load Manager", permissions: ["users.view", "teachers.view", "students.view", "results.view", "attendance.view"] },
    { id: "load_role_coordinator", name: "Load Coordinator", permissions: ["teachers.view", "students.view", "attendance.view", "attendance.mark", "assessments.view"] },
  ];
  const existingRoles = existingRolesSetting?.value ? JSON.parse(existingRolesSetting.value) : [];
  const mergedRoles = [
    ...(Array.isArray(existingRoles) ? existingRoles.filter((role) => !String(role.id || "").startsWith("load_role_")) : []),
    ...roles,
  ];
  await prisma.appSetting.upsert({ where: { key: "rbac.roles.v1" }, create: { key: "rbac.roles.v1", value: JSON.stringify(mergedRoles) }, update: { value: JSON.stringify(mergedRoles) } });
  await prisma.appSetting.update({
    where: { key: MARKER_KEY },
    data: { value: JSON.stringify({ state: "ready", previousRolesValue: existingRolesSetting?.value || null, centers: CENTER_COUNT, students: studentUsers.length, teachers: teacherUsers.length, attendanceDays: ATTENDANCE_DAYS, assessments: assessments.length, assessmentResults: results.length }) },
  });
  for (let index = 0; index < managementUsers.length; index += 1) {
    const role = index < 10 ? roles[0] : index < 20 ? roles[1] : roles[2];
    await prisma.appSetting.create({
      data: {
        key: `rbac.userAccess.${managementUsers[index].id}.v1`,
        value: JSON.stringify({ roleId: role.id, centerIds: centers.map((center) => center.id), updatedAt: new Date().toISOString() }),
      },
    });
  }

  console.log(JSON.stringify({
    centers: centers.length,
    students: studentUsers.length,
    teachers: teacherUsers.length,
    admins: adminUsers.length,
    managementUsers: managementUsers.length,
    classes: classes.length,
    attendanceRows,
    assessments: assessments.length,
    assessmentResults: results.length,
    loadTestEmail: adminUsers[0].email,
  }, null, 2));
}

const command = process.argv[2] || "seed";
try {
  if (command === "cleanup") await cleanup();
  else if (command === "seed") await seed();
  else throw new Error(`Unknown command: ${command}. Use seed or cleanup.`);
} finally {
  await prisma.$disconnect();
}