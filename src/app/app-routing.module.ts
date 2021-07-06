import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EssParserComponent } from './pages/ess-parser/ess-parser.component';
import { JsonBeautifierComponent } from './pages/json-beautifier/json-beautifier.component';
import { PasswordGeneratorComponent } from './pages/password-generator/password-generator.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'json-beautifier',
    component: JsonBeautifierComponent,
  },
  {
    path: 'password-generator',
    component: PasswordGeneratorComponent,
  },
  {
    path: 'ess-parser',
    component: EssParserComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
