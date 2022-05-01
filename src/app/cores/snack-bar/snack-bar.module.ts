import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackBarComponent } from './snack-bar.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';



@NgModule({
  declarations: [
    SnackBarComponent
  ],
  imports: [
    CommonModule,
    BrowserAnimationsModule
  ],
  exports:[
    SnackBarComponent
  ]
})
export class SnackBarModule { }
