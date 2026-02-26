# Design Document: PrimeNG Dashboard Migration

## Overview

This design document specifies the technical approach for migrating the VeraProof AI partner dashboard from Angular Material to PrimeNG. The migration will be executed in a phased, module-by-module approach to minimize risk while maintaining 100% feature parity and zero breaking changes.

### Goals

- Replace Angular Material with PrimeNG as the UI component library
- Maintain all existing functionality and user experience
- Improve visual design with PrimeNG's enterprise design system
- Keep bundle size increase under 500KB
- Ensure zero breaking changes to API integrations
- Preserve all existing tests and achieve same or better coverage

### Non-Goals

- Redesigning user workflows or feature functionality
- Modifying backend API contracts
- Changing authentication or authorization logic
- Rewriting business logic or service layer code

### Technology Stack

- **Angular**: 17.0.0 (current)
- **PrimeNG**: 17.x (compatible with Angular 17)
- **PrimeIcons**: Latest compatible version
- **Chart.js**: 4.4.0 (maintained)
- **ng2-charts**: 5.0.0 (maintained)
- **QRCode**: 1.5.4 (maintained)
- **fast-check**: 4.5.3 (maintained for property-based testing)

## Architecture

### High-Level Migration Strategy

The migration follows a bottom-up approach:

1. **Foundation Layer**: Install PrimeNG, configure themes, set up build optimization
2. **Shared Components**: Migrate reusable components used across all modules
3. **Layout Layer**: Migrate structural components (toolbar, sidebar, main layout)
4. **Feature Modules**: Migrate each feature module independently
5. **Validation & Cleanup**: Run full test suite, remove Angular Material dependencies

### Component Dependency Graph

```
┌─────────────────────────────────────────┐
│         Feature Modules                 │
│  (Admin, Analytics, API Keys, etc.)     │
└──────────────┬──────────────────────────┘
               │ depends on
┌──────────────▼──────────────────────────┐
│         Layout Components               │
│  (MainLayout, Toolbar, Sidebar)         │
└──────────────┬──────────────────────────┘
               │ depends on
┌──────────────▼──────────────────────────┐
│         Shared Components               │
│  (StatCard, DataTable, Dialogs, etc.)   │
└──────────────┬──────────────────────────┘
               │ depends on
┌──────────────▼──────────────────────────┐
│         PrimeNG Foundation              │
│  (Theme, Icons, Core Modules)           │
└─────────────────────────────────────────┘
```

### Module Structure

The dashboard is organized into the following modules:

- **Core Module**: Services, guards, interceptors, models
- **Shared Module**: Reusable components, directives, pipes
- **Layout Module**: Main layout, toolbar, sidebar
- **Feature Modules**:
  - Admin (platform stats, tenant management)
  - Analytics (overview, outcome charts, usage charts)
  - API Keys (create, list)
  - Billing (invoices, plan comparison, subscription overview)
  - Branding (editor, preview)
  - Dashboard (overview)
  - Sessions (create, list)
  - Webhooks (form, list, logs)

### Coexistence Strategy

During migration, Angular Material and PrimeNG will coexist:

- Both libraries will be installed simultaneously
- Modules will be migrated one at a time
- Each module will use either Angular Material OR PrimeNG (no mixing within a module)
- Once all modules are migrated, Angular Material will be removed

## Components and Interfaces

### Component Mapping Table

| Angular Material | PrimeNG Equivalent | Migration Notes |
|-----------------|-------------------|-----------------|
| MatSidenavModule | Sidebar | Different API for toggle/state management |
| MatToolbarModule | Toolbar | Similar API, minimal changes |
| MatTableModule | Table | Rich feature set, supports all existing functionality |
| MatPaginatorModule | Paginator | Built into Table component |
| MatSortModule | Table (sorting) | Built into Table component |
| MatFormFieldModule | FloatLabel | Different wrapper approach |
| MatInputModule | InputText | Direct replacement |
| MatSelectModule | Dropdown | Different event API |
| MatCheckboxModule | Checkbox | Similar API |
| MatRadioModule | RadioButton | Similar API |
| MatDialogModule | Dialog | Different service API |
| MatButtonModule | Button | Similar API with different style classes |
| MatIconModule | PrimeIcons / Material Icons | Can maintain Material Icons if preferred |
| MatCardModule | Card | Similar API |
| MatProgressSpinnerModule | ProgressSpinner | Similar API |
| MatMenuModule | Menu / TieredMenu | Different structure for nested menus |
| MatChipsModule | Chip / Tag | Similar API |
| MatDividerModule | Divider | Direct replacement |

### Shared Components Migration

#### 1. StatCard Component

**Current Implementation**: Uses MatCardModule

**New Implementation**: Uses PrimeNG Card

**Interface**:
```typescript
@Input() title: string;
@Input() value: string | number;
@Input() icon: string;
@Input() trend?: { value: number; direction: 'up' | 'down' };
@Input() loading: boolean = false;
```

**Migration Changes**:
- Replace `<mat-card>` with `<p-card>`
- Update CSS classes to use PrimeNG styling
- Maintain exact same input/output interface
- Preserve loading state with PrimeNG ProgressSpinner

#### 2. DataTable Component

**Current Implementation**: Uses MatTableModule, MatPaginatorModule, MatSortModule

**New Implementation**: Uses PrimeNG Table with built-in pagination and sorting

**Interface**:
```typescript
@Input() columns: TableColumn[];
@Input() data: any[];
@Input() loading: boolean = false;
@Input() pageSizeOptions: number[] = [10, 25, 50, 100];
@Input() defaultPageSize: number = 10;
@Output() rowAction: EventEmitter<{ action: string; row: any }>;
@Output() sortChange: EventEmitter<{ field: string; order: 'asc' | 'desc' }>;
@Output() pageChange: EventEmitter<{ pageIndex: number; pageSize: number }>;
```

**Migration Changes**:
- Replace MatTable with PrimeNG Table (`<p-table>`)
- Use built-in `[paginator]` and `[sortField]` properties
- Map column definitions to PrimeNG column format
- Preserve all event emissions with same payload structure
- Maintain loading state with `[loading]` property

#### 3. LoadingSpinner Component

**Current Implementation**: Uses MatProgressSpinnerModule

**New Implementation**: Uses PrimeNG ProgressSpinner

**Interface**:
```typescript
@Input() diameter: number = 50;
@Input() message?: string;
```

**Migration Changes**:
- Replace `<mat-spinner>` with `<p-progressSpinner>`
- Map diameter to PrimeNG `[style]` property
- Maintain same visual appearance

#### 4. ConfirmationDialog Component

**Current Implementation**: Uses MatDialogModule

**New Implementation**: Uses PrimeNG ConfirmDialog service

**Interface**:
```typescript
// Service method
confirm(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}): Observable<boolean>;
```

**Migration Changes**:
- Replace MatDialog service with ConfirmationService
- Update service method to use PrimeNG API
- Maintain same return type (Observable<boolean>)
- Preserve all dialog options

### Layout Components Migration

#### 1. MainLayout Component

**Current Implementation**: Uses MatSidenavModule

**New Implementation**: Uses PrimeNG Sidebar

**Changes**:
- Replace `<mat-sidenav-container>` with custom layout using `<p-sidebar>`
- Update toggle logic to use PrimeNG Sidebar API
- Maintain responsive behavior with CSS media queries
- Preserve routing outlet and content projection

#### 2. Toolbar Component

**Current Implementation**: Uses MatToolbarModule

**New Implementation**: Uses PrimeNG Toolbar

**Changes**:
- Replace `<mat-toolbar>` with `<p-toolbar>`
- Update template structure to use PrimeNG slots (start, center, end)
- Maintain all toolbar actions (menu toggle, user menu, theme toggle)
- Preserve responsive behavior

#### 3. Sidebar Component

**Current Implementation**: Uses MatListModule for navigation

**New Implementation**: Uses PrimeNG Menu

**Changes**:
- Replace `<mat-nav-list>` with `<p-menu>`
- Convert navigation items to PrimeNG MenuItem[] format
- Maintain active route highlighting
- Preserve icon and label display

### Form Components Pattern

All forms will follow this migration pattern:

#### Text Input

**Before (Angular Material)**:
```html
<mat-form-field>
  <mat-label>Label</mat-label>
  <input matInput [(ngModel)]="value">
  <mat-error *ngIf="error">Error message</mat-error>
</mat-form-field>
```

**After (PrimeNG)**:
```html
<span class="p-float-label">
  <input pInputText [(ngModel)]="value" [class.ng-invalid]="error">
  <label>Label</label>
</span>
<small *ngIf="error" class="p-error">Error message</small>
```

#### Textarea

**Before (Angular Material)**:
```html
<mat-form-field>
  <mat-label>Description</mat-label>
  <textarea matInput [(ngModel)]="description" rows="4"></textarea>
  <mat-error *ngIf="error">Error message</mat-error>
</mat-form-field>
```

**After (PrimeNG)**:
```html
<span class="p-float-label">
  <textarea pInputTextarea [(ngModel)]="description" rows="4" [class.ng-invalid]="error"></textarea>
  <label>Description</label>
</span>
<small *ngIf="error" class="p-error">Error message</small>
```

#### Dropdown/Select

**Before (Angular Material)**:
```html
<mat-form-field>
  <mat-label>Select Option</mat-label>
  <mat-select [(ngModel)]="selectedValue">
    <mat-option *ngFor="let option of options" [value]="option.value">
      {{ option.label }}
    </mat-option>
  </mat-select>
</mat-form-field>
```

**After (PrimeNG)**:
```html
<span class="p-float-label">
  <p-dropdown 
    [(ngModel)]="selectedValue" 
    [options]="options" 
    optionLabel="label" 
    optionValue="value">
  </p-dropdown>
  <label>Select Option</label>
</span>
```

#### Checkbox

**Before (Angular Material)**:
```html
<mat-checkbox [(ngModel)]="checked">
  Enable feature
</mat-checkbox>
```

**After (PrimeNG)**:
```html
<p-checkbox 
  [(ngModel)]="checked" 
  [binary]="true" 
  label="Enable feature">
</p-checkbox>
```

