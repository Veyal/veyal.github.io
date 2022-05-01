import { Component, OnInit, OnDestroy } from '@angular/core';
import { SnackBarService } from './snack-bar.service';
import { Subscription } from 'rxjs';

import { trigger, transition, animate, style } from '@angular/animations';

@Component({
  selector: 'app-snack-bar',
  templateUrl: './snack-bar.component.html',
  styleUrls: ['./snack-bar.component.scss'],
  animations: [
    trigger('state', [
      transition(':enter', [
        style({
          bottom: '-100px',
          transform: 'translate(-50%, 0%) scale(0.3)',
        }),
        animate(
          '150ms cubic-bezier(0, 0, 0.2, 1)',
          style({
            transform: 'translate(-50%, 0%) scale(1)',
            opacity: 1,
            bottom: '20px',
          })
        ),
      ]),
      transition(':leave', [
        animate(
          '150ms cubic-bezier(0.4, 0.0, 1, 1)',
          style({
            transform: 'translate(-50%, 0%) scale(0.3)',
            opacity: 0,
            bottom: '-100px',
          })
        ),
      ]),
    ]),
  ],
})
export class SnackBarComponent implements OnInit, OnDestroy {
  show = false;
  message: string = 'This is snackbar';
  type: string = 'success';
  private snackbarSubscription: Subscription = new Subscription();

  constructor(private snackBarService: SnackBarService) {}

  ngOnInit() {
    this.snackbarSubscription = this.snackBarService.snackbarState.subscribe(
      (state) => {
        if (state.type) {
          this.type = state.type;
        } else {
          this.type = 'success';
        }
        this.message = state.message;
        this.show = state.show;
        setTimeout(() => {
          this.show = false;
        }, 3000);
      }
    );
  }

  ngOnDestroy() {
    this.snackbarSubscription.unsubscribe();
  }
}
