# Implementation Plan: PrimeNG Dashboard Migration

## Overview

This implementation plan guides the migration of the VeraProof AI partner dashboard from Angular Material to PrimeNG. The migration follows a bottom-up approach: foundation setup → shared components → layout components → feature modules → testing & validation → cleanup. Each task builds incrementally to ensure the application remains functional throughout the migration process.

## Tasks

- [x] 1. Phase 1: Setup & Foundation
  - [x] 1.1 Install PrimeNG dependencies and configure build
    - Run `npm install primeng@^17.0.0 primeicons@^7.0.0`
    - Update angular.json to include PrimeNG styles in the styles array
    - Add primeicons.css, lara-light-blue/theme.css, and primeng.min.css
    - Configure build optimization settings for tree-shaking
    - Update production budget configuration to allow 500KB increase
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 1.2 Create theme service for light/dark mode management
    - Create src/app/core/services/theme.service.ts with signal-based state
    - Implement switchTheme() method to dynamically load theme CSS
    - Implement loadTheme() method to restore saved theme from localStorage
    - Create src/theme.css with custom CSS variables for VeraProof AI branding
    - Add theme initialization to AppComponent.ngOnInit()
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 1.3 Create PrimeNG configuration service
    - Create src/app/core/services/primeng-config.service.ts
    - Configure ripple effect, z-index values, and default translations
    - Initialize PrimeNG configuration in AppComponent
    - _Requirements: 1.3_

  - [x] 1.4 Capture performance baseline metrics
    - Run production build with --stats-json flag
    - Generate webpack bundle analyzer report and save to baseline folder
    - Run Lighthouse audit and save results to baseline folder
    - Capture Core Web Vitals metrics (FCP, LCP, TTI, TBT, CLS)
    - Create baseline JSON file with all metrics in .kiro/specs/primeng-dashboard-migration/baseline/
    - _Requirements: 1.5, 19.1, 19.2_


