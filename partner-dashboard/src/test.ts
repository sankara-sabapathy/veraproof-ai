// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Suppress specific console warnings in test environment
const originalWarn = console.warn;
console.warn = function(...args: any[]) {
  // Suppress admin guard access denied warnings in tests
  if (args[0]?.includes?.('Access denied. Admin privileges required.')) {
    return;
  }
  originalWarn.apply(console, args);
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
