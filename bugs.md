I am building an internal FBA website. Please implement the following updates carefully without breaking the existing structure, design, routing, permissions, authentication, database records, LMS, Resource Portal, or current content.

Before changing code, please do this in phases:

1. Review the current codebase and identify affected files.
2. Create a short implementation plan.
3. Prioritize database schema, permissions, auth/session logic, reusable components, and admin dashboards first.
4. Do not rewrite unrelated parts of the app.
5. Keep the existing UI style, color scheme, font, spacing, cards, layout, and routing.
6. Do not remove existing pages or content unless explicitly requested.
7. Make the implementation scalable because this system will eventually support more departments and employee-facing workflows.
8. Keep admin access separate from employee access.
9. Department Heads should only manage/view their own department’s SOPs, employees, requests, reports, and task data unless they are also given global admin/executive access.
10. Historical records should not be deleted when old options are removed. Removed options should only be hidden from new submissions.

For the current build, only enable these departments as selectable active departments:

* Instagram
* X
* Reddit

However, keep the system scalable so more departments can be added later, such as AM, Finance & Administration, Recruitment, Video Editors, TT/YT, and others.

PROJECT-WIDE AUDIT LOG REQUIREMENT

Please add or improve audit logging for important admin/manager actions.

Audit logs should track:

* Who created a record
* Who edited a record
* Who approved a request
* Who rejected a request
* Who completed a request
* Who archived something
* Who deleted something
* Who changed permissions
* Who sent or resent an invite
* Who changed SOP deadlines
* Who exempted an employee from a deadline
* Who created/edited/deleted a Team Note
* Who created/edited/published/unpublished/archived a documentation page
* Who exported reports or employee data
* Date and time of the action
* Feature/module affected
* Record affected
* Old value and new value, if possible

Every admin action should be tied to the actual logged-in user. Do not allow shared admin accounts.

PHASE 1: LOGIN, INVITE, PERMISSION, AND ACCESS FLOW

Please simplify and update the Login, Invite, Permission, and Access Flow.

1. Main Login Rule

The website should use one login system for everyone.

Employees, Department Heads, Managers, Admins, and Executives should all log in through the same login page using their own email and password.

Do not create or allow shared admin logins.

Each admin, department head, manager, or employee must use their own individual account.

Reason:
We need accurate audit logs. If admins share one login, we cannot properly track who created, edited, approved, rejected, archived, exported, or deleted something.

2. Simplified New Employee / New User Flow

The simplified flow should be:

Step 1:
Admin or authorized Department Head creates the employee record.

Step 2:
Admin or authorized Department Head can already assign the employee’s permissions and access details, such as:

* Role / job title
* Department
* Access level
* Department-specific permissions
* Admin permissions, if applicable
* Super admin permissions, if applicable

Step 3:
The system sends an invite link to the employee.

Step 4:
The employee opens the invite link, creates their login password, and completes their profile setup.

Step 5:
Once the user login account is created, the system should automatically connect the login account to the existing employee record and apply the permissions that were already assigned.

Important:
Permissions can be assigned before the employee finishes setting up their login profile.

However, those permissions should only become usable once the employee has an active login account.

3. Employee Setup / Access Statuses

The system should clearly show where the employee is in the setup and access process.

Suggested statuses:

* Employee Record Created
* Permissions Assigned
* Invite Sent
* Invite Accepted
* Profile Complete
* Login Active

This will help admins and department heads quickly understand whether the employee is fully onboarded or still pending setup.

4. Employee Record vs User Login Record

Please keep the logic clear:

Employee Record:
This is the HR/company record. It includes the employee’s name, department, job title, schedule, employment status, access settings, and other profile details.

User Login Record:
This is the authentication account. It controls login, session, permissions, and access inside the website.

These two records should be connected by email or user ID.

When an employee record is created before the user login exists, the assigned permissions should be stored on the Employee record first.

Once the employee accepts the invite and creates their login account, the system should connect the User Login Record to the existing Employee Record and sync the assigned permissions.

5. Sync Employee Role and Department to User Permissions

There should be a reliable way to sync employee details into the user permission system.

When an employee’s role, department, or access level is updated, the user’s permission access should also update.

This should include:

* Role / job title
* Department
* Super admin access
* Department-level access
* Permission changes after transfers, promotions, demotions, or role changes

This is important because department-based dashboards and role-based permissions depend on accurate user access.

6. Session and Inactivity Rule

Update the session behavior so that the user session is refreshed or revalidated after 30 minutes of inactivity.

If a user has been inactive for 30 minutes, the system should check or refresh their session before allowing them to continue.

Preferred behavior:

* After 30 minutes of inactivity, refresh or revalidate the session token.
* If the session is still valid, allow the user to continue.
* If the session is expired or invalid, redirect the user to login.
* Avoid losing unsaved work if possible by warning the user before redirecting.

7. Access Structure

Regular Employees:

