import type { Routes } from '@angular/router';
import { withComponentInputBinding } from '@angular/router';
import { withHeaderDefaults, withTabDefaults } from '@ng-native/router';
import { CaptureComponent } from './screens/capture.component';
import { DetailComponent } from './screens/detail.component';
import { InspectionsComponent } from './screens/inspections.component';
import { LabComponent } from './screens/lab.component';
import { QueueComponent } from './screens/queue.component';
import { StackOutlet, TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'inspections',
        component: StackOutlet,
        children: [
          { path: '', component: InspectionsComponent },
          { path: ':reportId', component: DetailComponent },
        ],
      },
      {
        path: 'queue',
        component: StackOutlet,
        children: [{ path: '', component: QueueComponent }],
      },
      {
        path: 'diagnostics',
        component: StackOutlet,
        children: [{ path: '', component: LabComponent }],
      },
      { path: '', pathMatch: 'full', redirectTo: 'inspections' },
    ],
  },
  { path: 'capture', component: CaptureComponent },
  { path: '', pathMatch: 'full', redirectTo: 'tabs/inspections' },
];

export function routerFeatures() {
  return [
    withComponentInputBinding(),
    withHeaderDefaults({
      translucent: false,
      userInterfaceStyle: 'light',
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      color: '#111827',
      hideShadow: false,
    }),
    withTabDefaults({
      colorScheme: 'light',
      tintColor: '#111827',
      backgroundColor: '#f7f7f8',
    }),
  ];
}
