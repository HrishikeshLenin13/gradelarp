// Synthetic test-only pages matching the documented HAC DOM conventions.
// These are never imported by production application modules.
export const LOGIN_HTML = `<html><body><form method="post" action="/HomeAccess/Account/LogOn?ReturnUrl=%2FHomeAccess"><input type="hidden" name="__RequestVerificationToken" value="test-csrf"><input type="hidden" name="Database" value="10"><input type="hidden" name="Type" value="Normal"><input type="hidden" name="VerificationOption" value="UsernamePassword"><input name="LogOnDetails.UserName"><input type="password" name="LogOnDetails.Password"></form></body></html>`;
export function gradebook({
  score = "85",
  missing = false,
  teacher = "Test Teacher",
  empty = false,
}: {
  score?: string;
  missing?: boolean;
  teacher?: string;
  empty?: boolean;
} = {}) {
  if (empty)
    return '<div class="sg-banner-menu-container"><span>Test Student</span></div><p>No assignments are available</p>';
  return `<html><body><div class="sg-banner-menu-container"><span>Test Student</span></div><select id="ReportCardRun"><option selected>Quarter 1</option></select><div class="AssignmentClass"><div class="sg-header"><a class="sg-header-heading" href="?course=100">Course: Algebra II</a><span class="sg-header-heading">Class Average: 88.00</span></div><span class="sg-header-teacher">${teacher}</span>${missing ? "" : `<table id="plnMain_CourseAssignments"><tr><th>Date Due</th><th>Assignment</th><th>Category</th><th>Score</th><th>Total Points</th></tr><tr><td>10/12/2026</td><td><a href="javascript:void(0)" onclick="showAssignment('a1')">Functions test</a></td><td>Major</td><td>${score}</td><td>100</td></tr><tr><td>10/15/2026</td><td><a href="javascript:void(0)" onclick="showAssignment('a2')">Practice</a></td><td>Daily</td><td>EX</td><td>10</td></tr><tr><td></td><td>Upcoming work</td><td>Daily</td><td></td><td>10</td></tr></table>`}<table id="plnMain_CourseCategories"><tr><th>Category</th><th>Weight</th></tr><tr><td>Major</td><td>60%</td></tr><tr><td>Daily</td><td>40%</td></tr></table></div></body></html>`;
}