* Can access their own dashboard
* Can access assigned SOPs/courses
* Can submit their own requests
* Can view their own schedule
* Can log and view their own tasks
* Can view their own profile

Department Heads / Department Managers:

* Can access employees and records in their own department
* Can view department-level SOPs, requests, reports, and task activity
* Should not automatically see other departments unless granted higher access

Admins / Executives:

* Can access all departments
* Can manage employees, permissions, requests, SOPs, reports, dashboards, and audit logs
* Can view and manage records across all departments

PHASE 2: COMPANY HIERARCHY AND PERMISSION CONTEXT

Please use this as the rough role hierarchy for permissions, approvals, and dashboard visibility.

Top-Level / Executive Roles

Role:

* Executive

Access level:

* Can view all departments
* Can view all employee records
* Can view all contractor change requests
* Can approve, reject, or complete requests
* Can access all admin dashboards
* Can view all SOPs and course progress
* Can manage department-level access if needed
* Can view audit logs
* Can export reports and employee-related data

Department Leadership

Roles:

* Department Head
* Department Manager
* Account Manager

Access level:

* Can view their own department’s employees
* Can submit contractor change requests for their department
* Can view requests connected to their department
* Can manage SOPs/courses for their department
* Can view SOP acknowledgment and deadline progress for employees in their department
* Can view taskboard activity for employees in their department
* Can approve or update requests only if permission is granted
* Should not automatically see other departments

Operational / Employee Roles

Roles:

* Page Runner
* Page Runner Assistant
* Operations Specialist
* Engager
* Flagtester
* Editor

Access level:

* Can view their own dashboard
* Can view assigned SOPs/courses
* Can acknowledge SOPs/courses
* Can view deadlines assigned to them
* Can log their own tasks in the taskboard
* Can mark their own tasks as finished
* Can submit employee-facing requests, such as COE requests
* Can view the status of their own requests
* Should not see other employees’ records or admin dashboards

Permission logic:

* High-level roles should have global access.
* Department leadership should have department-limited admin access.
* Regular employees should only have self-access.
* Department Heads should only see their own department unless granted higher access.
* Executives/Admins should see everything.

PHASE 3: SOP / COURSE DEADLINE SYSTEM

Right now, the LMS Typeform has a field called “Estimated completion time (minutes).”

Change this field to “Deadline.”

The Deadline field should allow admins or department heads to set a deadline for when employees must finish reading and acknowledging a SOP or course.

Deadline options should include:

* No Deadline
* Fixed date/time deadline
* Relative deadline, such as 3 days after assignment or 7 days after publish date

Employees should be able to see the deadline clearly on each SOP/course page, especially if they still need to acknowledge it.

For newly added SOPs, employees should be given a deadline to read and acknowledge them if a deadline is configured.

There should also be a way for admins to bypass or exempt certain employees from the deadline. This is important for new hires because they may need more time due to their learning curve.

The bypass/exemption should be employee-specific and not global.

Example:
One employee can be exempted from a SOP deadline while others are still required to complete it by the deadline.

Admins should be able to see:

* Who has acknowledged the SOP/course
* Who has not acknowledged it yet
* Who is overdue
* Who has been exempted
* Which SOP/course has no deadline
* A search bar to search an employee and show their profile and SOP/course completion

Do not remove the current acknowledgment system. Only improve it by adding deadlines, relative deadlines, and exemption logic.

PHASE 4: TASKBOARD / TIME TRACKING SYSTEM

Add a taskboard where employees can log their daily tasks.

Each task should be attached to the logged-in employee.

Task statuses:

* Pending
* In Progress
* Finished

Pending tasks:

* Pending tasks should not start the timer yet.
* Pending tasks can be created as planned tasks.
* Timer starts only when the employee marks the task as In Progress.
* Pending tasks should not be exported in the end-of-shift .txt report.

In Progress tasks:

* The system should record the start time when the task is started or moved to In Progress.

Finished tasks:

* Employees must manually mark the task as Finished once completed.
* Once marked as Finished, the website should automatically calculate time spent:
  Start time → Finish time = Total time spent

Task fields should include:

* Task name
* Task category/type
* Optional notes
* Start time
* Finish time
* Total time spent
* Status: Pending / In Progress / Finished

Employees should be able to see their own tasks for the day.

Admins should have a dashboard that shows all employee tasks by end of day.

Add an export option to a .txt file so employees can send their task list as an end-of-shift report.

Export rules:

* Only export Finished tasks
* Do not export Pending tasks
* Include task name, category, notes, start time, finish time, and total time spent
* Include employee name and date

The admin task dashboard should help management review efficiency across:

* Employee
* Task type
* Date
* Total time spent
* Number of tasks completed
* Tasks still unfinished
* Pending tasks
* In Progress tasks

The goal is to help management understand how much time is being spent on certain responsibilities and compare task efficiency per employee and per day.

PHASE 5: EMPLOYEE-FACING REQUEST SYSTEM

Add a simple employee-facing request system.

For now, only Certificate of Employment / COE should be active.

