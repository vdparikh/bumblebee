# Frontend Code Structure

This document outlines the organized structure of the compliance automation frontend codebase.

## Directory Structure

```
frontend/src/
├── pages/                    # Main page components organized by feature
│   ├── dashboard/            # Dashboard-related pages
│   │   ├── DashboardPage.js
│   │   ├── AuditorDashboard.js
│   │   └── Dashboard.js
│   ├── compliance/           # Compliance management pages
│   │   ├── TaskLibraryPage.js
│   │   ├── RisksPage.js
│   │   ├── RequirementsPage.js
│   │   ├── StandardsPage.js
│   │   ├── LibraryManagementPage.js
│   │   ├── Documents.js
│   │   ├── Standards.js
│   │   └── ComplianceChecks.js
│   ├── admin/               # Admin and settings pages
│   │   ├── AdminSettingsPage.js
│   │   ├── HelpPage.js
│   │   ├── AuditLogsPage.js
│   │   └── PendingReviewPage.js
│   ├── teams/               # Team management pages
│   │   └── TeamsPage.js
│   ├── tasks/               # Task-related pages
│   │   ├── TaskWizardPage.js
│   │   ├── Tasks.js
│   │   ├── MyTasks.js
│   │   └── TaskDetail.js
│   ├── campaigns/           # Campaign-related pages
│   │   ├── Campaigns.js
│   │   ├── CampaignDetail.js
│   │   └── CampaignTaskInstanceDetail.js
│   └── auth/                # Authentication pages
│
├── components/              # Reusable UI components
│   ├── layout/             # Layout components
│   │   ├── RightSidePanel.js
│   │   ├── RightSidePanel.css
│   │   └── Sidebar.js
│   ├── forms/              # Form components
│   │   └── EntityFormPanel.js
│   ├── ui/                 # General UI components
│   │   ├── PageHeader.js
│   │   ├── KeyMetricsCard.js
│   │   ├── TaskListItem.js
│   │   ├── ThemeSwitcher.js
│   │   ├── StatusIcon.js
│   │   ├── UserDisplay.js
│   │   ├── TeamDisplay.js
│   │   ├── CommentSection.js
│   │   └── HelpSupportPanel.js
│   ├── charts/             # Chart components
│   │   ├── ChartCard.js
│   │   ├── PieChartCard.js
│   │   └── BarChartCard.js
│   ├── modals/             # Modal components
│   │   └── ConfirmModal.js
│   └── task_wizard/        # Task wizard components
│       ├── EvidenceStep.js
│       ├── OverviewStep.js
│       ├── AutomationStep.js
│       └── ReviewStep.js
│
├── features/               # Feature-specific components
│   ├── compliance/         # Compliance feature components
│   ├── tasks/             # Task feature components
│   ├── campaigns/         # Campaign feature components
│   └── admin/             # Admin feature components
│       ├── SystemIntegrations.js
│       ├── SystemIntegrationForm.js
│       └── UserManagement.js
│
├── services/              # API services and external integrations
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
│   ├── iconMap.js
│   └── displayUtils.js
├── constants/             # Application constants
│   └── systemTypes.js
├── contexts/              # React contexts
│   ├── AuthContext.js
│   └── ThemeContext.js
├── styles/                # Global styles and themes
├── assets/                # Static assets
└── App.js                 # Main application component
```

## Organization Principles

### 1. Pages Directory
- **Feature-based organization**: Pages are grouped by business domain
- **Clear separation**: Each feature has its own directory
- **Scalable structure**: Easy to add new features

### 2. Components Directory
- **Reusability focus**: Components are organized by their purpose
- **Layout components**: Handle overall page structure
- **UI components**: Reusable interface elements
- **Form components**: Form-specific logic and validation
- **Chart components**: Data visualization components
- **Modal components**: Overlay and dialog components

### 3. Features Directory
- **Domain-specific components**: Complex components specific to business features
- **Admin features**: System administration components
- **Compliance features**: Compliance management components
- **Task features**: Task-related components
- **Campaign features**: Campaign management components

### 4. Supporting Directories
- **Services**: API calls and external integrations
- **Hooks**: Custom React hooks for shared logic
- **Utils**: Helper functions and utilities
- **Constants**: Application-wide constants
- **Contexts**: React context providers
- **Styles**: Global styling and theming

## Benefits of This Structure

1. **Scalability**: Easy to add new features without cluttering existing code
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Components are organized for maximum reuse
4. **Discoverability**: Developers can quickly find relevant code
5. **Team collaboration**: Different team members can work on different features
6. **Testing**: Easier to write and organize tests
7. **Performance**: Better code splitting opportunities

## Migration Notes

- All imports have been updated to reflect the new structure
- Components maintain their original functionality
- No breaking changes to the application logic
- Improved organization for future development

## Next Steps

1. Update any remaining import statements
2. Add index files for easier imports
3. Consider adding TypeScript for better type safety
4. Implement proper testing structure
5. Add documentation for each component 