import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent,
    ToolbarComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  readonly isHandset$: Observable<boolean>;
  isHandset = false;
  sidebarVisible = true;

  private subscriptions = new Subscription();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router
  ) {
    const mobileBreakpoints = [Breakpoints.Handset, Breakpoints.Tablet];
    this.isHandset$ = this.breakpointObserver.observe(mobileBreakpoints).pipe(
      map((result) => result.matches),
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    const mobileBreakpoints = [Breakpoints.Handset, Breakpoints.Tablet];

    this.isHandset = this.breakpointObserver.isMatched(mobileBreakpoints);
    this.sidebarVisible = !this.isHandset;

    this.subscriptions.add(
      this.isHandset$.subscribe((matches) => {
        const wasHandset = this.isHandset;
        this.isHandset = matches;

        if (this.isHandset && !wasHandset) {
          this.sidebarVisible = false;
        }

        if (!this.isHandset && wasHandset) {
          this.sidebarVisible = true;
        }
      })
    );

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => {
          if (this.isHandset) {
            this.sidebarVisible = false;
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get isMobileMenuOpen(): boolean {
    return this.isHandset && this.sidebarVisible;
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeSidebar(): void {
    if (this.isHandset) {
      this.sidebarVisible = false;
    }
  }

  onSidebarNavClick(): void {
    this.closeSidebar();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeSidebar();
  }
}


