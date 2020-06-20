import { Component, OnInit } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { CalendarModal, CalendarModalOptions } from "ion2-calendar";
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
  now: Date;
  data = {};
  selected = { day: new Date(new Date().getTime() - 43200000), val: 0 };
  slide = { prev: true, next: false };//前、次ボタンの可否
  control = { xRange: 0 };
  xRange = new FormControl(this.control.xRange);
  xScale = 1;
  chartForm: FormGroup = this.builder.group({ xRange: this.xRange });//({ ledred: this.ledred })
  child_added;//１分ごとの新規データ追加イベント
  private onDestroy$ = new Subject();
  constructor(public modalCtrl: ModalController, private db: AngularFireDatabase, private ui: UiService, private builder: FormBuilder) { }
  ngOnInit() {
    let d = new Date();
    d.setMilliseconds(0);
    this.now = new Date(d.setSeconds(59));
    this.to = new Date(d);
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
    this.ui.loading();
    let y, m, d;
    let data = {};
    let diff = Math.ceil((this.to.getTime() - this.from.getTime()) / 86400000);
    diff = this.from.getHours() === 0 && this.from.getMinutes() === 0 ? diff - 1 : diff;//0:00から始まっていれば１日読込を減らす
    let day = new Date(this.from);
    const startAt = (Math.floor(this.from.getTime() / 1000)).toString();
    const readData = (y, m, d) => {
      return new Promise((resolve, reject) => {
        this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d}`).orderByKey().startAt(startAt).once('value', snap => {
          data = { ...data, ...snap.val() };
          resolve();
        }).catch(err => {
          reject(err);
        });
      });
    }
    let promise = Promise.resolve();
    for (let i = 0; i <= diff; i++) {
      y = day.getFullYear();
      m = day.getMonth() + 1;
      d = day.getDate();
      day.setDate(day.getDate() + 1);
      promise = promise.then(readData.bind(this, y, m, d));//readDataの直列promiseループ
    }
    promise.then(() => {
      this.data = data;
      if (this.xRange.value > 0) this.xRange.setValue(0);
      this.selected.day = new Date(this.from.getTime() + Math.floor((this.to.getTime() - this.from.getTime()) / 2));
      this.updateChart(this.from, this.to, diff + 1);
      if (this.child_added) this.child_added.off();
      if (this.to.getTime() >= this.now.getTime()) {
        console.log(`event add`);
        this.slide.next = false;
        const startAt = (Math.ceil(this.now.getTime() / 1000)).toString();
        this.child_added = this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d}`).orderByKey().startAt(startAt);
        this.child_added.on('child_added', snap => {
          let data = { [snap.key]: snap.val() };
          this.data = { ...this.data, ...data };
          const diff = this.to.getTime() - this.from.getTime() + 1000;
          const from = this.tempChart.dataTable[1][0];
          const term = Math.ceil(diff / this.xScale / 60000) * 60000;
          const to = new Date(from.getTime() + term - 1000);
          let noZoom = this.from.getTime() === from.getTime();// || this.to.getTime() === to.getTime();
          let now = new Date(Number(snap.key) * 1000);
          now.setSeconds(59);
          this.now = new Date(now);
          this.to = new Date(now);
          this.from = new Date(now.getTime() - diff + 1000);
          if (noZoom) {//拡大表示中
            this.updateChart(this.from, this.to, Math.ceil(diff / 86400000 / this.xScale));
            console.log(`child_added ${this.from}～${this.to}`);
          } else {
            const slide = this.to.getTime() - to.getTime();
            if (slide > 0) {
              console.log(`child_added zoom ${from}～${to}`);
              this.updateChart(new Date(from.getTime() + slide), new Date(to.getTime() + slide), Math.ceil(diff / 86400000 / this.xScale));
            } else {
              console.log(`negative slide ${slide} ${from}～${to}`);
            }
          }
        });
      } else {
        this.slide.next = true;
      }
    }).catch(err => {
      this.ui.alert(`データーの読込に失敗しました。`);
      console.log(`${err}`);
    }).finally(() => {
      this.ui.loadend();
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
    while (date.getTime() <= to.getTime()) {
      const keyTo = date.getTime() / 1000 + 60 * minuteAdd;
      let key = Number(Object.keys(this.data)[p]);
      if (keyTo > key) {
        let sum = 0; let count = 0;
        while (keyTo > key) {
          sum += this.data[key];
          p++;
          count++;
          key = Number(Object.keys(this.data)[p]);
          if (!key) {
            break
          };
        }
        this.tempChart.dataTable.push([new Date(date), Math.floor(sum / count) / 100]);
        wH += sum;//count ? sum / count : 0;
      } else {
        this.tempChart.dataTable.push([new Date(date), 0]);
      }
      date.setMinutes(date.getMinutes() + minuteAdd);
    }
    const diff = to.getTime() - from.getTime() + 1000;
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
      if (key === 'xRange') {
        this.xScale = (changes.xRange ** 2 / 100) + 1;
        let diff = this.to.getTime() - this.from.getTime() + 1000;
        let center = this.selected.day ? this.selected.day : new Date(this.from.getTime() + Math.floor(diff / 2));
        let half = Math.ceil(diff / this.xScale / 2 / 60000) * 60000;
        const from = new Date(center.getTime() - half);
        const to = new Date(center.getTime() + half);
        this.updateChart(from, to, Math.ceil(diff / 8640000 / this.xScale));
        this.slide.prev = from.getTime() > this.from.getTime() ? true : false;
        this.slide.next = to.getTime() < this.to.getTime() ? true : false;
      }
    }
  }
  chartSlide(dir: number) {
    const from = this.tempChart.dataTable[1][0];
    const diff = this.to.getTime() - this.from.getTime() + 1000;
    const term = Math.ceil(diff / this.xScale / 60000) * 60000;
    const to = new Date(from.getTime() + term);
    if (this.xScale === 1 && (this.from.getTime() === from.getTime() || this.to.getTime() === to.getTime())) {
      const diff = Math.ceil((this.to.getTime() - from.getTime()) / 86400000);
      this.to.setDate(this.to.getDate() + dir * diff);
      this.to = this.to.getTime() > this.now.getTime() ? new Date(this.now) : new Date(this.to);
      this.from = new Date(this.to.getTime() - diff * 86400000 + 1000);
      this.changeFromTo();
    } else {//拡大表示中      
      let slide = term;
      if (dir === -1) {
        if (from.getTime() - term < this.from.getTime()) {
          slide = from.getTime() - this.from.getTime();
          this.slide.prev = false;
        } else {
          this.slide.prev = true;
        }
        this.slide.next = true;
      } else {
        if (to.getTime() + term > this.to.getTime()) {
          slide = this.to.getTime() - to.getTime();
          this.slide.next = false;
        } else {
          this.slide.next = true;
        }
        this.slide.prev = true;
      }
      this.selected.day = new Date(from.getTime() + slide * dir + Math.floor(term / 2));
      this.updateChart(new Date(from.getTime() + slide * dir), new Date(to.getTime() + slide * dir), Math.ceil(diff / 8640000 / this.xScale));
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
