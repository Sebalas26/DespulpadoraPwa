import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { VoiceOrderModalComponent } from '../../features/orders/voice-orders/voice-order-modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    MobileNavComponent,
    VoiceOrderModalComponent
  ],
  template: `
    <div class="app-container">
      <app-sidebar></app-sidebar>
      <main class="main-content">
        <app-header></app-header>
        <div class="page-container">
          <router-outlet></router-outlet>
        </div>
      </main>
      <app-mobile-nav></app-mobile-nav>
      <app-voice-order-modal></app-voice-order-modal>
    </div>
  `
})
export class MainLayoutComponent {}