- [x] 2. Phase 2: Shared Components Migration
  - [x] 2.1 Create centralized PrimeNG module
    - Create src/app/shared/primeng.module.ts
    - Import and export all required PrimeNG modules (Button, Card, Table, Dialog, InputText, Dropdown, Checkbox, RadioButton, Toolbar, Sidebar, Menu, ProgressSpinner, Chip, Divider, ConfirmDialog, DynamicDialog)
    - Configure module for reuse across feature modules
    - _Requirements: 1.4_

  - [x] 2.2 Migrate StatCard component to PrimeNG Card
    - Replace MatCardModule import with CardModule from primeng/card
    - Update template to use <p-card> with pTemplate directives for header and content
    - Update CSS classes from .mat-card to .p-card
    - Preserve all @Input properties (title, value, icon, trend, loading)
    - Update loading state to use PrimeNG ProgressSpinner
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.3 Write property test for StatCard data display preservation
    - **Property 8: Stat Card Data Display Preservation**
    - **Validates: Requirements 7.2**
    - Use fast-check to generate random metric data (title, value, icon, trend)
    - Verify StatCard displays data in same format as before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 7.2_

  - [x] 2.4 Migrate DataTable component to PrimeNG Table
    - Replace MatTableModule, MatPaginatorModule, MatSortModule with TableModule
    - Update template to use <p-table> with built-in pagination and sorting
    - Implement column definition mapping to PrimeNG format
    - Add support for selection mode (single/multiple with checkboxes)
    - Add support for resizable and reorderable columns
    - Add support for row expansion with custom template
    - Add support for custom cell templates via TableColumn.template
    - Preserve all event emissions (rowAction, sortChange, pageChange)
    - Transform PrimeNG event payloads to match original structure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [ ]* 2.5 Write property test for DataTable sorting preservation
    - **Property 2: Data Table Sorting Preservation**
    - **Validates: Requirements 3.4**
    - Create reference implementation of original sorting logic
    - Use fast-check to generate random datasets with sortable columns
    - Verify sorting produces same row order as before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 3.4_

  - [ ]* 2.6 Write property test for DataTable pagination preservation
    - **Property 3: Data Table Pagination Preservation**
    - **Validates: Requirements 3.5**
    - Use fast-check to generate random page sizes and datasets
    - Verify correct number of rows displayed per page
    - Run 100 iterations with fc.assert
    - _Requirements: 3.5_

  - [ ]* 2.7 Write property test for DataTable filtering preservation
    - **Property 4: Data Table Filtering Preservation**
    - **Validates: Requirements 3.6**
    - Use fast-check to generate random filter inputs and datasets
    - Verify filtered results match pre-migration logic
    - Run 100 iterations with fc.assert
    - _Requirements: 3.6_

  - [x] 2.8 Migrate LoadingSpinner component to PrimeNG ProgressSpinner
    - Replace MatProgressSpinnerModule with ProgressSpinnerModule
    - Update template to use <p-progressSpinner>
    - Map diameter input to PrimeNG style property
    - Preserve message display functionality
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.9 Migrate ConfirmationDialog service to PrimeNG ConfirmDialog
    - Replace MatDialog with ConfirmationService from primeng/api
    - Add ConfirmDialogModule to app imports
    - Update confirm() method to use PrimeNG API
    - Return Observable<boolean> matching original interface
    - Map options (title, message, confirmText, cancelText) to PrimeNG format
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.10 Write property test for dialog action preservation
    - **Property 7: Dialog Action Preservation**
    - **Validates: Requirements 5.4, 5.5**
    - Use fast-check to generate random confirmable actions
    - Verify confirm executes action and cancel prevents execution
    - Run 100 iterations with fc.assert
    - _Requirements: 5.4, 5.5_

  - [x] 2.11 Update all shared component unit tests
    - Update test imports to use PrimeNG modules
    - Update DOM selectors to match PrimeNG structure
    - Verify all existing tests pass
    - Maintain 100% code coverage for shared components
    - _Requirements: 20.1, 20.2_

  - [x] 2.12 Build verification for Phase 2
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --watch=false` to verify all tests pass
    - Check console for warnings or errors
    - Verify application starts with `ng serve`


- [x] 3. Phase 3: Layout Components Migration
  - [x] 3.1 Migrate MainLayout component to PrimeNG Sidebar
    - Replace MatSidenavModule with SidebarModule from primeng/sidebar
    - Update template to use <p-sidebar> with custom layout structure
    - Implement sidebarVisible signal for toggle state management
    - Update toggleSidebar() method to work with PrimeNG API
    - Maintain responsive behavior with CSS media queries
    - Preserve routing outlet and content projection
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Migrate Toolbar component to PrimeNG Toolbar
    - Replace MatToolbarModule with ToolbarModule from primeng/toolbar
    - Update template to use <p-toolbar> with pTemplate slots (start, center, end)
    - Replace MatIconButton with PrimeNG Button component
    - Update menu toggle button to use PrimeNG icon
    - Migrate user menu to PrimeNG Menu with popup mode
    - Convert user menu items to MenuItem[] format
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 3.3 Migrate Sidebar component to PrimeNG Menu
    - Replace MatListModule with MenuModule from primeng/menu
    - Convert navigation items to PrimeNG MenuItem[] format
    - Update icon references from Material Icons to PrimeIcons using mapping table
    - Implement active route highlighting with routerLinkActive
    - Preserve navigation order and structure
    - _Requirements: 2.4, 2.5, 11.1, 11.2_

  - [ ]* 3.4 Write property test for navigation action preservation
    - **Property 1: Navigation Action Preservation**
    - **Validates: Requirements 2.5, 9.3**
    - Use fast-check to generate navigation item configurations
    - Verify clicking navigation items routes to or executes same actions
    - Test both sidebar menu and dropdown menu items
    - Run 100 iterations with fc.assert
    - _Requirements: 2.5, 9.3_

  - [x] 3.5 Update layout component unit tests
    - Update test imports to use PrimeNG modules
    - Update DOM selectors for PrimeNG components
    - Test sidebar toggle functionality
    - Test toolbar menu interactions
    - Test navigation routing
    - Maintain 100% code coverage for layout components
    - _Requirements: 20.1, 20.2_

  - [x] 3.6 Build verification for Phase 3
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --watch=false` to verify all tests pass
    - Check console for warnings or errors
    - Verify application starts and navigation works

