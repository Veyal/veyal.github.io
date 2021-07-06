import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasswordGeneratorComponent } from './password-generator.component';
import { SharedModule } from 'src/app/shared/shared/shared.module';



@NgModule({
  declarations: [
    PasswordGeneratorComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class PasswordGeneratorModule { }
