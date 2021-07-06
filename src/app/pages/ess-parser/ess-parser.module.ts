import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EssParserComponent } from './ess-parser.component';
import { SharedModule } from 'src/app/shared/shared/shared.module';



@NgModule({
  declarations: [
    EssParserComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class EssParserModule { }
