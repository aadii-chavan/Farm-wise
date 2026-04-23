# FarmEzy

[![Framework](https://img.shields.io/badge/Framework-Expo%2054-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-Private-D93025?style=for-the-badge)](LICENSE)

FarmEzy is a professional-grade farm management and labor tracking application designed to streamline agricultural operations. Built with a robust mobile-first architecture, it provides farmers with a centralized platform to manage labor, inventory, finances, and field activities in real-time.

---

## Core Modules

### Labor Management System
A comprehensive suite for managing farm personnel:
- **Worker Profiles**: Maintain detailed records including contact information, base wages, and employment status.
- **Attendance Tracking**: Digital attendance sheets with plot-specific logging.
- **Financial Tracking**: Manage worker advances, salary payments, and loan repayments.
- **Project Contracts**: Track specialized labor contracts with milestone-based advance payments and deadlines.

### Plot and Crop Management
Dynamic field organization for optimized farming:
- **Field Mapping**: Register farm plots with precise area measurements.
- **Crop Lifecycle**: Track crop varieties and planting cycles per plot.
- **Plot-wise Workbook**: Automated logging of all activities, applications, and observations for each specific field.

### Inventory and Supply Chain
Real-time stock management for farm essentials:
- **Stock Tracking**: Monitor levels of fertilizers, pesticides, and seeds.
- **Automated Deduction**: Inventory levels automatically update based on task completions and plot applications.
- **Purchase History**: Log invoices, batch numbers, and supplier details.

### Financial Analytics
Detailed insights into farm economics:
- **Transaction Log**: Categorized tracking of income and expenses.
- **General Overheads**: Manage non-plot-specific costs like maintenance and utilities.
- **Expense Distribution**: Visual analytics of spending patterns across different modules.

### Environmental Monitoring
- **Rain Meter**: Precise recording and historical analysis of rainfall data.
- **Task Scheduler**: Calendar-based planning for irrigation, fertilization, and harvesting operations.

---

## Technical Architecture

### Tech Stack
- **Frontend**: React Native with Expo (SDK 54)
- **Navigation**: Expo Router with support for Typed Routes
- **State Management**: React Context API for global synchronization
- **Database**: Supabase (PostgreSQL) for real-time data persistence
- **UI Components**: Custom-engineered components utilizing Expo Linear Gradient and Native SVG
- **Analytics**: Integration with React Native Chart Kit for visual reporting
- **Reporting**: PDF generation and document sharing via Expo Print and Sharing

### Directory Structure
```text
├── app/               # Expo Router file-based navigation and screens
├── components/        # Reusable UI components and design system
├── context/           # Global state management (Auth, Farm Data)
├── constants/         # Application-wide constants and theme definitions
├── types/             # TypeScript interfaces and type definitions
├── utils/             # Helper functions, API clients, and storage logic
├── assets/            # Static assets including images and fonts
└── database.sql       # Database schema and initialization scripts
```

---

## Getting Started

### Prerequisites
- Node.js (Latest LTS)
- Expo Go app or a physical device for testing
- Supabase Project

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```text
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Start the development server:
   ```bash
   npx expo start
   ```

---

## Database Setup
The application requires specific database tables and RLS policies. Execute the provided SQL scripts in your Supabase SQL Editor in the following order:
1. `database.sql`
2. `labor_module_setup.sql`
3. `workbook_setup.sql`

---

## Development Standards
- **Language**: Strict TypeScript for type safety.
- **Styling**: Component-based native styles for performance.
- **Navigation**: Type-safe routes via Expo Router.
- **Persistence**: Real-time synchronization with Supabase via custom storage hooks.

---

&copy; 2026 FarmEzy. All Rights Reserved.