- [x] 4. Checkpoint - Verify foundation and shared components
  - Ensure all tests pass for shared and layout components
  - Verify no console errors or warnings
  - Test responsive behavior on mobile/tablet/desktop
  - Ask the user if questions arise before proceeding to feature modules


- [x] 5. Phase 4: Feature Modules Migration - Admin Module
  - [x] 5.1 Migrate Admin module tenant list component
    - Replace Angular Material imports with PrimeNG modules
    - Update template to use migrated DataTable component
    - Update row action buttons to use PrimeNG Button
    - Update status chips to use PrimeNG Chip component
    - Verify tenant list displays correctly with pagination and sorting
    - _Requirements: 12.1, 10.1, 10.2, 10.3_

  - [x] 5.2 Migrate Admin module platform stats component
    - Update template to use migrated StatCard components
    - Verify all stat cards display correctly
    - Test loading states
    - _Requirements: 12.1_

  - [x] 5.3 Migrate Admin module tenant detail component
    - Replace MatTabsModule with TabViewModule from primeng/tabview
    - Update all form fields to use PrimeNG form components with p-float-label
    - Update buttons to use PrimeNG Button
    - Implement form validation error display with <small class="p-error">
    - _Requirements: 12.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 5.4 Write property test for form validation preservation
    - **Property 6: Form Validation Preservation**
    - **Validates: Requirements 4.6, 4.7**
    - Use fast-check to generate random form inputs with validation rules
    - Verify validation passes/fails identically to before migration
    - Verify error messages display in same format
    - Run 100 iterations with fc.assert
    - _Requirements: 4.6, 4.7_

  - [x] 5.5 Update Admin module unit tests
    - Update test imports and selectors
    - Verify all tests pass
    - Test form validation and submission
    - Test table interactions
    - _Requirements: 20.1, 20.2_

  - [x] 5.6 Build verification for Admin module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/admin/**/*.spec.ts' --watch=false`
    - Verify Admin module functionality in browser

- [ ] 6. Phase 4: Feature Modules Migration - Analytics Module
  - [x] 6.1 Migrate Analytics module overview component
    - Verify Chart.js integration remains unchanged
    - Update date range picker to use PrimeNG Calendar
    - Update filter dropdowns to use PrimeNG Dropdown
    - Update export button to use PrimeNG Button
    - _Requirements: 12.2, 14.1, 14.2, 14.3_

  - [x] 6.2 Migrate Analytics module chart components
    - Verify ng2-charts integration works with PrimeNG layout
    - Test all chart types (line, bar, pie, doughnut)
    - Verify chart interactions (tooltips, legend clicks, data point clicks)
    - _Requirements: 14.2, 14.3, 14.4_

  - [ ]* 6.3 Write property test for chart rendering preservation
    - **Property 11: Chart Rendering Preservation**
    - **Validates: Requirements 14.2**
    - Use fast-check to generate random chart data and types
    - Verify rendered charts display same data visualization
    - Run 100 iterations with fc.assert
    - _Requirements: 14.2_

  - [ ]* 6.4 Write property test for chart interaction preservation
    - **Property 12: Chart Interaction Preservation**
    - **Validates: Requirements 14.4**
    - Use fast-check to generate random chart interactions
    - Verify interactions behave identically to before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 14.4_

  - [x] 6.5 Update Analytics module unit tests
    - Update test imports and selectors
    - Verify all tests pass
    - Test chart rendering and interactions
    - _Requirements: 20.1, 20.2_

  - [x] 6.6 Build verification for Analytics module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/analytics/**/*.spec.ts' --watch=false`
    - Verify Analytics module and charts work in browser