Active request type:

* Certificate of Employment / COE

COE request form fields:

* Request type: COE
* Reason / purpose
* Date needed
* Optional notes

Admins should be able to see all requests in an admin dashboard with statuses:

* Pending
* Processing
* Completed
* Rejected

Admins should be able to update the request status.

Employees should be able to see the status of their own requests.

Future request types should be supported later but not active unless enabled:

* Payslip
* Leave requests
* OT requests
* Schedule requests
* HR requests
* Payroll concerns
* Equipment/tool access requests

Do not hard-code this in a way that only COE can exist. Build it so more request types can be added later.

PHASE 6: CONTRACTOR CHANGE REQUEST FORM

Add an internal website version of the FBA Contractor Change Request form.

This form currently exists as a Google Form, but I want it transferred into the website so managers/admins can submit contractor change requests directly inside the platform.

Form title:
FBA Contractor Change Request

Access:
Only authorized roles should access this form:

* Admin
* Department Head
* Department Manager
* Account Manager
* Executive
* TA/Payroll Manager

Do not make this visible to regular employees unless they have permission.

Main fields:

1. Requester Email

* Auto-fill based on logged-in user if possible
* Required

2. Department
   Required dropdown/radio options for current build:

* Instagram
* X
* Reddit
* Other

If “Other” is selected, show a required text input.

Keep the system scalable so more departments can be added later.

3. Request Type
   Required options:

* Termination
* Department Transfer
* Compensation Adjustment
* Hire

The form should use conditional sections depending on the selected Request Type.

Section 1: Termination

Show these fields only if Request Type is “Termination”:

* Contractor’s Name — required
* Title / Role — required
* Last Working Day — required date field
* Reason for Termination — required
* Equipment Return Needed — required options: Yes, No, Other
* Additional Notes — optional

If “Other” is selected for Equipment Return Needed, show a required text input.

Section 2: Department Transfer

Show these fields only if Request Type is “Department Transfer”:

* Contractor’s Name — required
* Current Department — required
* Will they be changing roles? — required Yes/No
* Previous Role — required
* New Department — required
* New Role — required
* New Compensation — required
* Effective Date — required date field
* Additional Notes — optional

Section 3: Compensation Adjustment / Wage Change

Show these fields only if Request Type is “Compensation Adjustment”:

* Contractor’s Name — required
* Current Title / Role — required
* Will they be switching roles? — required Yes/No

Add a required field called “New Compensation Type.”

Options:

* Hourly
* Salary / Flat Rate

If “Hourly” is selected, show a required input field:

* New Hourly Rate

If “Salary / Flat Rate” is selected, show a required input field:

* New Salary / Flat Rate Amount

Also include:

* Effective Date of Change — required date field
* Reason / Notes — required or optional depending on current form behavior

Under “Effective Date of Change,” include this note:

“Wage changes must take effect on the first day of a pay period, either the 1st or 16th of each month. If you select a date that falls mid-pay-period, the effective date will automatically be adjusted to the next upcoming period.”

If possible, add validation or auto-adjustment logic:

* If selected date is between the 2nd and 15th, adjust to the 16th.
* If selected date is between the 17th and end of the month, adjust to the 1st of the next month.
* If selected date is the 1st or 16th, keep the selected date.

The saved request should clearly store:

* Compensation Type
* Compensation Amount
* Effective Date Selected
* Adjusted Effective Date, if applicable

Section 4: Hire

Show these fields only if Request Type is “Hire”:

* Location — required options: International, U.S.
* Full Legal Name — required
* Preferred Name — optional
* Personal Email Address — required
* Personal Phone Number — required
* Job Title / Role — required
* Brief Description of Tasks / Responsibilities — required
* Start Date — required date field
* Compensation Structure — required options: Hourly, Salary / Flat Rate

If “Hourly” is selected, show a required input field:

* Hourly Rate

If “Salary / Flat Rate” is selected, show a required input field:

* Salary / Flat Rate Amount

The compensation amount should be required before the form can be submitted.

Submitted Hire request should clearly save:

* Compensation Type
* Compensation Amount

Examples:
Compensation Type: Hourly
Compensation Amount: $4.25/hr

Compensation Type: Salary / Flat Rate
Compensation Amount: $800/month

Admin Request Dashboard

Add an admin dashboard/table where submitted Contractor Change Requests can be reviewed.

Dashboard should show:

* Request Date
* Requester
* Department
* Request Type
* Contractor Name
* Status
* Effective Date / Start Date / Last Working Day, depending on request type
* Compensation Type and Compensation Amount, if applicable

Statuses:

* Pending
* Approved
* Rejected
* Completed

Admins should be able to open each request and view the full details.

Admins should be able to update the status.

Keep a timestamp/history when a status is changed if possible.

PHASE 7: MY SCHEDULE PAGE UPDATES

Please update the “My Schedule” tab/page.

Do not break the existing schedule database, employee dashboard, routing, or current UI style.

