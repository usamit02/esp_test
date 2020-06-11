import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';
import { UserService } from '../../service/user.service';
import { UiService } from '../../service/ui.service';
import { GoogleChartInterface } from 'ng2-google-charts';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit, OnDestroy {
  //@ViewChild('ledredRenge', { read: ElementRef, static: false }) ledredRange: ElementRef; 
  //led = { green: new FormControl(), red: new FormControl() };
  //thermo = { hi: new FormControl(), };
  device = { led_red: 0, led_green: false, thermo: null };
  led_red = new FormControl(this.device.led_red);
  led_green = new FormControl(this.device.led_green);
  thermo = new FormControl(this.device.thermo);
  deviceForm = this.builder.group({ led_red: this.led_red, led_green: this.led_green, thermo: this.thermo });//({ ledred: this.ledred })
  //ledgreen: boolean = false;
  //ledred: number = 0;
  //thermo: number;
  temp = { data: ['℃', 0], options: { redFrom: 80, redTo: 100, yellowFrom: 40, yellowTo: 80, minorTicks: 5 } };
  public columnChart1: GoogleChartInterface = {
    chartType: 'ColumnChart',
    dataTable: [
      ['City', '2010 Population'],
      ['New York City, NY', 8175000],
      ['Los Angeles, CA', 3792000],
      ['Chicago, IL', 2695000],
      ['Houston, TX', 2099000],
      ['Philadelphia, PA', 1526000]
    ],
    //opt_firstRowIsData: true,
    options: {
      title: 'Population of Largest U.S. Cities',
      height: 600,
      chartArea: { height: '400' },
      hAxis: {
        title: 'Total Population',
        minValue: 0
      },
      vAxis: {
        title: 'City'
      }
    },
  };
  public gauge1: GoogleChartInterface = {
    chartType: 'Gauge',
    dataTable: [
      ['Label', 'Value'],
      ['気温', 0]
    ],
    options: {
      animation: { easing: 'out' },
      //width: 150, height: 150,
      min: -20, max: 100,
      greenFrom: 0, greenTo: 60,
      yellowFrom: 60, yellowTo: 80,
      redFrom: 80, redTo: 100,
      minorTicks: 5,
      majorTicks: ['-20', '0', '20', '40', '60', '80', '100'],
    }
  };
  private onDestroy$ = new Subject();
  constructor(private builder: FormBuilder, private sdb: AngularFirestore, private db: AngularFireDatabase, private userService: UserService, private ui: UiService, ) { }

  ngOnInit() {
    this.deviceForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.deviceUpdate(changes);
    });
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const d = today.getDate();
    this.db.database.ref(`monitor/3180960054094360/thormo/1/${y}/${m}/${d}`).on('child_added', data => {
      const dataTable = this.gauge1.dataTable;
      dataTable[1][1] = data.val();
      this.gauge1.component.draw();
    });
  }
  deviceUpdate(changes) {
    for (let key of Object.keys(changes)) {
      if (this.device[key] !== changes[key]) {
        if (key === 'led_green') {
          changes[key] = changes[key] ? 1 : 0;
        }
        let change = {};
        change[key] = changes[key];
        this.sdb.doc(`state/3180960054094360`).update(change).then(res => {
          this.device[key] = changes[key];
        }).catch(err => {
          this.ui.alert(`${key}の更新に失敗しました。`);
          changes[key].reset(this.device[key]);
        });
      }
    }
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