- [ ] 7. Phase 4: Feature Modules Migration - API Keys Module
  - [x] 7.1 Migrate API Keys create dialog component
    - Replace MatDialog with DynamicDialogService from primeng/dynamicdialog
    - Update dialog component to use DynamicDialogRef and DynamicDialogConfig
    - Update all form fields to use PrimeNG components with p-float-label
    - Update buttons to use PrimeNG Button
    - Preserve dialog close behavior and return values
    - _Requirements: 12.3, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 7.2 Migrate API Keys list component
    - Update template to use migrated DataTable component
    - Update copy-to-clipboard action buttons to use PrimeNG Button
    - Update delete confirmation to use migrated ConfirmationDialog service
    - Verify API key list displays correctly
    - _Requirements: 12.3, 5.3_

  - [x] 7.3 Update API Keys module unit tests
    - Update test imports and selectors
    - Test dialog opening and closing
    - Test form submission
    - Test delete confirmation flow
    - Verify all tests pass
    - _Requirements: 20.1, 20.2_

  - [x] 7.4 Build verification for API Keys module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/api-keys/**/*.spec.ts' --watch=false`
    - Verify API Keys module functionality in browser

- [ ] 8. Phase 4: Feature Modules Migration - Billing Module
  - [x] 8.1 Migrate Billing module invoice list component
    - Update template to use migrated DataTable component
    - Update download buttons to use PrimeNG Button
    - Update status chips to use PrimeNG Chip
    - _Requirements: 12.4, 10.1, 10.2, 10.3_

  - [x] 8.2 Migrate Billing module plan comparison component
    - Update template to use PrimeNG Card for plan cards
    - Update buttons to use PrimeNG Button
    - Update feature lists to use PrimeNG styling
    - _Requirements: 12.4_

  - [x] 8.3 Migrate Billing module subscription overview component
    - Update template to use migrated StatCard components
    - Replace MatProgressBarModule with ProgressBarModule from primeng/progressbar
    - Update action buttons to use PrimeNG Button
    - _Requirements: 12.4_

  - [x] 8.4 Update Billing module unit tests
    - Update test imports and selectors
    - Verify all tests pass
    - Test table interactions and button actions
    - _Requirements: 20.1, 20.2_

  - [x] 8.5 Build verification for Billing module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/billing/**/*.spec.ts' --watch=false`
    - Verify Billing module functionality in browser

- [ ] 9. Phase 4: Feature Modules Migration - Branding Module
  - [x] 9.1 Migrate Branding module editor component
    - Replace MatFormFieldModule with PrimeNG form components
    - Update color picker to use ColorPickerModule from primeng/colorpicker
    - Update file upload to use FileUploadModule from primeng/fileupload
    - Update all input fields to use p-float-label pattern
    - Update save button to use PrimeNG Button
    - _Requirements: 12.5, 4.1, 4.2_

  - [x] 9.2 Migrate Branding module preview component
    - Update preview panel styling to work with PrimeNG
    - Verify live preview updates correctly
    - _Requirements: 12.5_

  - [ ] 9.3 Update Branding module unit tests
    - Update test imports and selectors
    - Test color picker interactions
    - Test file upload functionality
    - Verify all tests pass
    - _Requirements: 20.1, 20.2_

  - [x] 9.4 Build verification for Branding module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/branding/**/*.spec.ts' --watch=false`
    - Verify Branding module functionality in browser

- [ ] 10. Phase 4: Feature Modules Migration - Dashboard Module
  - [x] 10.1 Migrate Dashboard module overview component
    - Update template to use migrated StatCard components
    - Update recent activity list to use PrimeNG Timeline or custom list
    - Update quick actions menu to use PrimeNG Button
    - Verify all dashboard widgets display correctly
    - _Requirements: 12.6_

  - [ ] 10.2 Update Dashboard module unit tests
    - Update test imports and selectors
    - Verify all tests pass
    - Test stat card rendering and interactions
    - _Requirements: 20.1, 20.2_

  - [x] 10.3 Build verification for Dashboard module
    - Run `ng build --configuration=development` to verify no compilation errors
    - Run `ng test --include='**/dashboard/**/*.spec.ts' --watch=false`
    - Verify Dashboard module functionality in browser


