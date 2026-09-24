export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Auto-absent attendance finalization is temporarily disabled to avoid
  // performance issues during app startup and runtime.
  // const { startAttendanceScheduler } = await import("./server/attendanceScheduler.js");
  // startAttendanceScheduler();
}
