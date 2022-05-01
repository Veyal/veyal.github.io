import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-password-generator',
  templateUrl: './password-generator.component.html',
  styleUrls: ['./password-generator.component.scss'],
})
export class PasswordGeneratorComponent implements OnInit {
  password = '';

  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*~-";
  length = 12;

  constructor() {}

  ngOnInit(): void {
    this.buttonHandler();
  }

  generateRandomPassword(length:number) {
    var result = '';
    var charactersLength = this.characters.length;
    for (var i = 0; i < length; i++) {
      result += this.characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  buttonHandler(){
    this.password = this.generateRandomPassword(this.length);
  }
}