#### Radio Buttons

**Before (Angular Material)**:
```html
<mat-radio-group [(ngModel)]="selectedOption">
  <mat-radio-button value="option1">Option 1</mat-radio-button>
  <mat-radio-button value="option2">Option 2</mat-radio-button>
</mat-radio-group>
```

**After (PrimeNG)**:
```html
<div class="radio-group">
  <p-radioButton 
    [(ngModel)]="selectedOption" 
    value="option1" 
    label="Option 1">
  </p-radioButton>
  <p-radioButton 
    [(ngModel)]="selectedOption" 
    value="option2" 
    label="Option 2">
  </p-radioButton>
</div>
```

#### Date Picker (if used)

**Before (Angular Material)**:
```html
<mat-form-field>
  <mat-label>Select Date</mat-label>
  <input matInput [matDatepicker]="picker" [(ngModel)]="selectedDate">
  <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>
```

**After (PrimeNG)**:
```html
<span class="p-float-label">
  <p-calendar 
    [(ngModel)]="selectedDate" 
    [showIcon]="true" 
    dateFormat="yy-mm-dd">
  </p-calendar>
  <label>Select Date</label>
</span>
```

#### File Upload (if used)

**Before (Angular Material)**:
```html
<input type="file" (change)="onFileSelected($event)" #fileInput>
<button mat-raised-button (click)="fileInput.click()">
  <mat-icon>upload</mat-icon>
  Upload File
</button>
```

**After (PrimeNG)**:
```html
<p-fileUpload 
  mode="basic" 
  chooseLabel="Upload File" 
  [auto]="true"
  (onSelect)="onFileSelected($event)">
</p-fileUpload>
```

### Dialog Pattern

#### Confirmation Dialogs

**Before (Angular Material)**:
```typescript
const dialogRef = this.dialog.open(ConfirmationDialogComponent, { data });
dialogRef.afterClosed().subscribe(result => { });
```

**After (PrimeNG)**:
```typescript
this.confirmationService.confirm({
  message: 'Are you sure?',
  accept: () => { },
  reject: () => { }
});
```

#### Custom Dialogs (Forms, Details)

**Before (Angular Material)**:
```typescript
const dialogRef = this.dialog.open(ApiKeyCreateDialogComponent, {
  width: '600px',
  data: { tenantId: this.tenantId }
});

dialogRef.afterClosed().subscribe(result => {
  if (result) {
    this.loadApiKeys();
  }
});
```

**After (PrimeNG)**:
```typescript
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';

const ref: DynamicDialogRef = this.dialogService.open(ApiKeyCreateDialogComponent, {
  header: 'Create API Key',
  width: '600px',
  data: { tenantId: this.tenantId }
});

ref.onClose.subscribe((result) => {
  if (result) {
    this.loadApiKeys();
  }
});
```

**Component Changes**:
```typescript
// Before - Component receives data via MAT_DIALOG_DATA
constructor(
  public dialogRef: MatDialogRef<ApiKeyCreateDialogComponent>,
  @Inject(MAT_DIALOG_DATA) public data: any
) {}

close(result?: any) {
  this.dialogRef.close(result);
}

// After - Component receives data via DynamicDialogConfig
constructor(
  public ref: DynamicDialogRef,
  public config: DynamicDialogConfig
) {
  this.data = config.data;
}

close(result?: any) {
  this.ref.close(result);
}
```

## Data Models

No changes to data models are required. All existing interfaces, types, and models will remain unchanged:

- API request/response models
- Domain models (Session, Webhook, ApiKey, etc.)
- Form models and validation schemas
- Chart data models

The migration is purely a UI component library change and does not affect the data layer.

## CSS and Styling Migration Strategy

### Global Styles Migration

#### 1. Material Design Theme Variables

**Before (Angular Material)**:
```css
/* styles.css */
@import '@angular/material/prebuilt-themes/indigo-pink.css';

:root {
  --primary-color: #3f51b5;
  --accent-color: #ff4081;
}
```

**After (PrimeNG)**:
```css
/* styles.css */
@import 'primeng/resources/themes/lara-light-blue/theme.css';
@import 'primeng/resources/primeng.css';
@import 'primeicons/primeicons.css';

:root {
  --primary-color: var(--blue-500);
  --accent-color: var(--pink-500);
}
```

#### 2. Component-Specific Style Migration

**Strategy**:
- Audit all custom CSS that targets Angular Material classes
- Create a mapping document of Material classes to PrimeNG equivalents
- Use CSS scoping during coexistence to prevent conflicts

**Material to PrimeNG Class Mapping**:

| Angular Material Class | PrimeNG Equivalent | Notes |
|------------------------|-------------------|-------|
| `.mat-card` | `.p-card` | Direct replacement |
| `.mat-table` | `.p-datatable` | Different structure |
| `.mat-header-cell` | `.p-datatable-thead th` | Nested differently |
| `.mat-cell` | `.p-datatable-tbody td` | Nested differently |
| `.mat-button` | `.p-button` | Similar structure |
| `.mat-raised-button` | `.p-button.p-button-raised` | Add modifier class |
| `.mat-form-field` | `.p-float-label` | Different wrapper |
| `.mat-error` | `.p-error` | Direct replacement |
| `.mat-toolbar` | `.p-toolbar` | Direct replacement |
| `.mat-sidenav` | `.p-sidebar` | Different API |
| `.mat-menu` | `.p-menu` | Different structure |
| `.mat-chip` | `.p-chip` | Direct replacement |

#### 3. Custom CSS Refactoring

**File**: `src/styles.css`

**Before**:
```css
/* Custom styles targeting Material components */
.mat-card.stat-card {
  padding: 24px;
  margin-bottom: 16px;
}

.mat-table {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.mat-form-field {
  width: 100%;
}
```

**After**:
```css
/* Custom styles targeting PrimeNG components */
.p-card.stat-card {
  padding: 24px;
  margin-bottom: 16px;
}

.p-datatable {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.p-float-label {
  width: 100%;
}
```

#### 4. Coexistence Scoping Strategy

During migration, use CSS specificity to isolate styles:

```css
/* Scope for migrated components */
.primeng-component .p-button {
  /* PrimeNG button styles */
}

/* Scope for legacy components */
.material-component .mat-button {
  /* Angular Material button styles */
}
```

### Theme Customization

#### PrimeNG Theme Variables

Create a custom theme file to match VeraProof AI branding:

**File**: `src/theme.css`

```css
:root {
  /* Primary Colors */
  --primary-color: #1976d2;
  --primary-color-text: #ffffff;
  
  /* Surface Colors */
  --surface-0: #ffffff;
  --surface-50: #fafafa;
  --surface-100: #f5f5f5;
  --surface-200: #eeeeee;
  
  /* Text Colors */
  --text-color: rgba(0, 0, 0, 0.87);
  --text-color-secondary: rgba(0, 0, 0, 0.6);
  
  /* Border */
  --surface-border: #e0e0e0;
  
  /* Focus */
  --focus-ring: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
}

/* Dark theme */
[data-theme="dark"] {
  --primary-color: #64b5f6;
  --surface-0: #121212;
  --surface-50: #1e1e1e;
  --text-color: rgba(255, 255, 255, 0.87);
  --text-color-secondary: rgba(255, 255, 255, 0.6);
  --surface-border: #424242;
}
```

### Animation Migration

Angular Material uses Angular animations extensively. PrimeNG has built-in animations.

#### Transition Animations

**Before (Angular Material)**:
```typescript
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0)' }))
      ])
    ])
  ]
})
```

**After (PrimeNG)**:
```typescript
// PrimeNG components have built-in animations
// For custom animations, use CSS transitions

// styles.css
.slide-in-enter {
  animation: slideIn 300ms ease-in;
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

## Icon Migration Strategy

### Decision Criteria

**Option 1: Migrate to PrimeIcons**
- Pros: Consistent with PrimeNG design system, smaller bundle size
- Cons: Requires icon name mapping, may not have all Material icons

**Option 2: Keep Material Icons**
- Pros: No icon mapping needed, familiar to users
- Cons: Additional dependency, larger bundle size

**Recommendation**: Migrate to PrimeIcons for consistency and bundle size optimization.

### Icon Mapping Table

| Material Icon | PrimeIcon Equivalent | Usage |
|--------------|---------------------|-------|
| `dashboard` | `pi pi-home` | Dashboard navigation |
| `analytics` | `pi pi-chart-line` | Analytics navigation |
| `vpn_key` | `pi pi-key` | API Keys |
| `receipt` | `pi pi-file` | Billing/Invoices |
| `palette` | `pi pi-palette` | Branding |
| `people` | `pi pi-users` | Tenant management |
| `settings` | `pi pi-cog` | Settings |
| `account_circle` | `pi pi-user` | User profile |
| `menu` | `pi pi-bars` | Menu toggle |
| `close` | `pi pi-times` | Close/Cancel |
| `check` | `pi pi-check` | Confirm/Success |
| `delete` | `pi pi-trash` | Delete action |
| `edit` | `pi pi-pencil` | Edit action |
| `add` | `pi pi-plus` | Add/Create |
| `search` | `pi pi-search` | Search |
| `filter_list` | `pi pi-filter` | Filter |
| `refresh` | `pi pi-refresh` | Refresh |
| `download` | `pi pi-download` | Download |
| `upload` | `pi pi-upload` | Upload |
| `visibility` | `pi pi-eye` | View/Show |
| `visibility_off` | `pi pi-eye-slash` | Hide |
| `info` | `pi pi-info-circle` | Information |
| `warning` | `pi pi-exclamation-triangle` | Warning |
| `error` | `pi pi-times-circle` | Error |
| `check_circle` | `pi pi-check-circle` | Success |

### Icon Migration Implementation

**Before (Angular Material)**:
```html
<mat-icon>dashboard</mat-icon>
<button mat-icon-button>
  <mat-icon>menu</mat-icon>
