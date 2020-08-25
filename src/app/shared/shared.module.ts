import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule} from '@angular/forms';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatRippleModule} from '@angular/material/core';


@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ], exports: [
    FlexLayoutModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatIconModule,
    MatRippleModule
  ]
})
export class SharedModule {
}
