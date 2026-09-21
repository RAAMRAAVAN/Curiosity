#!/usr/bin/env node

import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";

const inputFiles = [
  "reports/public-url-25.json",
  "reports/local5000-25.json",
  "reports/local5000-100.json",
  "reports/heavy-local5000.json",
];
const outputFile = "reports/load-test-report.xlsx";

const reports = await Promise.all(inputFiles.map(async (file) => ({
  file,
  data: JSON.parse(await readFile(file, "utf8")),
})));

const workbook = new ExcelJS.Workbook();
workbook.creator = "Curiosity load test";
workbook.created = new Date();

const navy = "0A336B";
const white = "FFFFFF";
const red = "FEE2E2";
const green = "DCFCE7";

function styleHeader(row) {
  row.font = { bold: true, color: { argb: white } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
  row.alignment = { vertical: "middle", horizontal: "center" };
}

function addReportSheet(report, index) {
  const shortName = index === 0 ? "Public URL" : `Localhost ${report.data.concurrency}`;
  const sheet = workbook.addWorksheet(shortName.slice(0, 31));
  sheet.addRow(["Load Test Report"]);
  sheet.addRow(["Target", report.data.target]);
  sheet.addRow(["Concurrency", report.data.concurrency]);
  sheet.addRow(["Duration (seconds)", report.data.durationSeconds]);
  sheet.addRow(["Generated At", report.data.generatedAt]);
  sheet.addRow([]);
  const header = sheet.addRow(["Scenario", "Requests", "Errors", "Error Rate", "p95 (ms)"]);
  styleHeader(header);

  for (const [name, scenario] of Object.entries(report.data.scenarios || {})) {
    const row = sheet.addRow([
      name,
      scenario.requests,
      scenario.errors,
      scenario.requests ? scenario.errors / scenario.requests : 0,
      Math.round(scenario.p95 || 0),
    ]);
    row.getCell(4).numFmt = "0.00%";
    if (scenario.errors) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: red } };
  }

  sheet.addRow([]);
  const total = sheet.addRow(["TOTAL", report.data.requests, report.data.errors, report.data.errorRate, Math.round(report.data.latencyMs.p95)]);
  total.font = { bold: true };
  total.getCell(4).numFmt = "0.00%";
  if (report.data.errors) total.fill = { type: "pattern", pattern: "solid", fgColor: { argb: red } };
  else total.fill = { type: "pattern", pattern: "solid", fgColor: { argb: green } };

  sheet.addRow(["Throughput (requests/sec)", report.data.throughput]);
  sheet.addRow(["Latency p50 (ms)", Math.round(report.data.latencyMs.p50)]);
  sheet.addRow(["Latency p95 (ms)", Math.round(report.data.latencyMs.p95)]);
  sheet.addRow(["Latency p99 (ms)", Math.round(report.data.latencyMs.p99)]);
  sheet.columns = [{ width: 28 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 }];
  return sheet;
}

const summary = workbook.addWorksheet("Summary");
summary.addRow(["Curiosity Load Test Summary"]);
const summaryHeader = summary.addRow(["Target", "Concurrency", "Duration (s)", "Requests", "Errors", "Error Rate", "Throughput", "p50 (ms)", "p95 (ms)", "p99 (ms)"]);
styleHeader(summaryHeader);
for (const report of reports) {
  const data = report.data;
  const row = summary.addRow([
    data.target,
    data.concurrency,
    data.durationSeconds,
    data.requests,
    data.errors,
    data.errorRate,
    data.throughput,
    Math.round(data.latencyMs.p50),
    Math.round(data.latencyMs.p95),
    Math.round(data.latencyMs.p99),
  ]);
  row.getCell(6).numFmt = "0.00%";
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: data.errors ? red : green } };
}
summary.columns = [
  { width: 38 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 10 },
  { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 },
];

reports.forEach(addReportSheet);
await workbook.xlsx.writeFile(outputFile);
console.log(`Created ${outputFile}`);