import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClipboardService } from 'ngx-clipboard';
import { SnackBarService } from 'src/app/cores/snack-bar/snack-bar.service';

@Component({
  selector: 'app-json-beautifier',
  templateUrl: './json-beautifier.component.html',
  styleUrls: ['./json-beautifier.component.scss'],
})
export class JsonBeautifierComponent implements AfterViewInit {
  jsonValue = {};

  @ViewChild('textArea') textArea: ElementRef = {} as any;

  constructor(
    private activatedRoute: ActivatedRoute,
    private clipboardService: ClipboardService,
    private snackBarService: SnackBarService
  ) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.activatedRoute.queryParams.subscribe((params) => {
        let text = params['text'];
        if (text) {
          this.textArea.nativeElement.value = text;
          this.beautifyJson(text);
        }
      });
    }, 0);
  }

  beautifyJson(raw: string) {
    try {
      this.jsonValue = JSON.parse(raw);
    } catch (e) {
      this.jsonValue = { error: 'JSON Not Valid' };
    }
  }

  copyUrl() {
    const baseUrl = window.location.href.split('?')[0];
    const param = encodeURIComponent(JSON.stringify(this.jsonValue));
    const url = `${baseUrl}?text=${param}`
    this.clipboardService.copy(url);
    this.snackBarService.show("URL Copied to clipboard")
  }
}
