import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JsonBeautifierComponent} from './json-beautifier.component';
import {SharedModule} from '../shared/shared.module';


@NgModule({
  declarations: [JsonBeautifierComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class JsonBeautifierModule {
}
