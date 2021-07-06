import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EssParserComponent } from './ess-parser.component';

describe('EssParserComponent', () => {
  let component: EssParserComponent;
  let fixture: ComponentFixture<EssParserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EssParserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EssParserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
