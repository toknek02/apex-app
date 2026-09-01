MONTHLY ATTENDANCE SUMMARY TOOL
==============================

WHAT IT DOES
------------
Reads one raw xPortal3000 "Daily Attendance Report (Lite)" Excel export and
writes "ATTENDANCE REPORT_<export name>.xlsx" next to it, with three sheets:

  SUMMARY_MANAGEMENT   one row per employee (Chairman / Directors / Assoc / Mgr)
  SUMMARY_ALLSTAFF     one row per employee (everyone else)
  DAILY                every counted day with its computed hours (the audit trail
                       behind the summary numbers)

Each summary row:
  No | Employee Name | Designation | Month/Year | Days Worked | Total Hours |
  9.00-9.15 | 9.16-9.30 | 9.31-10.00 | 10.01-10.30 | 10.31> |
  Days >= 8 Hours | Days < 8 Hours


HOW THE NUMBERS ARE WORKED OUT
------------------------------
Counted day   A working day (Attendance Summary is NOT "Non-Working Day") on
              which the person actually clocked in. Absent / no-punch days are
              ignored completely.

Total Hours   For each counted day: clock-OUT minus clock-IN, minus a 1-hour
              lunch on any day that spans at least 6 hours. Summed for the
              month. Shown as hours:minutes (can exceed 24, e.g. 176:20).
              See "Lunch" below to change the deduction.

Late bands    The clock-IN time, but only when it is later than 09:00. On-time
              days (09:00 or earlier) are not counted in any band.
                9.00 - 9.15   9.16 - 9.30   9.31 - 10.00
                10.01 - 10.30   10.31 and later

8-hour split  A counted day whose clock-OUT minus clock-IN is 8:00 or more is a
              "Days >= 8 Hours" day; otherwise it is a "Days < 8 Hours" day.
              (Days Worked = >=8h + <8h + any day with a clock-in but no usable
              clock-out; that last group is reported in the black window.)


LUNCH  (optional)
-----------------
Total Hours and the 8-hour split remove a 1-hour unpaid lunch from every day
whose gross span is at least 6 hours. To change that, open
attendance_report.py in Notepad and edit near the top:

    LUNCH_MIN = 60          minutes of lunch removed (set to 0 for none)
    LUNCH_TRIGGER_MIN       only days at least this long lose the lunch

then run the report again.


ONE-TIME SETUP (on the HR PC)
-----------------------------
1. Install Python 3.9+ from https://www.python.org/downloads/
   -> tick "Add python.exe to PATH".
2. Open Command Prompt and run:  pip install openpyxl xlrd
   (openpyxl reads .xlsx exports; xlrd reads old .xls exports)
3. Copy this whole folder anywhere (e.g. the Desktop).

FILE FORMATS
  The export can be .xlsx (Excel 2007+) or .xls (Excel 97-2003). If a file
  errors with "not a zip file" it is an .xls that was renamed to .xlsx - it
  still works once xlrd is installed. It must be the single-sheet "Daily
  Attendance Report (Lite)" layout, not a processed multi-sheet workbook.


EVERY MONTH  (the window)
-------------------------
1. In xPortal, export "Daily Attendance Report (Lite)" for the month, all staff,
   as .xlsx.
2. Double-click "Attendance Report.bat" to open the window.
3. Choose... the export file. Adjust "Lunch deducted (min)" if needed (default 60).
4. Click "Generate report". The notes appear in the box - read them.
5. Click "Open report" to view it, or "Open staff list" to edit employees.csv.
   The report is saved next to the export as "ATTENDANCE REPORT_<export name>.xlsx".

WITHOUT THE WINDOW  (command line)
---------------------------------
Drag the export onto "Run report.bat", or:
   python attendance_report.py "C:\path\to\export.xlsx"
The report is written next to the export.


MESSAGES TO ACT ON
------------------
"In the export but NOT in employees.csv"
    New staff - add a row to employees.csv (see below) and run again.
"Active in employees.csv but NO rows in this export"
    They have left, or were missed. If they left, set their "active" column to N.
"No designation set in employees.csv"
    Fill in the "designation" column for those people.
"Days with a clock-in but no usable clock-out"
    Someone badged in but not out (or badged out before in). Those days are in
    Days Worked but left out of Total Hours and the 8-hour split. Check the
    DAILY sheet - rows with a blank "Worked (h:mm)".


employees.csv  -  THE STAFF LIST YOU MAINTAIN
---------------------------------------------
One row per employee:

  staff_name    Name EXACTLY as it appears in the xPortal export (match key).
  display_name  Name to show in the report.
  designation   Job title shown in the summary.
  category      MGMT  = MANAGEMENT sheet ;  STAFF = ALLSTAFF sheet
  active        Y = always include ;  N = left (drops off once they have no
                more punches in the export).
  sort          Row order within each category.

Edit in Excel or Notepad, keep the header row, save as CSV (UTF-8).

WHEN STAFF CHANGE
  New joiner  : add a row. "staff_name" must be EXACTLY how the name appears in
                the xPortal export (run a report once - anyone unmatched is
                listed in the black window / results box with their staff no).
  Leaver      : set "active" to N. They still appear in months they have data.
  Promotion / new title : change "designation" (and "category" if they move
                between MANAGEMENT and the rest).

The starting employees.csv was built from the monthly exports (Feb-Jul 2026)
plus "Staff Total Headcount - Aug26.xlsx". Keep it current by hand from here on.
