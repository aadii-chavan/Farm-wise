# FarmEzy Technical Feature Specification

[![Document Status](https://img.shields.io/badge/Status-Mapping%20Complete-success?style=for-the-badge)](https://github.com/aadii-chavan/Farm-wise)
[![Format](https://img.shields.io/badge/Format-LLM%20Optimized-3178C6?style=for-the-badge)](https://github.com/aadii-chavan/Farm-wise)
[![Target](https://img.shields.io/badge/Target-Architecture%20Analysis-orange?style=for-the-badge)](https://github.com/aadii-chavan/Farm-wise)

A comprehensive technical reference of the FarmEzy application architecture, feature logic, and business rules. This document is specifically engineered to provide an LLM with the necessary context for high-level architectural insights and requirement analysis.

---

## Table of Contents
- [1. Application Overview](#1-application-overview)
- [2. Module Specifications](#2-module-specifications)
  - [2.1 Dashboard & Financial Analytics](#21-dashboard--financial-analytics)
  - [2.2 Plot Management & Field Workbooks](#22-plot-management--field-workbooks)
  - [2.3 Labor Management & Attendance](#23-labor-management--attendance)
  - [2.4 Inventory & Supply Chain Logic](#24-inventory--supply-chain-logic)
  - [2.5 Task Scheduler & Sync Engine](#25-task-scheduler--sync-engine)
  - [2.6 Rain Meter Module](#26-rain-meter-module)
- [3. Key Business Logic & Algorithms](#3-key-business-logic--algorithms)
  - [3.1 Financial Interest & Delta Engine](#31-financial-interest--delta-engine)
  - [3.2 Inventory Deduction Logic](#32-inventory-deduction-logic)
  - [3.3 Workbook Reference Logic](#33-workbook-reference-logic)
- [4. UI/UX Architecture](#4-uiux-architecture)
- [5. Technical Data Schema](#5-technical-data-schema)

---

## 1. Application Overview
FarmEzy is a professional-grade agricultural management platform designed for modern farmers to track financials, labor, inventory, and field activities. It prioritizes data-driven decision-making through complex financial calculations and integrated module tracking.

---

## 2. Module Specifications

### 2.1 Dashboard & Financial Analytics
The central hub for real-time financial health monitoring.
- **Financial Calculation Engine**: Computes performance across daily, monthly, and seasonal intervals.
- **Metric Definitions**:
    - **Net Profit**: Derived from `Total Income - Total Expenses`.
    - **Total Outstandings**: Aggregate sum of shop credits and unpaid labor advances.
- **Period-wise Stats**: Automatic filtering of transactions based on the custom "Season Start Date".

### 2.2 Plot Management & Field Workbooks
The core unit of farming operations and historical tracking.
- **Plot Profiles**: Detailed tracking of field area (Acres), crop types, and specific varieties.
- **Workbook Section**: A high-end, table-based logging system for granular activity tracking.
- **Dynamic Capabilities**:
    - **Day-wise Tracking**: Calculates "Day X" relative to the first workbook entry.
    - **Custom Columns**: Users can dynamically extend the schema with custom metrics (e.g., Temperature).
    - **Rain Meter Injection**: Automatically pulls rainfall data based on the entry date.

### 2.3 Labor Management & Attendance
Integrated workforce management with financial reconciliation.
- **Staff Categories**: Supports Daily Wage staff, Fixed-Salary Annual staff, and Project Contractors.
- **Attendance Sheet**: A high-density grid for batch attendance logging (Present, Absent, Half-Day).
- **Payment Reconciliation**: Directly settle wages, record advances, or apply salary deductions from the attendance view.
- **Contractor Tracking**: Progress monitoring for project-based contracts with milestone payments.

### 2.4 Inventory & Supply Chain Logic
Stock management integrated with financial interest tracking.
- **Batch Processing**: Single-invoice entry for multiple supplies with automated batch number tracking.
- **Unit Conversion**: Seamless handling of packages-to-weight conversions (e.g., Bags to Kg).
- **Financial Overlays**: Tracks purchase value, interest rates on credit, and outstanding shop balances.

### 2.5 Task Scheduler & Sync Engine
Proactive operational planning with automated logging.
- **Smart Calendar**: Visual task distribution with category-specific indicators.
- **Overdue Management**: Automatic flagging of past-due tasks as "Missed".
- **Workbook Sync**: Automated generation of workbook entries upon task completion to ensure data consistency.

### 2.6 Rain Meter Module
- **Precision Logging**: Recording of daily rainfall in mm.
- **Data Propagation**: Rainfall data is shared across the Workbook and Dashboard modules to correlate weather with productivity.

---

## 3. Key Business Logic & Algorithms

### 3.1 Financial Interest & Delta Engine
The system employs a "Lifetime Delta" methodology for precise financial tracking:
- **Lifetime Interest**: Difference between `Total Payments` and `Total Principal` across the shop history.
- **Period Performance**: Interest for any period is calculated as: `Interest(EndDate) - Interest(StartDate)`.
- **Accrual Logic**: Cost of inventory is recognized immediately at purchase, while interest follows a cash-delta model.

### 3.2 Inventory Deduction Logic
Integrated stock management on activity recording:
1. User selects a supply from inventory during an activity log (e.g., Spraying).
2. The system verifies stock availability.
3. On save, the inventory quantity is decremented and linked to the Plot transaction.
4. Transaction deletion triggers an automatic stock reversal.

### 3.3 Workbook Reference Logic
The "Days Past" metric is anchored to a floating reference:
- Initial entry is established as "Day 0".
- All subsequent logs are calculated relative to this date.
- Inserting an entry prior to the current Day 0 triggers a system prompt to re-anchor the reference point.

---

## 4. UI/UX Architecture
- **Responsive Design**: Custom-engineered for high-density agricultural data management.
- **Branded Reporting**: Dynamic PDF generation for financial ledgers and workbook logs.
- **Performance UX**: Reanimated pulse skeletons for data-heavy views to ensure smooth interaction.
- **Color Systems**: Categorized color tokens for consistent visual language across all modules.

---

## 5. Technical Data Schema

### Core Tables & Objects
| Entity | Key Attributes |
| :--- | :--- |
| **Plots** | `id, name, area, cropType, variety` |
| **Transactions** | `id, plotId, amount, type, category, inventoryId, date, paymentMode` |
| **Inventory** | `id, name, quantity, unit, shopName, interestRate, paymentStatus` |
| **LaborProfile** | `id, name, type, baseWage, phone` |
| **LaborAttendance** | `id, workerId, date, status, notes` |
| **Workbook** | `id, plotId, data (JSON blob for flexible custom columns)` |
| **Tasks** | `id, title, date, time, plotId, syncToWorkbook` |

---
&copy; 2026 FarmEzy. Technical Reference Document.