- [ ] 11. Phase 4: Feature Modules Migration - Sessions Module
  - [x] 11.1 Migrate Sessions create dialog component
    - Replace MatDialog with DynamicDialogService
    - Update dialog component to use DynamicDialogRef and DynamicDialogConfig
    - Update all form fields to use PrimeNG components with p-float-label
    - Verify QR code generation library (qrcode 1.5.4) integration remains unchanged
    - Update buttons to use PrimeNG Button
    - _Requirements: 12.7, 15.1, 15.2, 5.1, 5.2_

  - [ ]* 11.2 Write property test for QR code generation preservation
    - **Property 13: QR Code Generation Preservation**
    - **Validates: Requirements 15.2**
    - Use fast-check to generate random verification session data
    - Verify generated QR codes encode same data format as before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 15.2_

  - [x] 11.3 Migrate Sessions list component
    - Update template to use migrated DataTable component
    - Update status chips to use PrimeNG Chip
    - Update action buttons to use PrimeNG Button
    - _Requirements: 12.7, 10.1, 10.2, 10.3_

  - [x] 11.4 Migrate Sessions detail component
    - Replace MatTabsModule with TabViewModule
    - Update timeline to use TimelineModule from primeng/timeline
    - Update status display to use PrimeNG Chip
    - Update action buttons to use PrimeNG Button
    - _Requirements: 12.7_

  - [ ] 11.5 Update Sessions module unit tests
    - Update test imports and selectors
    - Test dialog opening and QR code generation
    - Test table interactions
    - Test timeline rendering
    - Verify all tests pass
    - _Requirements: 20.1, 20.2_

- [ ] 12. Phase 4: Feature Modules Migration - Webhooks Module
  - [x] 12.1 Migrate Webhooks form dialog component
    - Replace MatDialog with DynamicDialogService
    - Update dialog component to use DynamicDialogRef and DynamicDialogConfig
    - Update all form fields to use PrimeNG components with p-float-label
    - Update URL input validation display
    - Update event type dropdown to use PrimeNG Dropdown
    - Update buttons to use PrimeNG Button
    - _Requirements: 12.8, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [x] 12.2 Migrate Webhooks list component
    - Update template to use migrated DataTable component
    - Update status chips to use PrimeNG Chip
    - Update action buttons to use PrimeNG Button
    - _Requirements: 12.8, 10.1, 10.2, 10.3_

  - [x] 12.3 Migrate Webhooks logs component
    - Update template to use migrated DataTable component with row expansion
    - Implement expandable rows for detailed log view
    - Update status chips to use PrimeNG Chip
    - Update timestamp formatting
    - _Requirements: 12.8_

  - [ ] 12.4 Update Webhooks module unit tests
    - Update test imports and selectors
    - Test dialog form validation
    - Test table with expandable rows
    - Verify all tests pass
    - _Requirements: 20.1, 20.2_

- [x] 13. Checkpoint - Verify all feature modules migrated
  - Ensure all feature module tests pass
  - Verify no console errors or warnings
  - Test all user workflows end-to-end
  - Verify responsive behavior across all modules
  - Ask the user if questions arise before proceeding to validation phase


- [ ] 14. Phase 5: Testing & Validation - Property-Based Tests
  - [ ]* 14.1 Write property test for event emission preservation
    - **Property 5: Event Emission Preservation**
    - **Validates: Requirements 3.8, 6.4, 14.4**
    - Use fast-check to generate random user interactions on tables, buttons, and charts
    - Verify events emit with same payload structure as before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 3.8, 6.4, 14.4_

  - [ ]* 14.2 Write property test for API integration preservation
    - **Property 9: API Integration Preservation**
    - **Validates: Requirements 13.2, 13.3, 13.4**
    - Use fast-check to generate random API call scenarios
    - Verify request payloads, response parsing, and error handling identical
    - Run 100 iterations with fc.assert
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]* 14.3 Write property test for authentication flow preservation
    - **Property 10: Authentication Flow Preservation**
    - **Validates: Requirements 13.5**
    - Use fast-check to generate random authentication operations
    - Verify JWT token handling behaves identically
    - Run 100 iterations with fc.assert
    - _Requirements: 13.5_

  - [ ]* 14.4 Write property test for theme switching preservation
    - **Property 14: Theme Switching Preservation**
    - **Validates: Requirements 16.2**
    - Use fast-check to generate random theme selections
    - Verify all PrimeNG components apply selected theme consistently
    - Run 100 iterations with fc.assert
    - _Requirements: 16.2_

  - [ ]* 14.5 Write property test for responsive layout preservation
    - **Property 15: Responsive Layout Preservation**
    - **Validates: Requirements 17.1**
    - Use fast-check to generate random viewport widths (320px-2560px)
    - Verify layout adapts responsively in same manner as before migration
    - Run 100 iterations with fc.assert
    - _Requirements: 17.1_

  - [ ]* 14.6 Write property test for keyboard navigation preservation
    - **Property 16: Keyboard Navigation Preservation**
    - **Validates: Requirements 18.3**
    - Use fast-check to generate random keyboard interactions
    - Verify Tab, Enter, Escape, Arrow keys work identically
    - Run 100 iterations with fc.assert
    - _Requirements: 18.3_