</button>
```

**After (PrimeIcons)**:
```html
<i class="pi pi-home"></i>
<p-button icon="pi pi-bars" [text]="true"></p-button>
```

**Component Changes**:
```typescript
// Before
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [MatIconModule]
})

// After
// No import needed, PrimeIcons are CSS-based
@Component({
  // Remove MatIconModule
})
```

### Fallback for Missing Icons

If a Material icon has no PrimeIcon equivalent:

1. **Option A**: Use closest PrimeIcon alternative
2. **Option B**: Keep Material Icons for specific icons only
3. **Option C**: Use custom SVG icons

```typescript
// Custom icon registration (if needed)
import { PrimeIcons } from 'primeng/api';

// Add custom icon
PrimeIcons['custom-icon'] = 'path/to/icon.svg';
```

## Technical Implementation

### Phase 1: Setup & Foundation

#### 1.1 Install PrimeNG Dependencies

```bash
npm install primeng@^17.0.0 primeicons@^7.0.0
```

#### 1.2 Configure angular.json

Add PrimeNG styles and theme to the build configuration:

```json
{
  "styles": [
    "node_modules/primeicons/primeicons.css",
    "node_modules/primeng/resources/themes/lara-light-blue/theme.css",
    "node_modules/primeng/resources/primeng.min.css",
    "src/styles.css"
  ]
}
```

#### 1.3 Theme Configuration

Create a theme service to manage light/dark mode switching:

**src/app/core/services/theme.service.ts**:
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private currentTheme = signal<'light' | 'dark'>('light');
  
  switchTheme(theme: 'light' | 'dark'): void {
    const themeLink = document.getElementById('app-theme') as HTMLLinkElement;
    themeLink.href = `lara-${theme}-blue/theme.css`;
    this.currentTheme.set(theme);
    localStorage.setItem('theme', theme);
  }
  
  loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    this.switchTheme(savedTheme);
  }
}
```

#### 1.4 Tree-Shaking Configuration

PrimeNG supports tree-shaking by default when using standalone components or importing specific modules. Ensure imports are granular:

```typescript
// Good - imports only what's needed
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

// Avoid - imports everything
import * as PrimeNG from 'primeng';
```

#### 1.5 Build Optimization

Update `angular.json` production configuration:

```json
{
  "optimization": {
    "scripts": true,
    "styles": {
      "minify": true,
      "inlineCritical": true
    },
    "fonts": true
  },
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "2.5mb"
    }
  ]
}
```

### Phase 2: Shared Components Migration

#### 2.1 StatCard Component

**File**: `src/app/shared/components/stat-card/stat-card.component.ts`

**Changes**:
1. Replace `MatCardModule` import with `CardModule` from 'primeng/card'
2. Update template to use `<p-card>`
3. Add PrimeNG styling classes
4. Maintain all existing inputs/outputs

**Template Changes**:
```html
<!-- Before -->
<mat-card class="stat-card">
  <mat-card-header>
    <mat-card-title>{{ title }}</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="stat-value">{{ value }}</div>
  </mat-card-content>
</mat-card>

<!-- After -->
<p-card styleClass="stat-card">
  <ng-template pTemplate="header">
    <div class="card-header">{{ title }}</div>
  </ng-template>
  <ng-template pTemplate="content">
    <div class="stat-value">{{ value }}</div>
  </ng-template>
</p-card>
```

#### 2.2 DataTable Component

**File**: `src/app/shared/components/data-table/data-table.component.ts`

**Changes**:
1. Replace Angular Material table imports with `TableModule` from 'primeng/table'
2. Update template to use `<p-table>`
3. Map column definitions to PrimeNG format
4. Preserve all event emissions
5. Add support for advanced features (selection, expansion, etc.)

**Template Changes**:
```html
<!-- Before -->
<table mat-table [dataSource]="data" matSort>
  <ng-container *ngFor="let col of columns" [matColumnDef]="col.field">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ col.header }}</th>
    <td mat-cell *matCellDef="let row">{{ row[col.field] }}</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
</table>
<mat-paginator [pageSizeOptions]="pageSizeOptions"></mat-paginator>

<!-- After -->
<p-table 
  [value]="data" 
  [columns]="columns"
  [paginator]="true" 
  [rows]="defaultPageSize"
  [rowsPerPageOptions]="pageSizeOptions"
  [loading]="loading"
  [resizableColumns]="true"
  [reorderableColumns]="true"
  [(selection)]="selectedRows"
  [selectionMode]="selectionMode"
  (onSort)="onSortChange($event)"
  (onPage)="onPageChange($event)"
  (onRowSelect)="onRowSelect($event)"
  (onRowUnselect)="onRowUnselect($event)">
  
  <!-- Selection column (if enabled) -->
  <ng-template pTemplate="header" let-columns>
    <tr>
      <th *ngIf="selectionMode" style="width: 3rem">
        <p-tableHeaderCheckbox *ngIf="selectionMode === 'multiple'"></p-tableHeaderCheckbox>
      </th>
      <th *ngFor="let col of columns" 
          [pSortableColumn]="col.sortable ? col.field : null"
          [pResizableColumn]="col.resizable"
          [pReorderableColumn]="col.reorderable">
        {{ col.header }}
        <p-sortIcon *ngIf="col.sortable" [field]="col.field"></p-sortIcon>
      </th>
      <th *ngIf="hasActions">Actions</th>
    </tr>
  </ng-template>
  
  <ng-template pTemplate="body" let-row let-columns="columns" let-expanded="expanded">
    <tr [pSelectableRow]="row">
      <td *ngIf="selectionMode">
        <p-tableCheckbox [value]="row" *ngIf="selectionMode === 'multiple'"></p-tableCheckbox>
        <p-tableRadioButton [value]="row" *ngIf="selectionMode === 'single'"></p-tableRadioButton>
      </td>
      <td *ngFor="let col of columns">
        <!-- Custom template support -->
        <ng-container *ngIf="col.template; else defaultCell">
          <ng-container *ngTemplateOutlet="col.template; context: { $implicit: row, field: col.field }"></ng-container>
        </ng-container>
        <ng-template #defaultCell>
          {{ row[col.field] }}
        </ng-template>
      </td>
      <td *ngIf="hasActions">
        <ng-container *ngTemplateOutlet="actionsTemplate; context: { $implicit: row }"></ng-container>
      </td>
    </tr>
  </ng-template>
  
  <!-- Row expansion template (if enabled) -->
  <ng-template pTemplate="rowexpansion" let-row>
    <tr>
      <td [attr.colspan]="columns.length + (selectionMode ? 1 : 0) + (hasActions ? 1 : 0)">
        <ng-container *ngTemplateOutlet="expansionTemplate; context: { $implicit: row }"></ng-container>
      </td>
    </tr>
  </ng-template>
  
  <!-- Empty state -->
  <ng-template pTemplate="emptymessage">
    <tr>
      <td [attr.colspan]="columns.length + (selectionMode ? 1 : 0) + (hasActions ? 1 : 0)">
        No records found
      </td>
    </tr>
  </ng-template>
</p-table>
```

**Component Interface Updates**:
```typescript
export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  resizable?: boolean;
  reorderable?: boolean;
  template?: TemplateRef<any>;
}

@Component({
  // ... existing inputs
  @Input() selectionMode?: 'single' | 'multiple';
  @Input() resizableColumns: boolean = false;
  @Input() reorderableColumns: boolean = false;
  @Input() actionsTemplate?: TemplateRef<any>;
  @Input() expansionTemplate?: TemplateRef<any>;
  
  @Output() rowSelect = new EventEmitter<any>();
  @Output() rowUnselect = new EventEmitter<any>();
  
  selectedRows: any[] = [];
})
```

#### 2.3 LoadingSpinner Component

**File**: `src/app/shared/components/loading-spinner/loading-spinner.component.ts`

**Changes**:
1. Replace `MatProgressSpinnerModule` with `ProgressSpinnerModule` from 'primeng/progressspinner'
2. Update template to use `<p-progressSpinner>`

**Template Changes**:
```html
<!-- Before -->
<div class="loading-container">
  <mat-spinner [diameter]="diameter"></mat-spinner>
  <p *ngIf="message">{{ message }}</p>
</div>

<!-- After -->
<div class="loading-container">
  <p-progressSpinner 
    [style]="{ width: diameter + 'px', height: diameter + 'px' }"
    strokeWidth="4">
  </p-progressSpinner>
  <p *ngIf="message">{{ message }}</p>
</div>
```

#### 2.4 ConfirmationDialog Service

**File**: `src/app/shared/services/confirmation-dialog.service.ts`

**Changes**:
1. Replace `MatDialog` with `ConfirmationService` from 'primeng/api'
2. Add `ConfirmDialogModule` to app imports
3. Update service method to use PrimeNG API

**Service Changes**:
```typescript
// Before
@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  constructor(private dialog: MatDialog) {}
  
  confirm(options: ConfirmOptions): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: options
    });
    return dialogRef.afterClosed();
  }
}

// After
@Injectable({ providedIn: 'root' })
export class ConfirmationDialogService {
  constructor(private confirmationService: ConfirmationService) {}
  
  confirm(options: ConfirmOptions): Observable<boolean> {
    return new Observable(observer => {
      this.confirmationService.confirm({
        message: options.message,
        header: options.title,
        acceptLabel: options.confirmText || 'Confirm',
        rejectLabel: options.cancelText || 'Cancel',
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
```

### Phase 3: Layout Components Migration

#### 3.1 MainLayout Component

**File**: `src/app/layout/main-layout/main-layout.component.ts`

**Changes**:
1. Replace `MatSidenavModule` with `SidebarModule` from 'primeng/sidebar'
2. Update template structure
3. Maintain responsive behavior

