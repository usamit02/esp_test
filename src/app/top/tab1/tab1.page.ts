import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
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
  deviceForm: FormGroup = this.builder.group({ led_red: this.led_red, led_green: this.led_green, thermo: this.thermo });//({ ledred: this.ledred })
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
      ['℃', 0]
    ],
    options: {
      animation: { easing: 'out' },
      //width: 150, height: 150,
      min: 15, max: 35,
      greenFrom: 20, greenTo: 25,
      yellowFrom: 25, yellowTo: 30,
      redFrom: 30, redTo: 35,
      minorTicks: 1,
      majorTicks: ['15', '20', '25', '30', '35'],
    }
  };
  public tempChart: GoogleChartInterface = {
    chartType: 'AreaChart',
    dataTable: [
      [{ type: 'date' }, ''],
      ['Date(2017, 3, 1)', 0]
    ],
    //opt_firstRowIsData: true,
    options: {
      //title: '気温の推移',
      height: 300,
      //chartArea: { height: '400' },
      vAxis: {
        minValue: 0
      },
      hAxis: {
        title: '00:00',
        format: 'ss'//'H:mm:ss'
      }
    },
  };
  private onDestroy$ = new Subject();
  constructor(private builder: FormBuilder, private sdb: AngularFirestore, private db: AngularFireDatabase, private userService: UserService, private ui: UiService,) { }

  ngOnInit() {
    this.deviceForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.deviceUpdate(changes);
    });
    const today = new Date();
    const key = Math.floor(today.getTime() / 1000).toString();
    const ref = this.db.database.ref(`monitor/3180960054094360/thermo/now`);
    ref.orderByKey().startAt(key).on('child_added', data => {
      const val = data.val() / 100;
      const gaugeTable = this.gauge1.dataTable;
      gaugeTable[1][1] = val;
      this.gauge1.component.draw();
      let chartTable = this.tempChart.dataTable;
      let l = chartTable.length;
      if (l > 9) {
        chartTable.splice(1, 1);
      }
      const now = new Date(Number(data.key) * 1000);
      chartTable.push([now, val]);
      let options = this.tempChart.options;
      options.hAxis.title = `${now.getHours()}:${("0" + now.getMinutes()).slice(-2)}`;
      this.tempChart.component.draw();
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