- [ ] 15. Phase 5: Testing & Validation - Example-Based Tests
  - [ ] 15.1 Write example test for no Angular Material imports
    - Search codebase for '@angular/material' imports
    - Verify zero matches found
    - _Requirements: 1.2_

  - [ ] 15.2 Write example test for PrimeNG component usage
    - Verify only actively used PrimeNG components are imported
    - Check for unused imports in PrimeNG module
    - _Requirements: 1.4_

  - [ ] 15.3 Write example test for bundle size constraint
    - Run production build and capture bundle size
    - Compare to baseline metrics
    - Verify increase is less than 500KB
    - _Requirements: 1.5_

  - [ ] 15.4 Write example test for menu item order
    - Verify navigation menu displays items in same order
    - Check both sidebar and toolbar menus
    - _Requirements: 2.4_

  - [ ] 15.5 Write example test for column type support
    - Verify DataTable supports text, date, actions, and custom template columns
    - Test each column type renders correctly
    - _Requirements: 3.7_

  - [ ] 15.6 Write example test for loading indicator display
    - Verify loading indicator appears during data fetch
    - Test on DataTable, StatCard, and other async components
    - _Requirements: 3.9, 8.2, 8.3_

  - [ ] 15.7 Write example test for form accessibility attributes
    - Verify all form fields have appropriate ARIA attributes
    - Check labels, error messages, and required indicators
    - _Requirements: 4.8_

  - [ ] 15.8 Write example test for delete confirmation dialog
    - Verify delete actions trigger confirmation dialog
    - Test in API Keys, Webhooks, and other modules
    - _Requirements: 5.3_

  - [ ] 15.9 Write example test for stat card structure
    - Verify StatCard contains title, value, icon, and trend elements
    - Check DOM structure matches expected format
    - _Requirements: 7.3_

  - [ ] 15.10 Write example test for user menu display
    - Verify user menu displays options in same order
    - Check menu items and actions
    - _Requirements: 9.2, 9.4_

  - [ ] 15.11 Write example test for status chip styling
    - Verify status chips display with correct colors for each status type
    - Test success, warning, error, and info statuses
    - _Requirements: 10.2, 10.3_

  - [ ] 15.12 Write example test for feature module functionality
    - Verify each feature module functions correctly
    - Test Admin, Analytics, API Keys, Billing, Branding, Dashboard, Sessions, Webhooks
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [ ] 15.13 Write example test for chart type support
    - Verify all chart types render correctly
    - Test line, bar, pie, and doughnut charts
    - _Requirements: 14.3_

  - [ ] 15.14 Write example test for theme persistence
    - Verify theme preference persists across browser sessions
    - Test localStorage integration
    - _Requirements: 16.3_

  - [ ] 15.15 Write example test for responsive breakpoints
    - Verify layout adapts at mobile (320-767px), tablet (768-1023px), desktop (1024px+)
    - Test specific breakpoint behavior
    - _Requirements: 17.2, 17.3, 17.4_

  - [ ] 15.16 Write example test for ARIA attributes
    - Verify interactive elements maintain ARIA attributes
    - Test buttons, links, form fields, dialogs
    - _Requirements: 18.2_

  - [ ] 15.17 Write example test for dialog focus management
    - Verify opening dialog traps focus within dialog
    - Test Tab cycling and Escape key
    - _Requirements: 18.4_