**Template Changes**:
```html
<!-- Before -->
<mat-sidenav-container>
  <mat-sidenav #sidenav mode="side" opened>
    <app-sidebar></app-sidebar>
  </mat-sidenav>
  <mat-sidenav-content>
    <app-toolbar (menuToggle)="sidenav.toggle()"></app-toolbar>
    <main>
      <router-outlet></router-outlet>
    </main>
  </mat-sidenav-content>
</mat-sidenav-container>

<!-- After -->
<div class="layout-container">
  <p-sidebar [(visible)]="sidebarVisible" [modal]="false" [showCloseIcon]="false">
    <app-sidebar></app-sidebar>
  </p-sidebar>
  
  <div class="layout-content">
    <app-toolbar (menuToggle)="toggleSidebar()"></app-toolbar>
    <main>
      <router-outlet></router-outlet>
    </main>
  </div>
</div>
```

#### 3.2 Toolbar Component

**File**: `src/app/layout/toolbar/toolbar.component.ts`

**Changes**:
1. Replace `MatToolbarModule` with `ToolbarModule` from 'primeng/toolbar'
2. Update template to use PrimeNG slots

**Template Changes**:
```html
<!-- Before -->
<mat-toolbar color="primary">
  <button mat-icon-button (click)="onMenuToggle()">
    <mat-icon>menu</mat-icon>
  </button>
  <span>VeraProof AI</span>
  <span class="spacer"></span>
  <button mat-icon-button [matMenuTriggerFor]="userMenu">
    <mat-icon>account_circle</mat-icon>
  </button>
</mat-toolbar>

<!-- After -->
<p-toolbar styleClass="app-toolbar">
  <ng-template pTemplate="start">
    <p-button 
      icon="pi pi-bars" 
      (onClick)="onMenuToggle()"
      [text]="true">
    </p-button>
    <span class="app-title">VeraProof AI</span>
  </ng-template>
  
  <ng-template pTemplate="end">
    <p-button 
      icon="pi pi-user" 
      (onClick)="userMenu.toggle($event)"
      [text]="true">
    </p-button>
    <p-menu #userMenu [model]="userMenuItems" [popup]="true"></p-menu>
  </ng-template>
</p-toolbar>
```

#### 3.3 Sidebar Component

**File**: `src/app/layout/sidebar/sidebar.component.ts`

**Changes**:
1. Replace `MatListModule` with `MenuModule` from 'primeng/menu'
2. Convert navigation items to MenuItem[] format

**Component Changes**:
```typescript
// Before
navItems = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Analytics', icon: 'analytics', route: '/analytics' },
  // ...
];

// After
import { MenuItem } from 'primeng/api';

navItems: MenuItem[] = [
  { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  { label: 'Analytics', icon: 'pi pi-chart-line', routerLink: '/analytics' },
  // ...
];
```

### Phase 4: Feature Modules Migration

Each feature module will be migrated following the same pattern:

1. **Identify all Angular Material components** used in the module
2. **Replace with PrimeNG equivalents** using the component mapping table
3. **Update templates** to use PrimeNG syntax
4. **Update component logic** if event APIs differ
5. **Update styles** to use PrimeNG CSS classes
6. **Run unit tests** and fix any failures
7. **Run E2E tests** for the module
8. **Commit changes** with descriptive message

#### Migration Order

1. Admin Module
2. Analytics Module
3. API Keys Module
4. Billing Module
5. Branding Module
6. Dashboard Module
7. Sessions Module
8. Webhooks Module

#### Per-Module Checklist

- [ ] Replace all Angular Material imports with PrimeNG imports
- [ ] Update all templates to use PrimeNG components
- [ ] Update component logic for API differences
- [ ] Update styles to use PrimeNG classes
- [ ] Update custom CSS targeting Material classes
- [ ] Migrate all dialog components to DynamicDialog
- [ ] Update icon references (Material Icons → PrimeIcons)
- [ ] Run unit tests (`ng test --include='**/[module-name]/**/*.spec.ts'`)
- [ ] Run E2E tests for module features
- [ ] Verify no console errors or warnings
- [ ] Verify visual appearance matches design
- [ ] Test responsive behavior on mobile/tablet/desktop
- [ ] Test keyboard navigation and accessibility
- [ ] Commit changes to feature branch
- [ ] Create PR with migration checklist

#### Module-Specific Migration Notes

**Admin Module**:
- Tenant list uses data table with row actions
- Platform stats uses stat cards
- Tenant detail uses tabs and forms

**Analytics Module**:
- Chart.js integration must be preserved
- Date range picker for filtering
- Export functionality (if exists)

**API Keys Module**:
- Create dialog uses custom form
- List uses data table with copy-to-clipboard action
- Confirmation dialog for deletion

**Billing Module**:
- Invoice list uses data table
- Plan comparison uses cards
- Subscription overview uses stat cards and progress indicators

**Branding Module**:
- Color picker component (if exists)
- File upload for logo
- Live preview panel

**Dashboard Module**:
- Multiple stat cards
- Recent activity list
- Quick actions menu

**Sessions Module**:
- Create dialog with QR code generation
- List uses data table with status chips
- Detail view with timeline

**Webhooks Module**:
- Form dialog for create/edit
- List uses data table
- Logs use data table with status chips and expandable rows

### Phase 5: Testing & Validation

#### 5.1 Unit Test Updates

For each migrated component, update unit tests:

```typescript
// Before
import { MatTableModule } from '@angular/material/table';

TestBed.configureTestingModule({
  imports: [MatTableModule],
  // ...
});

// After
import { TableModule } from 'primeng/table';

TestBed.configureTestingModule({
  imports: [TableModule],
  // ...
});
```

#### 5.2 E2E Test Verification

Run full Playwright test suite:

```bash
npm run test:e2e
```

Update selectors if PrimeNG generates different DOM structure:

```typescript
// Before
await page.locator('.mat-table').waitFor();

// After
await page.locator('.p-datatable').waitFor();
```

#### 5.3 Visual Regression Testing

Capture screenshots before and after migration for comparison:

```typescript
// In Playwright tests
await page.screenshot({ path: 'screenshots/dashboard-after.png' });
```

#### 5.4 Performance Testing

Measure and compare:
- Bundle size (before vs after)
- First Contentful Paint
- Time to Interactive
- Lighthouse scores

### Phase 6: Cleanup & Documentation

#### 6.1 Remove Angular Material

Once all modules are migrated and tested:

```bash
npm uninstall @angular/material @angular/cdk
```

Remove any remaining Angular Material imports from codebase:

```bash
# Search for remaining Material imports
grep -r "@angular/material" src/

# Search for remaining Material classes in CSS
grep -r "\.mat-" src/
```

#### 6.2 Update Documentation

Update the following files:

**README.md**:
```markdown
## Installation

npm install

## UI Component Library

This project uses PrimeNG for UI components.

- [PrimeNG Documentation](https://primeng.org/)
- [PrimeNG Showcase](https://primeng.org/showcase)

## Development

npm start

## Theming

The application supports light and dark themes. Theme preference is persisted in localStorage.
```

**TESTING_GUIDE.md**:
```markdown
## Component Testing

### PrimeNG Component Testing

Import PrimeNG modules in test setup:

\`\`\`typescript
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

TestBed.configureTestingModule({
  imports: [TableModule, ButtonModule],
  declarations: [YourComponent]
});
\`\`\`

### Selector Updates

PrimeNG uses different CSS classes:
- Tables: `.p-datatable`
- Buttons: `.p-button`
- Cards: `.p-card`
```

**Component Documentation** (`/docs/components/`):
- Update all component examples to use PrimeNG
- Add migration notes for developers
- Document any API differences

#### 6.3 Create Migration Guide

**File**: `MIGRATION_GUIDE.md`

```markdown
# Angular Material to PrimeNG Migration Guide

## Overview

This document outlines the migration from Angular Material to PrimeNG completed in [Date].

## Breaking Changes

### Dialog API Changes

**Before**:
\`\`\`typescript
this.dialog.open(Component, { data });
\`\`\`

**After**:
\`\`\`typescript
this.dialogService.open(Component, { data: { ...data } });
\`\`\`

### Form Field Structure

**Before**:
\`\`\`html
<mat-form-field>
  <input matInput>
</mat-form-field>
\`\`\`

**After**:
\`\`\`html
<span class="p-float-label">
  <input pInputText>
  <label>Label</label>
</span>
\`\`\`

### Event Payload Differences

**Paginator Events**:
- Material: `{ pageIndex, pageSize, length }`
- PrimeNG: `{ first, rows, page, pageCount }`

**Sort Events**:
- Material: `{ active, direction }`
- PrimeNG: `{ field, order }`

## Component Mapping

See [Component Mapping Table](#component-mapping-table) in design document.

## Icon Migration

Material Icons have been replaced with PrimeIcons. See [Icon Mapping Table](#icon-mapping-table).

## Styling Changes

Custom CSS targeting Material classes has been updated to target PrimeNG classes.

## Testing Updates

All tests have been updated to use PrimeNG modules and selectors.

## Resources

- [PrimeNG Documentation](https://primeng.org/)
- [PrimeNG GitHub](https://github.com/primefaces/primeng)
- [PrimeNG Community](https://github.com/primefaces/primeng/discussions)
```

## Version Control and Deployment Strategy

### Branch Strategy

**Branch Naming Convention**:
- Feature branches: `feature/primeng-migration-[module-name]`
- Example: `feature/primeng-migration-shared-components`
- Example: `feature/primeng-migration-admin-module`

**Branch Structure**:
```
main (production)
  └── develop (integration)
      ├── feature/primeng-migration-shared-components
      ├── feature/primeng-migration-layout
      ├── feature/primeng-migration-admin
      ├── feature/primeng-migration-analytics
      └── ... (other module branches)
```

### Commit Message Convention

Follow conventional commits format:

```
feat(primeng): migrate StatCard component to PrimeNG Card
fix(primeng): correct event payload transformation in DataTable
test(primeng): update unit tests for migrated components
docs(primeng): update component documentation
style(primeng): update CSS to use PrimeNG classes
```

### Pull Request Process

**PR Template**:
```markdown
## Migration PR: [Module Name]

### Components Migrated
- [ ] Component 1
- [ ] Component 2

### Checklist
- [ ] All Angular Material imports removed
- [ ] All templates updated to PrimeNG
- [ ] All styles updated
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] No console errors
- [ ] Visual regression tested
- [ ] Accessibility tested
- [ ] Documentation updated

### Screenshots
[Before/After screenshots]

### Testing Notes
[Any special testing considerations]

### Breaking Changes
[List any breaking changes]
```

