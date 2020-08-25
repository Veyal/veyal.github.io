import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {HomeComponent} from './home/home.component';
import {JsonBeautifierComponent} from './json-beautifier/json-beautifier.component';


const routes: Routes = [{
  path: '',
  component: HomeComponent
},{
  path: 'json-beautifier',
  component: JsonBeautifierComponent
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
