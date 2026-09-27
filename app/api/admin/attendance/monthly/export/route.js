import ExcelJS from 'exceljs';
import { prisma } from '@/server/prisma';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getTeacherAssignedClassIds } from '@/lib/teacherClassAccess';

function getMonthDates(year, month) {
  const dates = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    dates.push(new Date(year, month - 1, day));
  }
  return dates;
}

export async function GET(req) {
  const auth = await requireAdminPermission(req, 'attendance.view');
  if (!auth.ok) {
    return new Response(auth.message, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const centerId = searchParams.get('centerId') || '';
    const classId = searchParams.get('classId') || '';
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1);
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const requestedClassIds = classId.split(',').map((value) => value.trim()).filter(Boolean);

    if (!centerId || !requestedClassIds.length) {
      return new Response('Center and class are required.', { status: 400 });
    }

    const assignedClassIds = auth.actor.isTeacher ? await getTeacherAssignedClassIds(prisma, auth.actor.userId) : null;
    if (assignedClassIds && requestedClassIds.some((id) => !assignedClassIds.includes(id))) {
      return new Response('Class is not available for this user.', { status: 403 });
    }

    const classes = await prisma.class.findMany({
      where: {
        id: { in: requestedClassIds },
        status: true,
        OR: [{ centerId }, { centerId: null }],
      },
      select: { id: true, className: true },
    });

    if (classes.length !== requestedClassIds.length) {
      return new Response('Class is not available for this center.', { status: 403 });
    }

    const classNameById = new Map(classes.map(({ id, className }) => [id, className]));

    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: true,
        student: {
          centerId,
          studyingClass: { in: requestedClassIds },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        student: { select: { studyingClass: true } },
      },
    });

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        centerId,
        classId: { in: requestedClassIds },
        attendanceDate: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59, 999),
        },
      },
      select: {
        studentId: true,
        attendanceDate: true,
        status: true,
      },
    });

    const attendanceMap = attendanceRecords.reduce((acc, item) => {
      const key = new Date(item.attendanceDate).toISOString().slice(0, 10);
      if (!acc[item.studentId]) acc[item.studentId] = {};
      acc[item.studentId][key] = item.status;
      return acc;
    }, {});

    const monthDates = getMonthDates(year, month);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Monthly Attendance');
    const headers = ['Class', 'Student Name'];
    monthDates.forEach((date) => headers.push(date.getDate().toString()));
    headers.push('Present', 'Absent', 'Holiday / Off');

    const columnCount = headers.length;
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
    worksheet.addRow(['Student Monthly Attendance']);
    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.addRow([`${monthLabel} | Classes: ${classes.map((classItem) => classItem.className).join(', ')}`]);
    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.addRow(['Status key: P = Present   A = Absent   H = Holiday   W = Weekly Off   — = No record']);
    worksheet.mergeCells(3, 1, 3, columnCount);
    worksheet.addRow(headers);

    const fillRow = (rowNumber, color) => {
      for (let column = 1; column <= columnCount; column += 1) {
        worksheet.getCell(rowNumber, column).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color },
        };
      }
    };

    const titleRow = worksheet.getRow(1);
    titleRow.height = 30;
    titleRow.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(1, 'FF123B5D');

    const detailsRow = worksheet.getRow(2);
    detailsRow.height = 24;
    detailsRow.font = { name: 'Aptos', size: 10, color: { argb: 'FF29445B' } };
    detailsRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(2, 'FFEAF1F6');

    const legendRow = worksheet.getRow(3);
    legendRow.height = 22;
    legendRow.font = { name: 'Aptos', size: 9, italic: true, color: { argb: 'FF526779' } };
    legendRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(3, 'FFF5F8FA');

    const headerRow = worksheet.getRow(4);
    headerRow.height = 24;
    headerRow.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF17324A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    fillRow(4, 'FFDCE8F1');
    headerRow.eachCell((cell) => {
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF7890A3' } } };
    });

    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 30;
    monthDates.forEach((_, index) => {
      worksheet.getColumn(index + 3).width = 5.5;
    });
    worksheet.getColumn(monthDates.length + 3).width = 11;
    worksheet.getColumn(monthDates.length + 4).width = 11;
    worksheet.getColumn(monthDates.length + 5).width = 14;

    const statusStyles = {
      PRESENT: { code: 'P', fill: 'FFE2F0E8', font: 'FF21623B' },
      ABSENT: { code: 'A', fill: 'FFFCE4E4', font: 'FF9F2929' },
      HOLIDAY: { code: 'H', fill: 'FFFFF1D6', font: 'FF8A5A00' },
      WEEKLY_OFF: { code: 'W', fill: 'FFE8EDF2', font: 'FF526779' },
    };

    users.forEach((user) => {
      let presentCount = 0;
      let absentCount = 0;
      let holidayCount = 0;
      const rowValues = [classNameById.get(user.student?.studyingClass) || '—', user.name];
      const statuses = [];

      monthDates.forEach((date) => {
        const key = date.toISOString().slice(0, 10);
        const status = attendanceMap[user.id]?.[key] || '—';
        statuses.push(status);
        rowValues.push(statusStyles[status]?.code || '—');

        if (status === 'PRESENT') presentCount += 1;
        else if (status === 'ABSENT') absentCount += 1;
        else if (status === 'HOLIDAY' || status === 'WEEKLY_OFF') holidayCount += 1;
      });

      rowValues.push(presentCount, absentCount, holidayCount);
      const row = worksheet.addRow(rowValues);
      row.height = 20;
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF253746' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: columnNumber <= 2 ? 'left' : 'center',
        };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDCE4EA' } } };
        if (row.number % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F9FB' } };
        }
      });

      statuses.forEach((status, index) => {
        const style = statusStyles[status];
        if (!style) return;
        const cell = row.getCell(index + 3);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } };
        cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: style.font } };
      });

      [presentCount, absentCount, holidayCount].forEach((_, index) => {
        const cell = row.getCell(monthDates.length + 3 + index);
        cell.font = {
          name: 'Aptos',
          size: 10,
          bold: true,
          color: { argb: ['FF21623B', 'FF9F2929', 'FF8A5A00'][index] },
        };
      });
    });

    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: worksheet.rowCount, column: columnCount },
    };
    worksheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 2 }];
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    };
    worksheet.pageMargins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="monthly-attendance-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error('Monthly attendance export error:', error);
    return new Response('Unable to export monthly attendance report.', { status: 500 });
  }
}