**Review Process**:
1. Self-review checklist completion
2. Automated CI checks (tests, linting, bundle size)
3. Code review by 2+ team members
4. Visual review in staging environment
5. Approval required before merge

### Merge Strategy

**Squash and Merge**:
- Squash all commits in PR to single commit
- Use descriptive commit message
- Preserve PR number in commit message

**Example**:
```
feat(primeng): migrate admin module to PrimeNG (#123)

- Migrated tenant list component
- Migrated platform stats component
- Updated all tests
- Updated documentation
```

### Tagging Strategy

Tag each successful module migration:

```bash
git tag -a primeng-migration-shared-v1.0 -m "Completed shared components migration"
git tag -a primeng-migration-layout-v1.0 -m "Completed layout components migration"
git tag -a primeng-migration-admin-v1.0 -m "Completed admin module migration"
```

### Deployment Strategy

**Staging Deployment**:
1. Deploy each module migration to staging environment
2. Run full test suite in staging
3. Perform manual QA testing
4. Gather feedback from stakeholders
5. Fix any issues before production deployment

**Production Deployment**:

**Option A: Phased Rollout (Recommended)**
```
Week 1: Deploy shared components + layout (20% of users)
Week 2: Deploy admin + analytics modules (40% of users)
Week 3: Deploy remaining modules (60% of users)
Week 4: Full rollout (100% of users)
```

**Option B: Feature Flag Approach**
```typescript
// Use feature flags to toggle between Material and PrimeNG
if (featureFlags.usePrimeNG) {
  // Load PrimeNG components
} else {
  // Load Material components
}
```

**Option C: Blue-Green Deployment**
```
1. Deploy new version to "green" environment
2. Run smoke tests on green
3. Switch traffic from "blue" to "green"
4. Monitor for issues
5. Keep blue as rollback option for 24 hours
```

### Rollback Automation

**Automated Rollback Script**:

**File**: `scripts/rollback-migration.sh`

```bash
#!/bin/bash

# Rollback to previous version
echo "Rolling back PrimeNG migration..."

# Checkout previous tag
git checkout primeng-migration-rollback-point

# Reinstall dependencies
npm install

# Rebuild application
npm run build

# Run tests
npm test

# Deploy to production
npm run deploy:prod

echo "Rollback complete"
```

### Monitoring and Alerting

**Post-Deployment Monitoring**:

1. **Error Rate Monitoring**:
   - Set up alerts for error rate > 1%
   - Monitor console errors in production
   - Track API error rates

2. **Performance Monitoring**:
   - Monitor page load times
   - Track bundle size metrics
   - Monitor Core Web Vitals

3. **User Feedback**:
   - Set up feedback widget
   - Monitor support tickets
   - Track user satisfaction scores

**Monitoring Tools**:
- Error tracking: Sentry, LogRocket
- Performance: Google Analytics, Lighthouse CI
- User feedback: Hotjar, UserVoice

**Alert Thresholds**:
```yaml
alerts:
  error_rate:
    threshold: 1%
    action: notify_team
  
  page_load_time:
    threshold: 3s
    action: investigate
  
  bundle_size:
    threshold: 2.5mb
    action: review_imports
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties. Through reflection, I eliminated redundancy by:

1. **Combining navigation properties**: Requirements 2.5 (navigation routing) and 9.3 (menu item actions) both test that clicking navigation elements triggers correct actions - these can be combined into a single comprehensive property
2. **Combining dialog properties**: Requirements 5.4 (confirm executes action) and 5.5 (cancel prevents action) are complementary and can be tested together as dialog action preservation
3. **Combining event emission properties**: Requirements 3.8 (table events), 6.4 (button events), and 14.4 (chart events) all test event preservation - these follow the same pattern and validate the same concern
4. **Combining form validation properties**: Requirements 4.6 (validation rules) and 4.7 (error messages) both test form validation behavior and should be tested together
5. **Combining API integration properties**: Requirements 13.2 (request payloads), 13.3 (response parsing), and 13.4 (error handling) all test API integration preservation and can be combined
6. **Combining responsive design examples**: Requirements 17.2, 17.3, 17.4 test the same responsive behavior at different breakpoints - these are edge cases of the general responsive property 17.1

After reflection, the following properties provide unique validation value:

### Property 1: Navigation Action Preservation

*For any* navigation item (sidebar menu or dropdown menu), clicking that item should route to or execute the same action as before migration.

**Validates: Requirements 2.5, 9.3**

**Rationale**: This property ensures that all navigation behavior is preserved across the migration. It covers both routing navigation and action-based menu items.

### Property 2: Data Table Sorting Preservation

*For any* dataset and sortable column, sorting by that column should produce the same row order as before migration.

**Validates: Requirements 3.4**

**Rationale**: This property ensures sorting logic remains identical. The sorting algorithm and comparison functions must produce equivalent results.

### Property 3: Data Table Pagination Preservation

*For any* page size selection, the data table should display exactly that number of rows per page.

**Validates: Requirements 3.5**

**Rationale**: This property ensures pagination behavior is preserved. Page size changes must result in the correct number of visible rows.

### Property 4: Data Table Filtering Preservation

*For any* filter input and dataset, the filtered results should match the pre-migration filtering logic exactly.

**Validates: Requirements 3.6**

**Rationale**: This property ensures filtering logic is preserved. The same filter criteria must produce the same result set.

### Property 5: Event Emission Preservation

*For any* interactive component (table, button, chart), user interactions should emit the same events with the same payload structure as before migration.

**Validates: Requirements 3.8, 6.4, 14.4**

**Rationale**: This property ensures that parent components receive the same event data. Event-driven communication between components must remain unchanged.

### Property 6: Form Validation Preservation

*For any* form input and validation rule, the validation should pass or fail identically to before migration, and error messages should display in the same format.

**Validates: Requirements 4.6, 4.7**

**Rationale**: This property ensures form validation behavior is preserved. Both validation logic and error message display must remain consistent.

### Property 7: Dialog Action Preservation

*For any* confirmable action, confirming the dialog should execute the action while canceling should prevent execution, identical to before migration.

**Validates: Requirements 5.4, 5.5**

**Rationale**: This property ensures dialog confirmation behavior is preserved. The confirm/cancel flow must produce the same outcomes.

### Property 8: Stat Card Data Display Preservation

*For any* metric data input, the stat card should display the data in the same format (title, value, icon, trend) as before migration.

**Validates: Requirements 7.2**

**Rationale**: This property ensures stat card rendering is preserved. The same input data must produce the same visual output.

### Property 9: API Integration Preservation

*For any* API call, the request payload, response parsing, and error handling should behave identically to before migration.

**Validates: Requirements 13.2, 13.3, 13.4**

**Rationale**: This property ensures all API integration remains unchanged. Backend communication must be completely transparent to the UI migration.

### Property 10: Authentication Flow Preservation

*For any* authentication operation (login, token refresh, logout), the JWT token handling should behave identically to before migration.

**Validates: Requirements 13.5**

**Rationale**: This property ensures authentication security is preserved. Token generation, storage, and validation must remain unchanged.

### Property 11: Chart Rendering Preservation

*For any* chart data and chart type, the rendered chart should display the same data visualization as before migration.

**Validates: Requirements 14.2**

**Rationale**: This property ensures chart rendering is preserved. The ng2-charts integration must continue to work identically.

### Property 12: Chart Interaction Preservation

*For any* chart interaction (tooltip, legend click, data point click), the interaction should behave identically to before migration.

**Validates: Requirements 14.4**

**Rationale**: This property ensures chart interactivity is preserved. User interactions with charts must produce the same results.

### Property 13: QR Code Generation Preservation

*For any* verification session data, the generated QR code should encode the same data format as before migration.

**Validates: Requirements 15.2**

**Rationale**: This property ensures QR code generation is preserved. The QR code library integration must continue to work identically.

### Property 14: Theme Switching Preservation

*For any* theme selection (light or dark), all PrimeNG components should apply the selected theme consistently.

**Validates: Requirements 16.2**

**Rationale**: This property ensures theme switching works across all components. Theme changes must propagate to every PrimeNG component.

### Property 15: Responsive Layout Preservation

*For any* viewport width between 320px and 2560px, the layout should adapt responsively in the same manner as before migration.

**Validates: Requirements 17.1**

**Rationale**: This property ensures responsive design is preserved across all viewport sizes. Layout breakpoints and adaptations must remain consistent.

### Property 16: Keyboard Navigation Preservation

*For any* interactive element, keyboard navigation (Tab, Enter, Escape, Arrow keys) should work identically to before migration.

**Validates: Requirements 18.3**

**Rationale**: This property ensures keyboard accessibility is preserved. All keyboard interactions must continue to work.

### Example-Based Tests

The following criteria are best validated with specific example tests rather than property-based tests:

**Example 1: No Angular Material Imports**
- Verify that no files in the codebase import from '@angular/material'
- **Validates: Requirements 1.2**

**Example 2: PrimeNG Component Usage**
- Verify that only actively used PrimeNG components are imported
- **Validates: Requirements 1.4**

**Example 3: Bundle Size Constraint**
- Verify that production bundle size increase is less than 500KB
- **Validates: Requirements 1.5**

**Example 4: Menu Item Order**
- Verify that navigation menu displays items in the same order
- **Validates: Requirements 2.4**

**Example 5: Column Type Support**
- Verify that data table supports all column types (text, date, actions, custom templates)
- **Validates: Requirements 3.7**

**Example 6: Loading Indicator Display**
- Verify that loading indicator appears during data fetch
- **Validates: Requirements 3.9, 8.2, 8.3**

**Example 7: Form Accessibility Attributes**
- Verify that all form fields have appropriate ARIA attributes
- **Validates: Requirements 4.8**

**Example 8: Delete Confirmation Dialog**
- Verify that delete actions trigger confirmation dialog
- **Validates: Requirements 5.3**

**Example 9: Stat Card Structure**
- Verify that stat card contains title, value, icon, and trend indicator elements
- **Validates: Requirements 7.3**

**Example 10: User Menu Display**
- Verify that user menu displays options in the same order
- **Validates: Requirements 9.2, 9.4**

**Example 11: Status Chip Styling**
- Verify that status chips display with correct colors for each status type
- **Validates: Requirements 10.2, 10.3**

**Example 12: Feature Module Functionality**
- Verify that each feature module (Admin, Analytics, API Keys, Billing, Branding, Dashboard, Sessions, Webhooks) functions correctly
- **Validates: Requirements 12.1-12.8**

**Example 13: Chart Type Support**
- Verify that all chart types (line, bar, pie, doughnut) render correctly
- **Validates: Requirements 14.3**

**Example 14: Theme Persistence**
- Verify that theme preference persists across browser sessions
- **Validates: Requirements 16.3**

**Example 15: Responsive Breakpoints**
- Verify that layout adapts correctly at mobile (320-767px), tablet (768-1023px), and desktop (1024px+) breakpoints
- **Validates: Requirements 17.2, 17.3, 17.4**

**Example 16: ARIA Attributes**
- Verify that interactive elements maintain ARIA attributes
- **Validates: Requirements 18.2**

**Example 17: Dialog Focus Management**
- Verify that opening a dialog traps focus within the dialog
- **Validates: Requirements 18.4**

## Error Handling

### Migration-Specific Error Scenarios

#### 1. Component Import Errors

**Scenario**: PrimeNG module not imported in component

**Detection**: TypeScript compilation error or runtime error

**Resolution**: 
- Ensure all required PrimeNG modules are imported in the component or shared module
- Check that module is added to `imports` array

**Example**:
```typescript
// Error: Can't bind to 'value' since it isn't a known property of 'p-table'
// Resolution: Import TableModule
import { TableModule } from 'primeng/table';

