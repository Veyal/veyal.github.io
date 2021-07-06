import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ess-parser',
  templateUrl: './ess-parser.component.html',
  styleUrls: ['./ess-parser.component.scss'],
})
export class EssParserComponent implements OnInit {
  name: string = '';
  employeeNumber: string = '';

  bluebirdData: any[] = [];
  grabData: any[] = [];

  showBluebirdColumn:string[] = ['Name','Booking ID','Vehicle','Trip purpose','Posting date'];
  showGrabColumn:string[] = ['Name of Employee','Booking Code','Trip Description','Date/Time'];

  username = '';
  password = '';

  loggedIn = false;

  settledData:any[] = [];

  unsettledBluebirdData: any[] = [];
  unsettledGrabData: any[] = [];

  get filteredBluebirdData(): any[] {
    return this.bluebirdData.filter(
      (ed) =>
        ed['Name'].trim().toLowerCase() === this.name.trim().toLowerCase() ||
        ed['Employee number']?.toString() === this.employeeNumber
    );
  }

  get filteredGrabData(): any[] {
    return this.grabData.filter(
      (ed) =>
        ed['Name of Employee'].trim().toLowerCase() ===
          this.name.trim().toLowerCase() ||
        ed['Employee ID'].toString() === this.employeeNumber
    );
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  bluebirdParser(evt: any) {
    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>evt.target;
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      /* grab first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      const excelData: any[] = XLSX.utils.sheet_to_json(ws, { header: 0 });
      this.bluebirdData = excelData;
    };
    reader.readAsBinaryString(target.files[0]);
  }

  grabParser(evt: any) {
    /* wire up file reader */
    const target: DataTransfer = <DataTransfer>evt.target;
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      /* grab first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      const excelData: any[] = XLSX.utils.sheet_to_json(ws, { header: 0 });
      this.grabData = excelData;
    };
    reader.readAsBinaryString(target.files[0]);
  }

  excelDateToJSDate(date:number) {
    return new Date(Math.round((date - 25569)*86400*1000)).toLocaleDateString();
  }


  async goHandler(username: string, password: string) {
    const accessToken = await this.getUserToken(username, password);
    this.settledData = await this.getSettled(accessToken);
    this.checkUnsettled(this.settledData,this.filteredBluebirdData,this.filteredGrabData);
  }

  getUserToken(username: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = 'https://api.metrodata.co.id/metrodataapi/Token';
      const headers = {
        Authorization: 'Bearer null',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 7.1.2; SM-N976N Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
        'X-Requested-With': 'co.id.metrodata.ess',
      };
      const body = new URLSearchParams();
      body.set('username', username);
      body.set('password', password);
      body.set('grant_type', 'password');
      this.http.post(url, body, { headers }).subscribe((data: any) => {
        this.loggedIn = true;
        resolve(data['access_token']);
      });
    });
  }

  getSettled(accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url =
        'https://api.metrodata.co.id/metrodataapi/api/Taxi/SettlementHistory/0/30/';
      const headers = {
        Authorization: 'Bearer ' + accessToken,
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 7.1.2; SM-N976N Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
        'X-Requested-With': 'co.id.metrodata.ess',
      };
      this.http.get(url, { headers }).subscribe((data: any) => {
        resolve(data['history'].map((d:any)=>{
          return {
            'type':d['type'],
            'bookingId':d['bookingCode'],
            'vehicle':d['vehicleNumber']
          }
        }));
      });
    });
  }

  checkUnsettled(settled:any[],bluebird:any[],grab:any[]){
    this.unsettledBluebirdData = [];
    this.unsettledGrabData = [];

    for(const b of bluebird){
      if(settled.findIndex((s:any)=>s['bookingId']==b['Booking ID'] && s['vehicle'].toLowerCase()==b['Vehicle'].toLowerCase())<0){
        this.unsettledBluebirdData.push(b);
      }
    }

    for(const g of grab){
      if(settled.findIndex((s:any)=>s['bookingId']==g['Booking Code'])<0){
        this.unsettledGrabData.push(g);
      }
    }
  }
}
