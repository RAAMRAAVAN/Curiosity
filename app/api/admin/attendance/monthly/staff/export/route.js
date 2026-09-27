import ExcelJS from 'exceljs';
import { requireAdminPermission } from '@/lib/adminRbac';
import { getStaffMonthlyAttendance } from '@/lib/staffMonthlyAttendance';

function fillRow(worksheet, rowNumber, columnCount, color) {
  for (let column = 1; column <= columnCount; column += 1) {
    worksheet.getCell(rowNumber, column).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }
}

function formatTime(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function getLocationCell(details, direction) {
  const latitude = details?.[`${direction}Latitude`];
  const longitude = details?.[`${direction}Longitude`];
  if (latitude == null || longitude == null) return { text: 'Not recorded' };

  const accuracy = details?.[`${direction}AccuracyMeters`];
  const accuracyLabel = accuracy == null ? '' : ` (±${Math.round(accuracy)} m)`;
  const coordinates = `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}${accuracyLabel}`;
  return {
    text: coordinates,
    hyperlink: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    tooltip: 'Open this location in Google Maps',
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const audience = searchParams.get('audience') || '';
  const permission = audience === 'teacher'
    ? 'attendance.teachers.monthly.view'
    : audience === 'management'
      ? 'attendance.management.monthly.view'
      : null;
  if (!permission) return new Response('Choose teachers or management.', { status: 400 });

  const auth = await requireAdminPermission(req, permission);
  if (!auth.ok) return new Response(auth.message, { status: auth.status });

  try {
    const report = await getStaffMonthlyAttendance(auth.actor, {
      audience,
      centerId: searchParams.get('centerId') || '',
      month: Number(searchParams.get('month') || new Date().getMonth() + 1),
      year: Number(searchParams.get('year') || new Date().getFullYear()),
    });
    if (report.status !== 200) return new Response(report.message, { status: report.status });

    const data = report.data;
    const audienceLabel = data.audience === 'teacher' ? 'Teachers' : 'Management';
    const headers = ['Name', ...data.monthDates.map(({ day }) => String(day)), 'Present', 'No record'];
    const columnCount = headers.length;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Curiosity';
    const worksheet = workbook.addWorksheet(`${audienceLabel} Attendance`);
    worksheet.addRow([`${audienceLabel} Monthly Attendance`]);
    worksheet.mergeCells(1, 1, 1, columnCount);
    worksheet.addRow([`${data.monthLabel} | ${data.centerName}`]);
    worksheet.mergeCells(2, 1, 2, columnCount);
    worksheet.addRow(['Daily cells show In/Out times. See Daily Locations for coordinates, GPS accuracy, and map links.']);
    worksheet.mergeCells(3, 1, 3, columnCount);
    worksheet.addRow(headers);

    const titleRow = worksheet.getRow(1);
    titleRow.height = 30;
    titleRow.font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(worksheet, 1, columnCount, 'FF123B5D');

    const detailsRow = worksheet.getRow(2);
    detailsRow.height = 24;
    detailsRow.font = { name: 'Aptos', size: 10, color: { argb: 'FF29445B' } };
    detailsRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(worksheet, 2, columnCount, 'FFEAF1F6');

    const legendRow = worksheet.getRow(3);
    legendRow.height = 22;
    legendRow.font = { name: 'Aptos', size: 9, italic: true, color: { argb: 'FF526779' } };
    legendRow.alignment = { vertical: 'middle', horizontal: 'left' };
    fillRow(worksheet, 3, columnCount, 'FFF5F8FA');

    const headerRow = worksheet.getRow(4);
    headerRow.height = 24;
    headerRow.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF17324A' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    fillRow(worksheet, 4, columnCount, 'FFDCE8F1');
    headerRow.eachCell((cell) => {
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF7890A3' } } };
    });

    worksheet.getColumn(1).width = 30;
    data.monthDates.forEach((_, index) => {
      worksheet.getColumn(index + 2).width = 14;
    });
    worksheet.getColumn(data.monthDates.length + 2).width = 11;
    worksheet.getColumn(data.monthDates.length + 3).width = 13;

    const locationRows = [];
    data.rows.forEach((person) => {
      const values = [
        person.name,
        ...data.monthDates.map(({ dateKey }) => {
          const details = person.dailyDetails[dateKey];
          if (!details) return '—';
          return `In ${formatTime(details.checkInAt)}\nOut ${formatTime(details.checkOutAt)}`;
        }),
        person.presentCount,
        person.noRecordCount,
      ];
      const row = worksheet.addRow(values);
      row.height = 34;
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF253746' } };
        cell.alignment = { vertical: 'middle', horizontal: columnNumber === 1 ? 'left' : 'center', wrapText: true };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDCE4EA' } } };
        if (row.number % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F9FB' } };
        }
      });

      data.monthDates.forEach(({ dateKey }, index) => {
        const details = person.dailyDetails[dateKey];
        if (!details) return;
        const cell = row.getCell(index + 2);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0E8' } };
        cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF21623B' } };

        locationRows.push({
          name: person.name,
          date: data.monthDates[index].dateKey,
          details,
        });
      });

      row.getCell(data.monthDates.length + 2).font = {
        name: 'Aptos', size: 10, bold: true, color: { argb: 'FF21623B' },
      };
      row.getCell(data.monthDates.length + 3).font = {
        name: 'Aptos', size: 10, bold: true, color: { argb: 'FF526779' },
      };
    });

    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: worksheet.rowCount, column: columnCount },
    };
    worksheet.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];
    worksheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    };
    worksheet.pageMargins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

    const locationSheet = workbook.addWorksheet('Daily Locations');
    locationSheet.addRow(['Staff Name', 'Date', 'In Time', 'In Location', 'Out Time', 'Out Location']);
    const locationHeader = locationSheet.getRow(1);
    locationHeader.height = 26;
    locationHeader.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF17324A' } };
    locationHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    fillRow(locationSheet, 1, 6, 'FFDCE8F1');
    locationSheet.columns = [
      { width: 30 },
      { width: 16 },
      { width: 16 },
      { width: 34 },
      { width: 16 },
      { width: 34 },
    ];

    locationRows.forEach(({ name, date, details }, index) => {
      const row = locationSheet.addRow([
        name,
        date,
        formatTime(details.checkInAt),
        getLocationCell(details, 'checkIn'),
        formatTime(details.checkOutAt),
        getLocationCell(details, 'checkOut'),
      ]);
      row.height = 22;
      row.eachCell((cell, columnNumber) => {
        cell.font = {
          name: 'Aptos',
          size: 10,
          color: columnNumber === 4 || columnNumber === 6 ? { argb: 'FF1769AA' } : { argb: 'FF253746' },
        };
        cell.alignment = { vertical: 'middle', horizontal: columnNumber < 3 ? 'left' : 'center' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFDCE4EA' } } };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F9FB' } };
        }
      });
    });
    locationSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: locationSheet.rowCount, column: 6 },
    };
    locationSheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
    locationSheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
    };
    locationSheet.pageMargins = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${data.audience}-monthly-attendance-${data.year}-${String(data.month).padStart(2, '0')}.xlsx"`,
      },
      status: 200,
    });
  } catch (error) {
    console.error('Staff monthly attendance export error:', error);
    return new Response('Unable to export monthly attendance report.', { status: 500 });
  }
}