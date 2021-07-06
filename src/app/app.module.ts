import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ClipboardModule } from 'ngx-clipboard';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavBarModule } from './cores/nav-bar/nav-bar.module';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { EssParserModule } from './pages/ess-parser/ess-parser.module';
import { JsonBeautifierModule } from './pages/json-beautifier/json-beautifier.module';
import { PasswordGeneratorModule } from './pages/password-generator/password-generator.module';
import { SharedModule } from './shared/shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    ClipboardModule,
    NavBarModule,
    DashboardModule,
    JsonBeautifierModule,
    PasswordGeneratorModule,
    EssParserModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
