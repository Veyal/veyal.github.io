import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent implements OnInit {
  title = '';
  showBackIcon = true;

  constructor(private router: Router) {
    router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        console.log(event.url);
        if (event.url === '/') {
          this.showBackIcon = false;
          this.title = "Veyal Tools";
        }
        else{
          this.showBackIcon = true;
          this.title = this.mapToTitle(event.url);
        }
      });
  }
  routeToDashboard() {
    this.router.navigateByUrl('/');
  }

  mapToTitle(str: string): string {
    if (str[0] === '/') {
      str = str.substring(1);
    }
    str = str.split('?')[0];
    str = str.replace('-', ' ');
    return this.titleCase(str);
  }

  titleCase(str: string): string {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
      splitStr[i] =
        splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    return splitStr.join(' ');
  }

  ngOnInit(): void {}
}