1. Remove Scheduled Legends

In the My Schedule tab, remove the scheduled legends section.

Reason:
Every employee can have a different schedule, so the legend is not useful anymore and may cause confusion.

Do not remove the actual schedule table or employee schedule display. Only remove the legend section.

2. Keep Coverage Notes

The Coverage Notes section should stay.

Do not delete or hide the coverage notes.

3. Update Shift Change Instructions

In the Shift Changes section, update the current instruction.

Current instruction says employees should email [vii@fatbearagency.com](mailto:vii@fatbearagency.com) for schedule adjustments or swaps.

Change this to:

“For schedule adjustments or shift swaps, please email your respective Department Head.”

4. Schedule Table Display Logic

When an employee’s schedule is entered in the database, the My Schedule table should only display the start time of the shift.

Example:
If the schedule saved in the database is:
12:00 AM - 8:00 AM

The table should only show:
12:00 AM

Another example:
If the schedule is:
10:00 PM - 6:00 AM

The table should only show:
10:00 PM

Do not show the full shift range in the My Schedule table anymore. Only show the shift start time.

5. Local Timezone Display

The schedule time displayed to the user should follow the timezone/system time of the computer or device they are using.

Example:
If the user’s computer is set to Philippine Time, the schedule should display in Philippine Time.

If the user’s computer is set to CST, the schedule should display in CST.

Implementation note:
Store schedule data in a consistent canonical timezone in the database, preferably UTC or a clearly defined source timezone, then display the converted time based on the user’s local browser/device timezone.

Do not store random local times per user, because that may break schedule consistency.

Use the browser’s local timezone when rendering schedule times instead of hardcoding one timezone for everyone.

PHASE 8: ATTENDANCE AND REQUEST TAB UPDATES

Please update the Attendance and Request tab/page.

This page currently shows:

* Overtime / Weekly OT
* Leave
* Offset Request

There is no longer a need for Offset Requests, so remove Offset Request from this page and related active request options.

Do not remove Overtime or Leave request forms and functionality.

1. Remove Offset Request

Remove Offset Request from:

* Attendance and Request tab
* Any request type dropdowns
* Any request cards/buttons
* Any employee-facing offset request form
* Any admin dashboard filters or status sections related specifically to offset requests, if they exist

Do not break existing request records.

If there are old offset records in the database, keep them as archived/historical records, but employees should no longer be able to submit new offset requests.

2. Keep Overtime and Leave Requests

The Attendance and Request tab should only focus on:

* Overtime / Weekly OT Request
* Leave Request

Leave Request form does not need Department Head / Manager typeform.

Employees should still be able to submit overtime and leave requests normally.

Admins should still be able to review, approve, reject, or complete overtime and leave requests.

3. Add / Update Core Hours Policy Display

Please add or update a policy/information section in the Attendance and Request page explaining core hours.

Core Hours:
9:00 AM to 5:00 PM CST, Monday to Friday

4. Add / Update 6th Day Policy Display

Please add or update a policy/information section explaining the 6th day/Saturday expectation.

6th Day / Saturday:
Saturday is treated as an async operations day. There is no required virtual attendance by default.

This day is used for:

* Content research
* Planning ahead
* Preparing operations for the coming week
* Acting as a built-in buffer for unfinished tasks

Saturday may serve as a rest day if the page runner’s operations are fully in order.

However, required attendance may apply if:

* Tasks were incomplete during the week
* Errors occurred during the week
* Additional cleanup or correction is needed
* The employee was specifically instructed by management to attend or complete work

5. Hardware / Task Completion Policy Note

Please add the following policy note somewhere relevant in the Attendance and Request page, preferably near overtime or work expectations:

“Page runners with lower-end hardware setups are not given leniency on task completion. All account operations are expected to be finished within the work period regardless of equipment. If additional time is needed to meet this standard, it is the page runner’s responsibility to account for it.”

6. Overtime Context

Please make sure the overtime request flow still makes sense with this policy.

The system should make it clear that overtime is for work that needs additional approved time, but employees are still expected to complete core responsibilities within the regular work period.

If overtime request cards or notes exist, update the wording so it does not imply that overtime is a substitute for poor planning, slow execution, or preventable delays.

PHASE 9: ADDITIONAL EMAIL FIELD LOGIC

For any email input field in Typeform-style forms where the expected email is an FBA company email, automatically assume the email domain is:

@fatbearagency.com

The user should only need to type the email username/prefix.

Example:
If the user types:
emailtypeform

The system should automatically save/display it as:
[emailtypeform@fatbearagency.com](mailto:emailtypeform@fatbearagency.com)

Implementation requirements:

* Do not require users to manually type “@fatbearagency.com”
* Auto-append “@fatbearagency.com” when saving the form
* If the user already types the full email, do not duplicate the domain
* Validate that the final saved email follows a valid email format
* Show helper text like: “Enter the username only. @fatbearagency.com will be added automatically.”
* Keep this behavior limited to forms where FBA company emails are expected
* Do not apply this to personal email fields, such as new hire personal email

