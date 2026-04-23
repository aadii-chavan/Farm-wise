# FarmEzy Technical Feature Specification

A comprehensive technical reference of the FarmEzy application architecture, features, and business logic. This document serves as a mapping for LLM-based architectural insights and requirement analysis.

---

## 1. Application Overview
FarmEzy is a professional-grade agricultural management platform designed for modern farmers to track financials, labor, inventory, and field activities. It prioritizes data-driven decision-making through complex financial calculations and integrated module tracking.

### Core Tech Stack
- **Frontend**: React Native (Expo SDK 54) with TypeScript.
- **Navigation**: Expo Router (File-based routing).
- **Backend/Database**: Supabase (PostgreSQL) for real-time persistence.
- **Styling**: Custom Design System using `Themed.tsx` and `Palette.ts`.
- **Reporting**: `expo-print` and `expo-sharing` for dynamic PDF generation.

---

## 2. Module Specifications

### 2.1 Dashboard (Main Hub)
The dashboard provides a high-level financial summary of the farm's performance across different time horizons.
- **Financial Calculation Engine**:
    - **Today**: Real-time aggregation of income vs expense.
    - **This Month**: Cumulative performance for the current calendar month.
    - **Current Season**: Dynamic calculation based on a "Season Start Date" (defaults to current year start or custom setting).
- **Metric Definitions**:
    - `Net Profit = Total Income - Total Expenses`.
    - `Total Outstandings`: Aggregate of shop credits and unpaid labor advances.
- **Quick Actions**: Direct shortcuts to adding transactions, inventory, or recording rain.

### 2.2 Plot Management & Workbooks
The core unit of farming operations.
- **Plot Profiles**: Tracking area (Acres), crop type, variety, and financial performance per field.
- **Workbook Section**: A high-end, table-based logging system for field activities.
    - **Day-wise Tracking**: Automatically calculates "Day X" relative to the first entry (Reference Point).
    - **Custom Columns**: Users can dynamically add new columns (e.g., "Temperature", "Moisture") to the workbook table.
    - **Rain Meter Integration**: Automatically pulls rain data from the global Rain Meter module based on the entry date.
    - **Bidirectional Sync**: Changing the date updates the "Day" count, and vice versa.
    - **Task Integration**: Toggling a scheduled task as "Complete" can auto-generate a workbook entry.

### 2.3 Labor Management (Labor Book)
Comprehensive staff and contractor tracking.
- **Staff Categories**:
    - **Daily Wage**: Paid based on attendance frequency.
    - **Annual Staff**: Fixed yearly salary with penalty-based deductions for absences.
    - **Contractors**: Project-based workers with advance payment and progress tracking.
- **Attendance Sheet**: A grid-based "power-user" interface.
    - Supports batch attendance logging (Present, Absent, Half-Day).
    - Integrated with the transaction system to "Settle Wages" or "Record Advances" directly from the attendance grid.
    - **Advance Alerts**: Visual warnings if a worker has an outstanding advance before processing new payments.
- **Contractor Tracking**: Tracks "Amount Paid" vs "Total Contract Value" with visual progress bars.

### 2.4 Inventory & Stock Control
Supply chain management with financial logic.
- **Batch Entry**: Allows adding multiple items (e.g., Fertilizer + Pesticide) from a single invoice/shop visit.
- **Stock Tracking**: Real-time inventory levels with unit conversion (e.g., Bags to Kg).
- **Shop-wise Management**: Tracks total purchase value and outstanding credit per shop.
- **Financial Logic**:
    - **Interest Rate Tracking**: Supports calculating interest on credit purchases (Daily, Weekly, Monthly, Yearly).
    - **Unit Costing**: Calculates cost per primary unit (Kg) and secondary unit (Gm).

### 2.5 Task Scheduler
A proactive operational calendar.
- **Smart Calendar**: Custom grid view with task indicators.
- **Overdue Logic**: Tasks scheduled in the past that aren't marked complete are flagged as "Missed" in today's view.
- **Workbook Sync**: Optional setting to automatically log a field activity to the Plot Workbook when a task is completed.

### 2.6 Rain Meter
- **Precision Tracking**: Daily rainfall measurement in mm.
- **Module Injection**: Rain data is injected into the Workbook and Dashboard to correlate weather patterns with crop yield and activity.

---

## 3. Key Business Logic & Algorithms

### 3.1 Financial Interest Calculation & Delta Engine
The app uses a robust "Lifetime Delta" engine to calculate interest paid within specific periods:
- **Lifetime Interest**: Calculated per shop by finding the difference between `Total Payments Made` and `Total Principal Value` (Sum of Price * Quantity for all items bought).
- **Period Interest**: Interest for a specific period (e.g., "This Month") is derived by: 
  `Interest_Paid = Lifetime_Interest(End_Date) - Lifetime_Interest(Start_Date)`.
- **Accrual Basis**: Inventory purchases are treated as accrual expenses (cost recognized at purchase), while interest is tracked on a cash-delta basis.

### 3.2 Inventory Deduction Logic
When a transaction is recorded for an activity (e.g., "Spraying"):
1. The user selects an inventory item.
2. The app checks current stock levels.
3. Upon saving, the item's quantity is decremented, and the transaction is linked to the Plot and Inventory ID.
4. Deleting the transaction reverts the stock deduction.

### 3.3 Workbook Reference Logic
The "Days Past" column is relative. If the first entry is "Day 0" on Jan 1st:
- Jan 5th becomes "Day 4".
- If the user adds an entry for Dec 30th, the system offers to shift the reference point.

---

## 4. UI/UX & Interaction Design
- **Dark Mode Support**: Context-aware theming for night-time field use.
- **Glassmorphism & Gradients**: Premium aesthetic using `expo-linear-gradient`.
- **Skeleton Loading**: `Animated` (Reanimated) pulse skeletons for data-heavy views like Workbooks and Dashboard.
- **PDF Generation**: Branded PDF reports with tables and financial summaries for Plot Ledgers and Workbooks.

---

## 5. Data Schema Overview
- **Plots**: `id, name, area, cropType, variety`
- **Transactions**: `id, plotId, amount, type (Income/Expense), category, inventoryId, date, paymentMode (Cash/Credit)`
- **Inventory**: `id, name, quantity, unit, shopName, interestRate, paymentStatus`
- **LaborProfile**: `id, name, type (Daily/Annual/Contract), baseWage, phone`
- **LaborAttendance**: `id, workerId, date, status (P/A/H), notes`
- **Workbook**: `id, plotId, data (JSON blob for flexible custom columns)`
- **Tasks**: `id, title, date, time, plotId, syncToWorkbook`

---
*End of Feature Specification*
