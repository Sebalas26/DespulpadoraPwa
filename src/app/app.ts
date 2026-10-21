import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit {
  private readonly pwaUpdate = inject(PwaUpdateService);

  ngOnInit(): void {
    this.pwaUpdate.init();
  }
}