- [ ] 16. Phase 5: Testing & Validation - E2E and Accessibility Tests
  - [ ] 16.1 Update Playwright E2E test selectors
    - Update all E2E tests to use PrimeNG CSS selectors
    - Replace .mat-* selectors with .p-* selectors
    - Update interaction patterns for PrimeNG components
    - _Requirements: 20.3_

  - [ ] 16.2 Run full Playwright E2E test suite
    - Execute all E2E tests across all feature modules
    - Verify 100% of existing E2E tests pass
    - Fix any failures related to selector or interaction changes
    - _Requirements: 20.3_

  - [ ] 16.3 Implement visual regression tests
    - Capture screenshots for all major pages
    - Compare with baseline screenshots
    - Allow minor rendering differences (maxDiffPixels: 100)
    - Document any intentional visual changes
    - _Requirements: 20.4_

  - [ ] 16.4 Implement automated accessibility tests with axe-core
    - Install @axe-core/playwright
    - Add accessibility scans to E2E tests for all pages
    - Test against WCAG 2.1 AA standards
    - Verify zero accessibility violations
    - _Requirements: 18.1, 18.2, 20.5_

  - [ ] 16.5 Perform manual keyboard navigation testing
    - Test Tab navigation through all interactive elements
    - Test Enter key activation on buttons and links
    - Test Escape key for closing dialogs and menus
    - Test Arrow keys for menu navigation
    - _Requirements: 18.3_

  - [ ] 16.6 Perform manual screen reader testing
    - Test with NVDA (Windows) or VoiceOver (Mac)
    - Verify all interactive elements are announced correctly
    - Verify form labels and error messages are read
    - Verify dialog announcements work
    - _Requirements: 18.1, 18.2_

  - [ ] 16.7 Test focus trap in dialogs
    - Verify focus stays within dialog when open
    - Test Tab cycling through dialog elements
    - Test Shift+Tab reverse cycling
    - Verify focus returns to trigger element on close
    - _Requirements: 18.4_

  - [ ] 16.8 Test color contrast compliance
    - Run axe-core color contrast checks
    - Verify all text meets WCAG AA contrast ratios
    - Test in both light and dark themes
    - _Requirements: 18.1_

  - [ ] 16.9 Implement responsive design E2E tests
    - Test at mobile viewport (375x667)
    - Test at tablet viewport (768x1024)
    - Test at desktop viewport (1920x1080)
    - Verify sidebar, toolbar, and content adapt correctly
    - Test touch gestures on mobile (if applicable)
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ] 17. Phase 5: Testing & Validation - Performance Testing
  - [ ] 17.1 Run production build and capture metrics
    - Build with --configuration=production --stats-json
    - Generate webpack bundle analyzer report
    - Capture bundle sizes for all chunks
    - _Requirements: 1.5, 19.1_

  - [ ] 17.2 Compare bundle size with baseline
    - Run bundle comparison script
    - Verify total bundle size increase is less than 500KB
    - Document any significant changes in chunk sizes
    - _Requirements: 1.5_

  - [ ] 17.3 Run Lighthouse performance audit
    - Run Lighthouse on all major pages
    - Capture performance, accessibility, best practices, SEO scores
    - Compare with baseline Lighthouse scores
    - Verify performance score maintained or improved
    - _Requirements: 19.2_

  - [ ] 17.4 Measure Core Web Vitals
    - Capture FCP (First Contentful Paint)
    - Capture LCP (Largest Contentful Paint)
    - Capture TTI (Time to Interactive)
    - Capture TBT (Total Blocking Time)
    - Capture CLS (Cumulative Layout Shift)
    - Compare with baseline metrics
    - _Requirements: 19.2_

  - [ ] 17.5 Configure CI/CD pipeline updates
    - Update GitHub Actions workflow to run all test suites
    - Add bundle size checking step
    - Add Lighthouse CI integration
    - Add accessibility testing with axe-core
    - Configure test result uploads and reporting
    - _Requirements: 20.1, 20.2, 20.3, 20.5_