@Component({
  imports: [TableModule],
  // ...
})
```

#### 2. Theme Loading Errors

**Scenario**: Theme CSS file not found or fails to load

**Detection**: Console error, components appear unstyled

**Resolution**:
- Verify theme path in angular.json is correct
- Ensure theme files are included in build output
- Check that theme service correctly updates the theme link

**Fallback**: Default to light theme if theme loading fails

#### 3. API Compatibility Errors

**Scenario**: PrimeNG component API differs from Angular Material

**Detection**: Runtime error, unexpected behavior

**Resolution**:
- Consult PrimeNG documentation for correct API usage
- Update component logic to match PrimeNG API
- Add adapter layer if significant API differences exist

**Example**:
```typescript
// Angular Material
this.dialog.open(Component, { data: value });

// PrimeNG - different API
this.dialogService.open(Component, { 
  data: { value },
  header: 'Title'
});
```

#### 4. Event Emission Differences

**Scenario**: PrimeNG component emits events with different payload structure

**Detection**: Parent components receive unexpected data, runtime errors

**Resolution**:
- Map PrimeNG event payload to match expected structure
- Update event handlers to work with new payload format
- Add transformation layer in shared components

**Example**:
```typescript
// Angular Material paginator event
{ pageIndex: 0, pageSize: 10, length: 100 }

// PrimeNG paginator event
{ first: 0, rows: 10, page: 0, pageCount: 10 }

// Transformation
onPageChange(event: any) {
  const transformed = {
    pageIndex: event.page,
    pageSize: event.rows,
    length: this.totalRecords
  };
  this.pageChange.emit(transformed);
}
```

#### 5. Style Conflicts

**Scenario**: Angular Material and PrimeNG styles conflict during coexistence

**Detection**: Visual glitches, incorrect styling

**Resolution**:
- Use CSS specificity to isolate styles
- Apply scoped styles with ViewEncapsulation
- Use CSS modules or BEM naming to avoid conflicts

**Example**:
```css
/* Scope PrimeNG styles to specific components */
.primeng-migrated .p-button {
  /* PrimeNG button styles */
}

.material-legacy .mat-button {
  /* Angular Material button styles */
}
```

#### 6. Bundle Size Exceeded

**Scenario**: Production bundle exceeds 500KB increase limit

**Detection**: Build warning or error from budget configuration

**Resolution**:
- Analyze bundle with webpack-bundle-analyzer
- Ensure tree-shaking is working correctly
- Lazy load PrimeNG modules where possible
- Remove unused PrimeNG component imports

**Analysis Command**:
```bash
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

### Rollback Procedures

#### Rollback Trigger Conditions

Initiate rollback if any of the following occur:

1. **Critical functionality broken**: Core features (authentication, session creation, API key management) fail
2. **Performance degradation**: Page load time increases by >50% or Lighthouse score drops by >10 points
3. **Accessibility regression**: Keyboard navigation or screen reader compatibility breaks
4. **Bundle size violation**: Production bundle exceeds 500KB increase limit
5. **Test failure rate**: >10% of existing tests fail after migration

#### Module-Level Rollback

To rollback a specific module:

1. **Checkout previous commit**: `git checkout <tag-before-module-migration>`
2. **Cherry-pick fixes**: If needed, cherry-pick any bug fixes made during migration
3. **Rebuild**: `npm run build`
4. **Test**: Run full test suite to verify rollback success

#### Complete Rollback

To rollback entire migration:

1. **Checkout main branch**: `git checkout main`
2. **Reinstall Angular Material**: `npm install @angular/material@^17.0.0 @angular/cdk@^17.0.0`
3. **Remove PrimeNG**: `npm uninstall primeng primeicons`
4. **Rebuild**: `npm run build`
5. **Deploy**: Follow standard deployment procedures

### Error Monitoring

#### Development

- Monitor browser console for errors and warnings
- Use Angular DevTools to inspect component state
- Check network tab for failed API requests

#### Production

- Configure error tracking (e.g., Sentry, LogRocket)
- Monitor user-reported issues
- Track performance metrics (Core Web Vitals)
- Set up alerts for error rate spikes

## Testing Strategy

### Dual Testing Approach

The migration requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property-based tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for complete validation

### Performance Baseline Capture

**Before Migration**:

1. **Capture Bundle Size**:
```bash
npm run build -- --configuration=production --stats-json
npx webpack-bundle-analyzer dist/partner-dashboard/stats.json --mode static -r baseline-bundle-report.html
```

Save baseline metrics:
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "bundleSize": {
    "main": "1.2MB",
    "vendor": "800KB",
    "total": "2.0MB"
  },
  "lighthouse": {
    "performance": 95,
    "accessibility": 100,
    "bestPractices": 100,
    "seo": 100
  },
  "webVitals": {
    "FCP": "1.2s",
    "LCP": "2.1s",
    "TTI": "2.8s",
    "TBT": "150ms",
    "CLS": "0.05"
  }
}
```

2. **Capture Lighthouse Scores**:
```bash
npx lighthouse http://localhost:4200 --output=json --output-path=baseline-lighthouse.json
```

3. **Capture Page Load Metrics**:
```typescript
// Add to main.ts temporarily
window.addEventListener('load', () => {
  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  console.log('Baseline Page Load Time:', pageLoadTime);
});
```

**Store Baseline Data**:
```bash
mkdir -p .kiro/specs/primeng-dashboard-migration/baseline
mv baseline-*.* .kiro/specs/primeng-dashboard-migration/baseline/
```

### Unit Testing

#### Test Update Strategy

For each migrated component:

1. **Update imports**: Replace Angular Material test imports with PrimeNG
2. **Update test setup**: Configure TestBed with PrimeNG modules
3. **Update selectors**: Change DOM selectors to match PrimeNG structure
4. **Verify behavior**: Ensure tests still validate the same behavior
5. **Add new tests**: Cover any PrimeNG-specific behavior

#### Example Unit Test Update

```typescript
// Before
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

describe('DataTableComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatTableModule, MatPaginatorModule],
      declarations: [DataTableComponent]
    });
  });

  it('should display data in table', () => {
    const compiled = fixture.nativeElement;
    const rows = compiled.querySelectorAll('.mat-row');
    expect(rows.length).toBe(3);
  });
});

// After
import { TableModule } from 'primeng/table';

describe('DataTableComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableModule],
      declarations: [DataTableComponent]
    });
  });

  it('should display data in table', () => {
    const compiled = fixture.nativeElement;
    const rows = compiled.querySelectorAll('tr[role="row"]');
    expect(rows.length).toBe(3);
  });
});
```

#### Unit Test Coverage Goals

- Maintain or exceed current code coverage percentage
- All shared components: 100% coverage
- All layout components: 100% coverage
- All feature modules: >80% coverage
- All services: 100% coverage

### Property-Based Testing

#### Configuration

Use fast-check library (already installed) for property-based testing:

```typescript
import * as fc from 'fast-check';

describe('Property Tests', () => {
  it('should run 100 iterations', () => {
    fc.assert(
      fc.property(fc.array(fc.record({ /* ... */ })), (data) => {
        // Test property
      }),
      { numRuns: 100 } // Minimum 100 iterations
    );
  });
});
```

#### Property Test Implementation

Each correctness property must be implemented as a property-based test with:

1. **Minimum 100 iterations**: Configured via `{ numRuns: 100 }`
2. **Property reference tag**: Comment linking to design document property
3. **Appropriate generators**: Use fast-check generators for test data
4. **Clear assertions**: Verify the property holds for all generated inputs

#### Preserving Old Logic for Comparison

To enable property-based testing that compares old vs new behavior:

**Strategy 1: Snapshot Testing**
```typescript
// Before migration, capture behavior snapshots
describe('DataTable Sorting - Baseline', () => {
  it('should capture sorting behavior', () => {
    const testCases = [
      { data: [...], column: 'name', direction: 'asc' },
      { data: [...], column: 'date', direction: 'desc' },
      // ... more cases
    ];
    
    testCases.forEach(testCase => {
      const result = component.sort(testCase.data, testCase.column, testCase.direction);
      expect(result).toMatchSnapshot();
    });
  });
});
```

**Strategy 2: Reference Implementation**
```typescript
// Create a reference implementation file
// File: src/app/shared/components/data-table/data-table.reference.ts