PHASE 10: MY CREATORS AND CREATOR REPORTS SYSTEM

Please update the “My Creators” feature and add a Creator Reports system.

This is based on our current Discord reporting workflow, but reports should eventually be done inside the website instead of scattered across Discord threads.

1. Update Creator Status Options

In “My Creators,” when adding or editing a creator, update the Status field.

Remove these status options:

* Testing
* Replacing Account

These should not appear as selectable creator statuses anymore.

Keep only the relevant creator statuses:

* Active
* Paused
* Inactive
* Dropped

If status is Dropped, automatically move the creator to archive.

If there are existing creators already marked as Testing or Replacing Account, do not break the records. They can remain historical values if needed, but users should not be able to select those statuses moving forward.

2. Add Export Reports Feature

Add a way to export creator reports.

Admins and authorized managers should be able to export reports by:

* Creator
* Account
* Department
* Date range
* Report type
* Submitted by

Preferred export formats:

* CSV
* PDF, if possible

Only authorized roles can export reports or employee/creator data.

Export actions should be logged with:

* User
* Timestamp
* Filters used
* Export type
* Feature/module exported from

Export should include:

* Creator name
* FBA ID
* Account username
* Department
* Report label/type
* Submitted by
* Submitted date
* Current follower count
* Gain/loss
* Account highlights
* What’s working
* Action items
* Additional notes
* Links included in the report

3. Add Creator Reports System

Add a Creator Reports section inside the website.

The goal is for Page Runners to submit account-level reports through the website instead of only posting them manually in Discord.

Reports should be connected to a specific creator and, if applicable, a specific account.

Example structure:

* Creator: Fallon
* Account: @exampleusername
* Report: Weekly X Account Update

Each account should have its own reports.

Reports should also roll up under the creator so managers can view all reports connected to that creator.

Example:
Fallon

* Account Reports

  * @account1
  * @account2
  * @account3
* Consolidated Reports

  * Marketing Reports for Fallon
  * Creator-facing Reports for Fallon
  * Internal Reports for Fallon

4. Report Labels / Types

Each report must have a label/type at the top.

Report type options:

* Internal Report
* Creator Report

Internal Report:
Use this when the update is only for internal tracking. If there are no significant updates for the week, it should go under Internal Report.

Creator Report:
Use this when the update is something the creator needs to know. These reports should be visible to Account Managers so they can review and decide what should be sent to the creator.

5. Report Review Statuses

Add report workflow statuses:

* Draft
* Submitted
* Needs Revision
* Approved for Creator
* Sent to Creator
* Archived

Creator Reports should be reviewable by Account Managers before they are treated as creator-facing.

6. Report Visibility

Page Runners should be able to submit reports for creators/accounts assigned to them.

Account Managers should be able to view both:

* Internal Reports
* Creator Reports

Department Heads and Managers should be able to view reports for their department.

Admins and Executives should be able to view reports across all departments.

Regular employees should not be able to view creator reports unless they are assigned to that creator/account or have permission.

7. Weekly Reporting Rules

Add guidance/helper text in the reporting page:

Page Runners must give updates once a week from Monday to Wednesday for each creator they handle.

The only exception is when there is a very big update or highlight. If that happens, they should share it right away and should not wait for the next update week.

Page Runners must report:

* Any new accounts as soon as they are made
* Important account details
* Anything performing above average
* Account growth
* Any major highlights
* If there is nothing significant to report, they must still submit an update saying there are no significant updates for that week

Exception:
If an account is being tested first and we do not want the creator to know yet, the Page Runner does not need to make the update creator-facing. This is because the test may not work out and could disappoint the creator.

8. Report Form Fields

Required fields:

* Creator
* FBA ID
* Department
* Account username
* Report type: Internal Report or Creator Report
* Current follower count
* Follower gain/loss or growth notes
* Report summary
* Submitted by
* Submitted date

Optional fields:

* Account highlights
* Highlight links
* Highlight notes
* What’s working
* Action items
* Additional notes
* Attachments or screenshots, if possible

For Account Highlights, allow multiple highlight entries.

Each highlight entry should include:

* Performance number, example: 3.5M, 89K, 68.8K
* Link
* Highlight notes, optional

9. Example Report Template

Username:
Current Follower Count + Gain or Loss:

Account Highlights:

Highlight 1:
Performance:
Link:
Highlight Notes:

Highlight 2:
Performance:
Link:
Highlight Notes:

Highlight 3:
Performance:
Link:
Highlight Notes:

What’s Working:
Action Items:
Additional Notes:

10. Report Consolidation

There should be a creator-level view where all account reports are consolidated under that creator.

If Fallon has multiple accounts, each account gets its own reports, but managers can also open Fallon’s creator profile and see all reports connected to Fallon in one place.

Add filters/tabs:

* All Reports
* Internal Reports
* Creator Reports
* By Account
* By Department
* By Date Range