- [ ] 18. Checkpoint - Verify all tests pass
  - Ensure 100% of unit tests pass
  - Ensure 100% of integration tests pass
  - Ensure 100% of E2E tests pass
  - Ensure all 16 property-based tests pass (100 iterations each)
  - Ensure all 17 example-based tests pass
  - Verify code coverage maintained or improved
  - Verify bundle size within budget
  - Verify Lighthouse scores maintained or improved
  - Verify zero accessibility violations
  - Ask the user if questions arise before proceeding to cleanup


- [ ] 19. Phase 6: Cleanup & Documentation
  - [ ] 19.1 Remove Angular Material dependencies
    - Run `npm uninstall @angular/material @angular/cdk`
    - Search codebase for any remaining @angular/material imports
    - Remove any commented-out Material code
    - Remove Material theme imports from angular.json
    - _Requirements: 1.2_

  - [ ] 19.2 Remove reference implementations used for testing
    - Delete DataTableReference class and other reference implementations
    - Remove deprecated methods marked for testing only
    - Clean up any temporary comparison code
    - _Requirements: 20.1_

  - [ ] 19.3 Search and remove remaining Material CSS classes
    - Search for .mat-* classes in all CSS/SCSS files
    - Update or remove custom CSS targeting Material components
    - Verify no Material-specific styles remain
    - _Requirements: 1.2_

  - [ ] 19.4 Update README.md
    - Update installation instructions
    - Document PrimeNG as the UI component library
    - Add links to PrimeNG documentation and showcase
    - Update development and theming sections
    - _Requirements: 21.1_

  - [ ] 19.5 Create MIGRATION_GUIDE.md
    - Document breaking changes in dialog API
    - Document form field structure changes
    - Document event payload differences
    - Document component mapping table
    - Document icon migration
    - Document styling changes
    - Provide code examples for common patterns
    - _Requirements: 21.2_

  - [ ] 19.6 Create PRIMENG_TRAINING.md
    - Document key differences between Material and PrimeNG
    - Provide component import patterns
    - Provide template syntax examples
    - Document common patterns (forms, dialogs, tables)
    - Add links to resources and internal guides
    - _Requirements: 21.3_

  - [ ] 19.7 Create PRIMENG_CODE_REVIEW.md
    - Create code review checklist for PrimeNG components
    - Document what reviewers should check (imports, templates, styling, functionality, testing, documentation)
    - Provide examples of good and bad patterns
    - _Requirements: 21.4_

  - [ ] 19.8 Create PRIMENG_PITFALLS.md
    - Document common migration pitfalls
    - Provide solutions for event payload differences
    - Provide solutions for dialog API differences
    - Provide solutions for form field structure changes
    - Provide solutions for icon name mapping
    - Provide solutions for CSS class conflicts
    - _Requirements: 21.5_

  - [ ] 19.9 Update component documentation
    - Update all component examples to use PrimeNG
    - Add migration notes for developers
    - Document any API differences from original implementation
    - _Requirements: 21.1_

  - [ ] 19.10 Final verification and cleanup
    - Run full test suite one final time
    - Verify no console errors or warnings
    - Verify all documentation is accurate and complete
    - Remove any temporary files or scripts
    - Remove baseline comparison files (or archive them)
    - _Requirements: 20.1, 20.2, 20.3_

- [ ] 20. Final Checkpoint - Migration Complete
  - Verify all acceptance criteria met:
    - ✅ All unit tests pass (100% of existing tests)
    - ✅ All integration tests pass
    - ✅ All E2E tests pass (100% of existing tests)
    - ✅ All property-based tests pass (100 iterations each)
    - ✅ Code coverage maintained or improved
    - ✅ Bundle size increase <500KB
    - ✅ Lighthouse performance score maintained or improved
    - ✅ No Angular Material imports remain in codebase
    - ✅ All feature modules migrated and tested
    - ✅ Documentation updated
  - Migration is complete and ready for deployment

## Notes

- Tasks marked with `*` are optional property-based and example-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100 iterations each
- Example tests validate specific scenarios and edge cases
- All tests must pass before proceeding to production deployment
- The migration maintains 100% feature parity with zero breaking changes to functionality