/**
 * Reference implementation of Angular Material sorting logic
 * Used for property-based testing comparison
 * DO NOT MODIFY - This preserves pre-migration behavior
 */
export class DataTableReference {
  static sort(data: any[], column: string, direction: 'asc' | 'desc'): any[] {
    // Copy of original Angular Material sorting logic
    return data.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'asc' ? comparison : -comparison;
    });
  }
}
```

**Strategy 3: Parallel Implementation During Migration**
```typescript
// During migration, keep both implementations
export class DataTableComponent {
  // New PrimeNG implementation
  sortWithPrimeNG(data: any[], column: string, direction: 'asc' | 'desc'): any[] {
    // PrimeNG sorting logic
  }
  
  // Old Material implementation (for testing only)
  @deprecated('Use sortWithPrimeNG')
  sortWithMaterial(data: any[], column: string, direction: 'asc' | 'desc'): any[] {
    // Original Material sorting logic
  }
}
```

#### Example Property Test with Comparison

```typescript
/**
 * Feature: primeng-dashboard-migration
 * Property 2: Data Table Sorting Preservation
 * 
 * For any dataset and sortable column, sorting by that column should 
 * produce the same row order as before migration.
 */
describe('Property 2: Data Table Sorting Preservation', () => {
  it('should sort data identically to pre-migration', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          id: fc.integer(),
          name: fc.string(),
          date: fc.date()
        }), { minLength: 1, maxLength: 100 }),
        fc.constantFrom('id', 'name', 'date'),
        fc.constantFrom('asc', 'desc'),
        (data, column, direction) => {
          // Sort using reference implementation (old logic)
          const oldResult = DataTableReference.sort([...data], column, direction);
          
          // Sort using new PrimeNG implementation
          const component = new DataTableComponent();
          const newResult = component.sortWithPrimeNG([...data], column, direction);
          
          // Results should be identical
          expect(newResult).toEqual(oldResult);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Cleanup After Validation

Once all property tests pass:

1. Remove reference implementations
2. Remove deprecated methods
3. Remove snapshot files (if using snapshot strategy)
4. Document that validation is complete

```typescript
// After validation, remove old implementations
export class DataTableComponent {
  // Only keep new implementation
  sort(data: any[], column: string, direction: 'asc' | 'desc'): any[] {
    // PrimeNG sorting logic
  }
}
```

#### Property Test Tags

All property tests must include a comment tag in this format:

```typescript
/**
 * Feature: primeng-dashboard-migration
 * Property {number}: {property title}
 * 
 * {property statement from design document}
 */
```

### Accessibility Testing

#### Automated Accessibility Testing

**Tool**: axe-core

**Installation**:
```bash
npm install --save-dev @axe-core/playwright
```

**Integration with E2E Tests**:
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

#### Manual Accessibility Testing

**Screen Reader Testing**:
1. Test with NVDA (Windows) or VoiceOver (Mac)
2. Verify all interactive elements are announced
3. Verify form labels are read correctly
4. Verify error messages are announced

**Keyboard Navigation Testing**:
```typescript
test('keyboard navigation should work', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Tab through interactive elements
  await page.keyboard.press('Tab');
  let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBe('BUTTON');
  
  // Test Enter key activation
  await page.keyboard.press('Enter');
  
  // Test Escape key for dialogs
  await page.keyboard.press('Escape');
});
```

**Focus Trap Testing**:
```typescript
test('dialog should trap focus', async ({ page }) => {
  await page.goto('/api-keys');
  await page.click('button:has-text("Create API Key")');
  
  // Dialog should be open
  await expect(page.locator('.p-dialog')).toBeVisible();
  
  // Tab should cycle within dialog
  const dialogElements = await page.locator('.p-dialog [tabindex]:not([tabindex="-1"])').count();
  
  for (let i = 0; i < dialogElements + 1; i++) {
    await page.keyboard.press('Tab');
  }
  
  // Focus should still be within dialog
  const focusedElement = await page.evaluate(() => {
    return document.activeElement?.closest('.p-dialog') !== null;
  });
  expect(focusedElement).toBe(true);
});
```

**Color Contrast Verification**:
```typescript
test('should meet color contrast requirements', async ({ page }) => {
  await page.goto('/dashboard');
  
  const contrastResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .include('.p-button')
    .analyze();
  
  const contrastViolations = contrastResults.violations.filter(
    v => v.id === 'color-contrast'
  );
  
  expect(contrastViolations).toHaveLength(0);
});
```

**ARIA Attribute Validation**:
```typescript
test('interactive elements should have proper ARIA attributes', async ({ page }) => {
  await page.goto('/sessions');
  
  // Check buttons have labels
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const ariaLabel = await button.getAttribute('aria-label');
    const text = await button.textContent();
    expect(ariaLabel || text).toBeTruthy();
  }
  
  // Check form fields have labels
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).count();
      expect(label).toBeGreaterThan(0);
    }
  }
});
```

### Integration Testing

#### Test Scenarios

1. **Component Integration**: Test that shared components work correctly within feature modules
2. **Service Integration**: Test that services interact correctly with migrated components
3. **Router Integration**: Test that navigation works correctly with new layout components
4. **Form Integration**: Test that forms submit correctly with new form components

#### Example Integration Test

```typescript
describe('Session Creation Integration', () => {
  it('should create session with PrimeNG form components', async () => {
    // Navigate to session creation
    await router.navigate(['/sessions/create']);
    
    // Fill form using PrimeNG components
    const nameInput = fixture.debugElement.query(By.css('input[pInputText]'));
    nameInput.nativeElement.value = 'Test Session';
    nameInput.nativeElement.dispatchEvent(new Event('input'));
    
    // Submit form
    const submitButton = fixture.debugElement.query(By.css('p-button[type="submit"]'));
    submitButton.nativeElement.click();
    
    // Verify API call
    expect(sessionService.createSession).toHaveBeenCalledWith({
      name: 'Test Session'
    });
  });
});
```

### E2E Testing

#### Playwright Test Updates

Update E2E tests to work with PrimeNG components:

1. **Update selectors**: Change to PrimeNG CSS classes
2. **Update interactions**: Adjust for PrimeNG component behavior
3. **Add visual tests**: Capture screenshots for visual regression
4. **Verify workflows**: Test complete user workflows end-to-end

#### Example E2E Test Update

```typescript
// Before
test('should display sessions in table', async ({ page }) => {
  await page.goto('/sessions');
  await page.waitForSelector('.mat-table');
  const rows = await page.locator('.mat-row').count();
  expect(rows).toBeGreaterThan(0);
});

// After
test('should display sessions in table', async ({ page }) => {
  await page.goto('/sessions');
  await page.waitForSelector('.p-datatable');
  const rows = await page.locator('tr[role="row"]').count();
  expect(rows).toBeGreaterThan(0);
});
```

#### Visual Regression Testing

Capture screenshots before and after migration:

```typescript
test('visual regression - dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('dashboard-after-migration.png', {
    maxDiffPixels: 100 // Allow minor rendering differences
  });
});
```

### Test Execution Strategy

#### During Migration

For each module being migrated:

1. **Run unit tests**: `ng test --include='**/[module]/**/*.spec.ts'`
2. **Run integration tests**: Test module integration with other components
3. **Run E2E tests**: Test module-specific user workflows
4. **Run property tests**: Verify properties related to the module

#### Before Merge

Before merging any module migration:

1. **Run full unit test suite**: `ng test`
2. **Run full E2E test suite**: `npm run test:e2e`
3. **Run property test suite**: Verify all properties pass
4. **Check code coverage**: Ensure coverage meets goals
5. **Manual testing**: Perform exploratory testing of migrated features

#### Continuous Integration

Configure CI pipeline to:

1. **Run tests on every commit**: Unit + integration tests
2. **Run E2E tests on PR**: Full Playwright suite
3. **Check bundle size**: Fail if budget exceeded
4. **Generate coverage report**: Track coverage trends
5. **Run visual regression**: Compare screenshots

**CI Configuration Updates**:

**File**: `.github/workflows/ci.yml` (or equivalent)

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop, feature/primeng-migration-* ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm test -- --watch=false --code-coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build production
        run: npm run build -- --configuration=production --stats-json
      
      - name: Analyze bundle size
        run: |
          npx webpack-bundle-analyzer dist/partner-dashboard/stats.json --mode static -r bundle-report.html
          
      - name: Check bundle size budget
        run: |
          BUNDLE_SIZE=$(du -sb dist/partner-dashboard | cut -f1)
          BASELINE_SIZE=2097152  # 2MB baseline
          MAX_SIZE=2621440       # 2.5MB max (2MB + 500KB)
          
          if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
            echo "Bundle size $BUNDLE_SIZE exceeds maximum $MAX_SIZE"
            exit 1
          fi
          
          echo "Bundle size: $BUNDLE_SIZE bytes (within budget)"
      
      - name: Upload bundle report
        uses: actions/upload-artifact@v3
        with:
          name: bundle-report
          path: bundle-report.html
  
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun --config=lighthouserc.json
      
      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci/
```

**Lighthouse CI Configuration**:

**File**: `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "url": [
        "http://localhost:4200/",
        "http://localhost:4200/dashboard",
        "http://localhost:4200/sessions",
        "http://localhost:4200/api-keys"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 1.0}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Performance Testing

#### Metrics to Track

1. **Bundle Size**: Production build size (must be <500KB increase)
2. **First Contentful Paint**: Time to first visual content
3. **Time to Interactive**: Time until page is fully interactive
4. **Lighthouse Score**: Overall performance score (maintain or improve)

#### Performance Test Commands

```bash
# Build and analyze bundle
ng build --configuration=production --stats-json
npx webpack-bundle-analyzer dist/stats.json

# Run Lighthouse
npx lighthouse http://localhost:4200 --view

# Compare bundle sizes
npm run build:before  # Before migration
npm run build:after   # After migration
node scripts/compare-bundles.js
```

**Bundle Comparison Script**:

**File**: `scripts/compare-bundles.js`

```javascript
const fs = require('fs');
const path = require('path');

const baselineFile = '.kiro/specs/primeng-dashboard-migration/baseline/baseline-bundle.json';
const currentStatsFile = 'dist/partner-dashboard/stats.json';

// Read baseline
const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

// Read current stats
const currentStats = JSON.parse(fs.readFileSync(currentStatsFile, 'utf8'));

// Calculate sizes
const baselineSize = baseline.assets.reduce((sum, asset) => sum + asset.size, 0);
const currentSize = currentStats.assets.reduce((sum, asset) => sum + asset.size, 0);

const difference = currentSize - baselineSize;
const percentageChange = ((difference / baselineSize) * 100).toFixed(2);

console.log('Bundle Size Comparison:');
console.log(`Baseline: ${(baselineSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Current:  ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Difference: ${(difference / 1024).toFixed(2)} KB (${percentageChange}%)`);

// Check if within budget
const maxIncrease = 500 * 1024; // 500KB
if (difference > maxIncrease) {
  console.error(`❌ Bundle size increase exceeds budget of 500KB`);
  process.exit(1);
} else {
  console.log(`✅ Bundle size increase within budget`);
}
```

### Responsive Design Testing

#### Breakpoint Testing

**Breakpoints to Test**:
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Responsive Test Suite**:

```typescript
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const viewport of viewports) {
  test.describe(`Responsive - ${viewport.name}`, () => {
    test.use({ viewport });
    
    test('sidebar should adapt to viewport', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('.p-sidebar');
      
      if (viewport.width < 768) {
        // Mobile: sidebar should be overlay
        await expect(sidebar).toHaveCSS('position', 'fixed');
      } else {
        // Desktop: sidebar should be static
        await expect(sidebar).toBeVisible();
      }
    });
    
    test('data table should be responsive', async ({ page }) => {
      await page.goto('/sessions');
      
      const table = page.locator('.p-datatable');
      await expect(table).toBeVisible();
      
      if (viewport.width < 768) {
        // Mobile: table should scroll horizontally
        const scrollWidth = await table.evaluate(el => el.scrollWidth);
        const clientWidth = await table.evaluate(el => el.clientWidth);
        expect(scrollWidth).toBeGreaterThanOrEqual(clientWidth);
      }
    });
    
    test('toolbar should adapt to viewport', async ({ page }) => {
      await page.goto('/dashboard');
      
      const toolbar = page.locator('.p-toolbar');
      await expect(toolbar).toBeVisible();
      
      if (viewport.width < 768) {
        // Mobile: menu button should be visible
        await expect(page.locator('button:has(.pi-bars)')).toBeVisible();
      }
    });
  });
}
```

#### Touch Gesture Support

**Touch Event Testing**:

```typescript
test('should support touch gestures on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/dashboard');
  
  // Test swipe to open sidebar
  await page.touchscreen.tap(20, 300);
  await page.touchscreen.swipe({ x: 20, y: 300 }, { x: 250, y: 300 });
  
  const sidebar = page.locator('.p-sidebar');
  await expect(sidebar).toBeVisible();
  
  // Test swipe to close sidebar
  await page.touchscreen.swipe({ x: 250, y: 300 }, { x: 20, y: 300 });
  await expect(sidebar).not.toBeVisible();
});
```

### Shared Module Organization

#### PrimeNG Module Organization Strategy

**Option A: Centralized PrimeNG Module (Recommended)**

**File**: `src/app/shared/primeng.module.ts`

```typescript
import { NgModule } from '@angular/core';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToolbarModule } from 'primeng/toolbar';
import { SidebarModule } from 'primeng/sidebar';
import { MenuModule } from 'primeng/menu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';

const PRIMENG_MODULES = [
  ButtonModule,
  CardModule,
  TableModule,
  DialogModule,
  InputTextModule,
  DropdownModule,
  CheckboxModule,
  RadioButtonModule,
  ToolbarModule,
  SidebarModule,
  MenuModule,
  ProgressSpinnerModule,
  ChipModule,
  DividerModule,
  ConfirmDialogModule,
  DynamicDialogModule
];

@NgModule({
  imports: PRIMENG_MODULES,
  exports: PRIMENG_MODULES
})
export class PrimeNGModule { }
```

**Usage in Feature Modules**:
```typescript
import { PrimeNGModule } from '@shared/primeng.module';

@Component({
  imports: [CommonModule, PrimeNGModule, ...]
})
```

**Option B: Granular Imports (For Optimization)**

Import only what's needed in each component:

```typescript
@Component({
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    // Only import what this component uses
  ]
})
export class MyComponent { }
```

#### Service Organization

**PrimeNG Services Configuration**:

**File**: `src/app/core/services/primeng-config.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { PrimeNGConfig } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class PrimeNGConfigService {
  constructor(private primengConfig: PrimeNGConfig) {}
  
  initialize(): void {
    this.primengConfig.ripple = true;
    this.primengConfig.zIndex = {
      modal: 1100,
      overlay: 1000,
      menu: 1000,
      tooltip: 1100
    };
    
    // Set default locale
    this.primengConfig.setTranslation({
      accept: 'Yes',
      reject: 'No',
      // ... other translations
    });
  }
}
```

**Initialize in App**:

```typescript
// src/app/app.component.ts
export class AppComponent implements OnInit {
  constructor(private primengConfigService: PrimeNGConfigService) {}
  
  ngOnInit() {
    this.primengConfigService.initialize();
  }
}
```

### Developer Onboarding

#### Training Materials

**File**: `docs/PRIMENG_TRAINING.md`

```markdown
# PrimeNG Training Guide

## Overview

This guide helps developers get up to speed with PrimeNG after the migration from Angular Material.

## Key Differences

### Component Import Pattern

**Angular Material**:
\`\`\`typescript
import { MatButtonModule } from '@angular/material/button';
\`\`\`

**PrimeNG**:
\`\`\`typescript
import { ButtonModule } from 'primeng/button';
\`\`\`

### Template Syntax

**Angular Material**:
\`\`\`html
<button mat-raised-button color="primary">Click</button>
\`\`\`

**PrimeNG**:
\`\`\`html
<p-button label="Click" severity="primary"></p-button>
\`\`\`

## Common Patterns

### Forms
See [Form Components Pattern](#form-components-pattern) in design document.

### Dialogs
See [Dialog Pattern](#dialog-pattern) in design document.

### Tables
See [DataTable Component](#22-datatable-component) in design document.

## Resources

- [PrimeNG Documentation](https://primeng.org/)
- [PrimeNG Showcase](https://primeng.org/showcase)
- [PrimeNG GitHub](https://github.com/primefaces/primeng)
- [Internal Migration Guide](MIGRATION_GUIDE.md)

## Getting Help

- Check PrimeNG documentation first
- Search internal migration guide
- Ask in #primeng-migration Slack channel
- Review merged PRs for examples
```

#### Code Review Guidelines

**File**: `docs/PRIMENG_CODE_REVIEW.md`

```markdown
# PrimeNG Migration Code Review Guidelines

## Checklist for Reviewers

### Imports
- [ ] All Angular Material imports removed
- [ ] PrimeNG imports are granular (not wildcard)
- [ ] Unused imports removed

### Templates
- [ ] All Material components replaced with PrimeNG
- [ ] No Material CSS classes remain
- [ ] PrimeNG syntax is correct

### Styling
- [ ] Custom CSS updated to target PrimeNG classes
- [ ] No style conflicts with coexisting Material components
- [ ] Responsive design maintained

### Functionality
- [ ] All event handlers updated for PrimeNG API
- [ ] Event payloads transformed if needed
- [ ] Component behavior matches pre-migration

### Testing
- [ ] Unit tests updated and passing
- [ ] E2E tests updated and passing
- [ ] No console errors or warnings
- [ ] Accessibility tested

### Documentation
- [ ] Component documentation updated
- [ ] Migration notes added if needed
- [ ] Breaking changes documented
```

#### Common Pitfalls

**File**: `docs/PRIMENG_PITFALLS.md`

```markdown
# Common PrimeNG Migration Pitfalls

## 1. Event Payload Differences

**Problem**: PrimeNG events have different payload structures.

**Solution**: Transform payloads in event handlers.

\`\`\`typescript
// Material paginator
onPageChange(event: PageEvent) {
  // event = { pageIndex, pageSize, length }
}

// PrimeNG paginator
onPageChange(event: any) {
  const transformed = {
    pageIndex: event.page,
    pageSize: event.rows,
    length: this.totalRecords
  };
  // Use transformed
}
\`\`\`

## 2. Dialog API Differences

**Problem**: Dialog opening syntax is different.

**Solution**: Use DynamicDialogService instead of MatDialog.

## 3. Form Field Structure

**Problem**: PrimeNG doesn't have mat-form-field wrapper.

**Solution**: Use p-float-label pattern.

## 4. Icon Names

**Problem**: Material icon names don't work with PrimeIcons.

**Solution**: Use icon mapping table.

## 5. CSS Class Names

**Problem**: Custom CSS targeting Material classes breaks.

**Solution**: Update CSS to target PrimeNG classes.
```

### Test Documentation

#### Test Plan Document

Create a test plan documenting:

- Test scope and objectives
- Test environment setup
- Test data requirements
- Test execution schedule
- Pass/fail criteria
- Risk mitigation strategies

#### Test Results

Document test results including:

- Test execution summary (passed/failed/skipped)
- Code coverage report
- Performance metrics comparison
- Visual regression results
- Issues found and resolved

### Acceptance Criteria

Migration is complete when:

1. ✅ All unit tests pass (100% of existing tests)
2. ✅ All integration tests pass
3. ✅ All E2E tests pass (100% of existing tests)
4. ✅ All property-based tests pass (100 iterations each)
5. ✅ Code coverage maintained or improved
6. ✅ Bundle size increase <500KB
7. ✅ Lighthouse performance score maintained or improved
8. ✅ No Angular Material imports remain in codebase
9. ✅ All feature modules migrated and tested
10. ✅ Documentation updated