11. Discord Workflow Context

This feature should support the workflow previously used in Discord.

Old Discord structure:

* Main Channel: “FBA ID - Creator Name”
* Main channel is for inquiries and requests
* Threads inside the main channel are used for department reports, such as:

  * Reddit - FBA ID
  * X - FBA ID
  * IG - FBA ID

Reports and approved creator recommendations were posted inside the department threads.

Questions about recommendations should not be mixed into report threads.

The website version should make reports cleaner by keeping them attached to:

* Creator
* Account
* Department
* Report type

12. Creator Recommendations / Internal Notes

If possible, leave room for future support for creator recommendations.

Creator recommendations should be separate from normal weekly reports unless they are approved or specifically meant to be included.

Internal matters that do not need Account Managers should stay internal and should not be marked as Creator Report.

13. Admin / Manager Dashboard

Add a reports dashboard for Account Managers, Department Heads, and Admins.

Dashboard should show:

* Latest reports
* Reports due this week
* Missing weekly reports
* Reports by creator
* Reports by account
* Reports by Page Runner
* Reports by department
* Internal vs Creator Report count
* Export button

It should be easy to see which creators/accounts already have their weekly update for delivery and which ones are still missing.

Add a Relayed option to keep track of which creators already received the reports.

Do not hard-code this only for X. The report system should support multiple departments, including X, Instagram, Reddit, and future departments if needed.

PHASE 11: TEAM NOTES FOR CREATOR PROFILES

Please update the Team Notes section inside “My Creators.”

Team Notes should not be a single text field that only appears when editing the creator’s profile.

Instead, Team Notes should work like a note log or activity thread attached to each creator profile.

Users should be able to add individual notes to a creator profile without editing the creator’s main profile details.

Each note should be saved as a separate entry.

Each Team Note entry should include:

* Note content
* Added by
* Date and time added
* Edited date and time, if edited
* Visibility level, if needed

The “Added by” field should automatically use the logged-in user’s name or email from the current session.

If automatic user detection is not possible, allow the user to manually select or input their name, but preferred behavior is automatic attribution based on the account they are logged into.

Team Notes requirements:

* Notes should appear on the creator profile page.
* Notes should be ordered from newest to oldest by default.
* Users with permission should be able to add notes.
* Users should not have to open the full creator edit form just to add a note.
* Notes should not overwrite each other.
* Notes should be stored historically.
* Notes should show who added them.
* Notes should show when they were added.
* If editing notes is allowed, show who last edited the note and when.
* If deleting notes is allowed, restrict deletion to admins or the original note author depending on existing permissions.

Suggested UI:
On each creator profile, add a “Team Notes” card or tab.

Inside it:

* Text box: “Add a team note…”
* Button: “Add Note”
* List of previous notes below it
* Each note should show the author, timestamp, and content

Permissions:

* Page Runners should be able to add notes for creators assigned to them.
* Account Managers should be able to view and add notes for creators they handle.
* Department Heads and Managers should be able to view/add notes for creators in their department.
* Admins and Executives should be able to view/add/manage notes across all creators.

PHASE 12: DROPDOWN SORTING AND EMPLOYEE DATABASE IMPROVEMENTS

Please update database dropdown sorting and improve the Employee Database inside the Admin Dashboard.

1. Fix Dropdown Sorting

Across the website, review dropdown filters and dropdown fields that show years, dates, numbers, departments, statuses, or other ordered values.

Some dropdowns are not sorted correctly. For example, the year dropdown may show:
2026
2025
2027

This should be fixed.

For year dropdowns, sort years chronologically.

Preferred order:
2025
2026
2027

If the dropdown is meant to show newest first, then use descending order consistently:
2027
2026
2025

Do not allow random ordering like:
2026
2025
2027

Sorting rules:

* Years should be sorted numerically
* Dates should be sorted chronologically
* Numbers should be sorted numerically, not alphabetically
* Text options such as departments, names, or statuses should be sorted alphabetically unless there is a custom business order
* Statuses can follow a custom order if needed, such as Active, Paused, Inactive, Archived

Apply sorting consistently across:

* Admin dashboard filters
* Employee database filters
* Creator database filters
* Reports filters
* Attendance/request filters
* Any “All Years” or date-based dropdowns
* Any reusable select/dropdown components

2. Improve Employee Database Search

In the Admin Dashboard, update the Employee Database so admins and authorized department leaders can search employees by name.

Search should support:

* First name
* Last name
* Full name
* Preferred name
* Email
* Department
* Role/job title, if possible

The search should be quick and easy to use, preferably with a search bar at the top of the Employee Database table.

3. Add Employee Profile View

In the Employee Database, there should be a way to click into an employee and view their full profile.

The employee profile view should show everything relevant about that employee in one place.

Suggested employee profile sections:

* Basic information
* Role / job title
* Department
* Employment status
* Start date
* Email
* Discord username
* Schedule
* Assigned creators, if applicable
* SOP/course progress
* SOP acknowledgments
* Missed or overdue SOP deadlines
* Attendance records
* Overtime requests
* Leave requests
* Taskboard activity
* Strikes or accountability records
* Payroll-related summary, if the viewer has permission
* Contractor change request history, if applicable
* Notes or admin notes, if applicable

The goal is for an admin or department head to open one employee profile and understand what is going on with that employee without jumping across multiple pages.

4. Department Head Visibility

Department Heads should be able to view employee profiles for employees in their own department only.

Example:
If someone is a Department Head for the X Department, they should be able to search and view profiles of X Department employees only.

They should not see employees from Instagram, Reddit, or other departments unless they also have global admin/executive access.

Admins and Executives should be able to search and view employees across all departments.

Regular employees should not have access to the Employee Database or other employees’ profiles.

5. Employee Profile Permissions

Some employee profile sections may need permission restrictions.

Suggested visibility:

* Department Heads can see general employee info, schedule, SOP progress, taskboard activity, attendance, leave, OT, and department-related notes for employees in their department.
* Admins and Executives can see everything across all departments.
* Payroll-sensitive information should only be visible to roles with payroll/admin permission.
* Strike/accountability records should only be visible to authorized managers/admins.
* Regular employees should only see their own dashboard, not the full admin employee profile view.

6. UI Requirements

Keep the Employee Database table-based, but each employee row should have a clear way to open the full profile.

Possible actions per employee row:

* View Profile
* Edit Employee
* View Requests
* View SOP Progress
* View Task Activity

If possible, the profile can open as:

* A dedicated employee profile page
* A drawer/sidebar panel
* A modal

Use whichever fits the existing website structure best.

PHASE 13: INTERNAL DOCUMENTATION SYSTEM WITH CMS

I want to add an Internal Documentation system with a CMS to the existing website.

This should be added inside the Admin Dashboard navigation only.

Do not create a main employee-facing nav item.

This should be separate from the employee-facing Resource Portal/LMS.

The Internal Documentation area is mainly for documenting how the app works, how features are built, how workflows connect, and how future developers/admins should understand and maintain the platform.

Feature name:
Internal Documentation

Possible route:
Admin Dashboard → Internal Documentation
or
/admin/internal-docs

Access Control:
Only authorized roles should access this area.

Allowed roles:

* Executive
* Admin
* Department Head, if permission is granted
* Department Manager, if permission is granted

Regular employees should not see or access Internal Documentation unless manually given permission.

Purpose:
Create a single place to document:

* App structure
* Features
* Logic
* Permissions
* Workflows
* Database behavior
* Technical notes
* Future development plans

This should act like a lightweight internal docs/wiki system with CMS functionality.

Core sections:

1. App Overview
   Explain what the website is for, what departments it supports, and what major modules exist.

2. System Architecture
   Document app structure, route groups, backend/API structure, auth logic, database models, permissions, and how major features connect.

3. Authentication & User Access
   Document:

* Login flow
* Invite flow
* New hire setup flow
* User roles
* Department-based permissions
* Admin access
* Employee records and User login records needing to stay synced

4. Feature Documentation
   Allow documentation pages for major features:

* Dashboard
* LMS
* Resource Portal
* SOP CMS
* Employee Database
* Contractor Change Requests
* Employee Requests
* Taskboard
* Attendance
* OT Requests
* Strikes
* Payroll
* Admin Dashboard
* Creator Reports
* My Creators

5. Workflow Documentation
   Document company and system workflows:

* New hire onboarding flow
* SOP creation flow
* SOP acknowledgment flow
* Contractor change request flow
* COE request flow
* Task logging flow
* Department access flow
* Employee offboarding flow
* Creator reporting flow

6. Database / Data Model Notes
   Document important data models and what they are used for.

Examples:

* User
* Employee
* InviteToken
* SOP
* Course
* Acknowledgment
* Task
* EmployeeRequest
* ContractorChangeRequest
* Creator
* CreatorAccount
* CreatorReport
* TeamNote
* Department
* Role
* Permission
* AuditLog

Each data model page should allow notes for:

* Purpose
* Important fields
* Relationships
* Known issues
* Future improvements

7. API / Backend Notes
   Add a place to document API routes and backend behavior.

Each API doc entry should include:

* Route name
* Method
* Purpose
* Required permissions
* Input fields
* Output behavior
* Related database model
* Notes

8. Changelog / Development Notes
   Add a changelog area where admins can document system updates.

Each changelog entry should include:

* Title
* Date
* Updated by
* Feature affected
* Type of update: Added, Changed, Fixed, Removed, Planned
* Notes

9. Known Issues / Technical Debt
   Add a section where admins can document issues that still need to be fixed.

Each issue should include:

* Issue title
* Description
* Priority: Low, Medium, High, Urgent
* Affected feature
* Status: Open, In Progress, Resolved
* Notes

10. Roadmap / Planned Features
    Add a section for future development plans.

Each roadmap item should include:

* Feature title
* Description
* Priority
* Target timeline, optional
* Status: Planned, In Progress, Completed, On Hold
* Notes

CMS Requirements:
Admins should be able to:

* Create documentation pages
* Edit documentation pages
* Publish pages
* Unpublish pages
* Archive pages
* Delete pages, if permission allows

Each documentation page should have:

* Title
* Slug
* Category / Section
* Tags
* Status: Draft, Published, Archived
* Visibility / Access level
* Last updated date
* Updated by
* Main content body

Editor Requirements:
The content editor should feel similar to Notion or a simple CMS editor.

Support:

* Rich text formatting
* Headings
* Bullet lists
* Numbered lists
* Checklists
* Tables, if possible
* Code blocks
* Callout blocks / notes
* Links
* Image/file attachments, if possible
* Ability to reorder sections or blocks, if possible

Search & Navigation:
Add sidebar navigation for documentation categories.

Add search functionality by:

* Title
* Tags
* Category
* Content

Add filters for:

* Category
* Status
* Updated date
* Feature area
* Priority, for issues and roadmap items

Suggested layout:

* Left sidebar: documentation categories
* Main area: selected documentation page
* Top bar: search, create new page, filters
* Admin controls: edit, publish/unpublish, archive, delete

Important distinction:
Resource Portal / LMS is employee-facing training, SOPs, courses, acknowledgments, and onboarding.

Internal Documentation is admin/developer-facing documentation about how the app works, how the company system is structured, how features behave, and how the platform should be maintained.

Do not merge these two areas unless they share reusable components.

Suggested initial documentation pages:

* App Overview
* Login & Invite Flow
* Role & Permission Structure
* Resource Portal Overview
* SOP CMS Overview
* Employee Database Overview
* Contractor Change Request Flow
* Employee Requests Flow
* Taskboard Flow
* Creator Reports Flow
* Known Issues
* Roadmap

PHASE 14: HOW TO MAKE THE WEBSITE LIVE

After implementing the changes, please give me a simple step-by-step guide on how to make the website live.

Make the guide beginner-friendly and specific to my current project setup.

The guide should include:

1. Pre-launch checklist

* Confirm all required environment variables
* Confirm database connection
* Confirm auth/session config
* Confirm invite links work
* Confirm email sending works, if applicable
* Confirm role/permission checks work
* Confirm admin account exists
* Confirm migrations are ready
* Confirm no test-only data is exposed

2. Database setup

* How to run database migrations
* How to seed initial roles/departments/admin account, if needed
* How to verify the production database is connected correctly
* How to avoid accidentally using the local/dev database in production

3. Build and test

* How to install dependencies
* How to run the app locally
* How to run lint/build checks
* How to test login
* How to test invite flow
* How to test admin permissions
* How to test employee permissions
* How to test department-based access
* How to test submitting requests
* How to test exports
* How to test SOP deadlines
* How to test taskboard time tracking

4. Deployment platform
   Please tell me the best deployment steps based on the current repo setup.

If the app is Next.js, include steps for Vercel deployment.

If the app is not Next.js, explain the correct deployment option based on the project.

If the current app can be deployed to Vercel, include:

* Connect GitHub repo to Vercel
* Add environment variables
* Set production branch
* Deploy
* Check deployment logs
* Confirm build success
* Open production URL

5. Domain setup
   Explain how to connect a custom domain, including:

* Add domain in hosting platform
* Update DNS records
* Wait for DNS propagation
* Confirm SSL/HTTPS is active

6. Post-launch testing
   After deployment, provide a checklist to test:

* Login
* Invite acceptance
* Profile setup
* Admin dashboard
* Employee dashboard
* Department Head access
* Employee Database
* SOP/Course deadlines
* Taskboard
* COE requests
* Contractor Change Requests
* My Schedule timezone display
* Attendance and Requests
* My Creators
* Creator Reports
* Team Notes
* Internal Documentation
* Export features
* Audit logs

7. Production safety notes
   Include reminders for:

* Do not expose secrets
* Do not commit .env files
* Use production database only in production
* Keep admin accounts individual
* Test permissions before giving the site to employees
* Back up database before major changes
* Keep rollback plan ready

8. Final launch steps
   Give me a short final checklist:

* Production URL is working
* Admin login works
* Employee invite works
* Permissions work
* Database is connected
* Forms submit correctly
* Exports work
* Audit logs work
* Domain/SSL works
* Ready to send to department heads for testing

IMPORTANT IMPLEMENTATION RULES

Do not break:

* Existing LMS
* Existing Resource Portal
* Existing routing
* Existing auth flow
* Existing role-based access
* Existing department-based access
* Existing employee records
* Existing creator records
* Existing request records
* Existing design system
* Existing dashboard layout

Keep:

* Current UI style
* Current color scheme
* Current font
* Current spacing
* Current cards/layout
* Current routing style where possible

Build everything in a scalable way so future departments, request types, reports, roles, and documentation categories can be added later.
