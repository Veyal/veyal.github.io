import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-json-beautifier',
  templateUrl: './json-beautifier.component.html',
  styleUrls: ['./json-beautifier.component.scss']
})
export class JsonBeautifierComponent implements OnInit {

  content: string;

  get contentJson() {
    try {
      return JSON.parse(this.content);
    } catch (e) {
      return {};
    }
  }

  constructor(
    private router: Router
  ) {
  }

  ngOnInit(): void {
  }

  routeTo(param) {
    this.router.navigateByUrl(param);
  }

}
