import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { CalendarModal, CalendarModalOptions, DayConfig, CalendarResult } from "ion2-calendar";
import { GoogleChartInterface } from 'ng2-google-charts';
import { AngularFireDatabase } from '@angular/fire/database';
import { UiService } from '../../service/ui.service';
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit {
  public tempChart: GoogleChartInterface = {
    chartType: 'AreaChart',
    dataTable: [
      ['date', 'number'], [new Date(), 0]
    ],
    options: {
      height: 300,
      vAxis: {
        minValue: 0
      },
      hAxis: {
        format: 'M/d'
      }
    },
  };
  from: Date;
  to: Date;
  data = {};
  selected = { day: new Date(new Date().getTime() - 43200000), val: 0 };
  control = { xScale: 0 };
  xScale = new FormControl(this.control.xScale);
  chartForm: FormGroup = this.builder.group({ xScale: this.xScale });//({ ledred: this.ledred })   
  private onDestroy$ = new Subject();
  constructor(public modalCtrl: ModalController, private db: AngularFireDatabase, private ui: UiService, private builder: FormBuilder) { }
  ngOnInit() {
    this.to = new Date(new Date().setSeconds(59));
    this.from = new Date(this.to.getTime() - 86399000);
    this.changeFromTo();
    this.chartForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.updateControl(changes);
    });
  }
  async openCalendar() {
    let d = new Date();
    const options: CalendarModalOptions = {
      pickMode: 'range',
      title: '表示する期間',
      from: d.setFullYear(d.getFullYear() - 1), to: new Date(),
      weekdays: ['日', '月', '火', '水', '木', '金', '土'],
      closeIcon: true, doneIcon: true,
      monthFormat: 'YYYY年M月', defaultScrollTo: new Date(),
    };
    let myCalendar = await this.modalCtrl.create({
      component: CalendarModal,
      componentProps: { options }
    });
    myCalendar.present();
    myCalendar.onDidDismiss().then(event => {
      this.from = new Date(event.data.from.dateObj);
      this.to = new Date(event.data.to.dateObj.getTime() + 86399000);
      this.changeFromTo();
    });
  }
  changeFromTo() {
    let y, m, d;
    let data = {};
    let promises = []
    let diff = Math.ceil((this.to.getTime() - this.from.getTime()) / 86400000);
    diff = this.from.getHours() === 0 && this.from.getMinutes() === 0 ? diff - 1 : diff;//0:00から始まっていれば１日読込を減らす
    let day = new Date(this.from);
    const startAt = (Math.floor(this.from.getTime() / 1000)).toString();
    for (let i = 0; i <= diff; i++) {
      y = day.getFullYear();
      m = day.getMonth() + 1;
      d = day.getDate();
      day.setDate(day.getDate() + 1);
      let promise = new Promise((resolve, reject) => {
        this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d}`).orderByKey().startAt(startAt).once('value', snap => {
          data = { ...data, ...snap.val() };
          resolve();
        }).catch(err => {
          reject(err);
        });
      });
      promises.push(promise);
    }
    Promise.all(promises).then(() => {
      this.data = data;
      this.updateChart(this.from, this.to, diff + 1);
      this.selected.day = new Date(this.from.getTime() + Math.floor((this.to.getTime() - this.from.getTime()) / 2));
    }).catch(err => {
      this.ui.alert(`データーの読込に失敗しました。`);
      console.log(`${err}`);
    });
  }
  updateChart(from, to, minuteAdd) {
    let date = new Date(from);
    this.tempChart.dataTable = [['date', '発電']]; //[[{ type: 'date' }, '']];
    let p = 0;//電力データーのポインタ
    let wH = 0;//期間内の電力
    while (Number(Object.keys(this.data)[p]) < from.getTime() / 1000) {
      p++;
    }
    while (date.getTime() < to.getTime()) {
      const keyFrom = date.getTime() / 1000;
      let key = Number(Object.keys(this.data)[p]);
      if (keyFrom >= key) {
        //let d = new Date(date);
        //d.setMinutes(d.getMinutes() + minuteAdd);
        const keyTo = keyFrom + 60 * minuteAdd;
        let sum = 0; let count = 0;
        while (key < keyTo) {
          sum += this.data[key];
          p++;
          count++;
          key = Number(Object.keys(this.data)[p]);
          if (!key) {
            break
          };
        }
        this.tempChart.dataTable.push([new Date(date), Math.floor(sum / count) / 100]);
        wH += count ? sum / count : 0;
      } else {
        this.tempChart.dataTable.push([new Date(date), 0]);
      }
      date.setMinutes(date.getMinutes() + minuteAdd);
    }
    const diff = to.getTime() - from.getTime() + 1;
    let diffD = diff / (1000 * 60 * 60 * 24);
    let diffH = (diffD - Math.floor(diffD)) * 24;
    const diffM = Math.floor((diffH - Math.floor(diffH)) * 60);
    diffD = Math.floor(diffD); diffH = Math.floor(diffH);
    let title = diffD ? `${diffD}日` : ""
    title += diffH ? `${diffH}時` : "";
    title += diffM ? `${diffM}分` : "";
    title += "間の電力量 ";
    title += wH ? `${Math.floor(wH / 60) / 100}W/h` : "はありません。";
    let options = this.tempChart.options;
    options.hAxis.title = title//`${from.getMonth() + 1}/${from.getDate()}～${to.getMonth() + 1}/${to.getDate()}`;
    options.hAxis.titleFontSize = 18;
    options.hAxis.format = "M/dd\nHH:mm";
    this.tempChart.component.draw();
  }
  clickChart(e) {
    if (!e.selectedRowValues.length) return;
    this.selected.day = new Date(e.selectedRowValues[0]);
    this.selected.val = e.selectedRowValues[1];
  }
  updateControl(changes) {
    for (let key of Object.keys(changes)) {
      if (this.control[key] !== changes[key]) {
        if (key === 'xScale') {
          let diff = this.to.getTime() - this.from.getTime() + 1;
          let center = this.selected.day ? this.selected.day : new Date(this.from.getTime() + Math.floor(diff / 2));
          let half = Math.ceil(diff / changes.xScale / 2 / 60000) * 60000;
          this.updateChart(new Date(center.getTime() - half), new Date(center.getTime() + half), Math.ceil(diff / 8640000 / changes.xScale));
        }
      }
    }
  }

  dummyData() {
    let day = this.to;
    let y = day.getFullYear();
    let m = day.getMonth() + 1;
    let d = day.getDate();
    this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d}`).once('value', data => {
      this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d - 1}`).set(data.val());
    });
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
