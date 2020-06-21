import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { GoogleChartInterface } from 'ng2-google-charts';
import { AngularFireDatabase } from '@angular/fire/database';
import { UiService } from '../../../service/ui.service';
@Component({
  selector: 'app-areaChart',
  templateUrl: './areaChart.component.html',
  styleUrls: ['./areaChart.component.scss'],
})
export class AreaChartComponent implements OnInit, OnDestroy {
  chart: GoogleChartInterface = {
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
      },
      isStacked: 'absolute',
      title: "充電"
    },
  };
  private from: Date;
  private to: Date;
  @Input()
  set fromTo(_fromTo: any) {
    this.from = _fromTo.from;
    this.to = _fromTo.to;
    this.changeFromTo();
  }
  @Input() now: Date;
  private data = {};
  private selected = { day: new Date(new Date().getTime() - 43200000), val: 0 };
  private term: String;//タイトルに表示されている期間
  private wH: any = {};//期間内の電力 
  slide = { prev: true, next: false };//前、次ボタンの可否
  private control = { xRange: 0 };
  xRange = new FormControl(this.control.xRange);
  chartForm: FormGroup = this.builder.group({ xRange: this.xRange });//({ ledred: this.ledred })
  private xScale = 1;
  private child_added;//１分ごとの新規データ追加イベント
  private onDestroy$ = new Subject();
  constructor(private db: AngularFireDatabase, private ui: UiService, private builder: FormBuilder) { }
  ngOnInit() {
    this.chartForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.updateControl(changes);
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
        this.db.database.ref(`monitor/3180960054094360/${y}/${m}/${d}`).orderByKey().startAt(startAt).once('value', snap => {
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
        this.child_added = this.db.database.ref(`monitor/3180960054094360/${y}/${m}/${d}`).orderByKey().startAt(startAt);
        this.child_added.on('child_added', snap => {
          let data = { [snap.key]: snap.val() };
          this.data = { ...this.data, ...data };
          const diff = this.to.getTime() - this.from.getTime() + 1000;
          const from = this.chart.dataTable[1][0];
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
            let slide = this.to.getTime() - to.getTime();
            slide = slide > 0 ? slide : 0;
            console.log(`child_added zoom ${from}～${to}`);
            this.updateChart(new Date(from.getTime() + slide), new Date(to.getTime() + slide), Math.ceil(diff / 86400000 / this.xScale));
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
    //this.tempChart.dataTable = [['date', '発電']]; //[[{ type: 'date' }, '']];
    let p = 0;//電力データーのポインタ
    let sum: any = {};
    let dataTable = ['date'];
    let nodata = [];
    const key0 = Object.keys(this.data)[0];
    if (key0) {
      while (Number(Object.keys(this.data)[p]) < from.getTime() / 1000) {
        p++;
      }
      for (let typ of Object.keys(this.data[key0])) {
        dataTable.push(typ);
        sum[typ] = 0;
        this.wH[typ] = 0;
        nodata.push(0);
      }
    } else {
      dataTable.push('なし');
      nodata.push(0);
    }
    this.chart.dataTable = [dataTable];
    while (date.getTime() <= to.getTime()) {
      const keyTo = date.getTime() / 1000 + 60 * minuteAdd;
      let key = Number(Object.keys(this.data)[p]);
      if (keyTo > key) {
        for (let typ of Object.keys(this.data[key0])) {
          sum[typ] = 0;
        }
        let count = 0;
        while (keyTo > key) {
          for (let typ of Object.keys(this.data[key0])) {
            sum[typ] += this.data[key][typ] ? this.data[key][typ] : 0;
          }
          p++;
          count++;
          key = Number(Object.keys(this.data)[p]);
          if (!key) {
            break
          };
        }
        let data: any = [new Date(date)];
        for (let typ of Object.keys(sum)) {
          let div = typ === "thermo" ? 100 : 1;
          data.push(Math.floor(sum[typ] / count) / div);
          this.wH[typ] += sum[typ];
        }
        this.chart.dataTable.push(data);
      } else {
        this.chart.dataTable.push([new Date(date), ...nodata]);
      }
      date.setMinutes(date.getMinutes() + minuteAdd);
    }
    const diff = to.getTime() - from.getTime() + 1000;
    let diffD = diff / (1000 * 60 * 60 * 24);
    let diffH = (diffD - Math.floor(diffD)) * 24;
    const diffM = Math.floor((diffH - Math.floor(diffH)) * 60);
    diffD = Math.floor(diffD); diffH = Math.floor(diffH);
    this.term = diffD ? `${diffD}日` : ""
    this.term += diffH ? `${diffH}時` : "";
    this.term += diffM ? `${diffM}分` : "";
    this.term += "間の";
    let title = this.term + "電力量 ";
    title += this.wH.thermo ? `${Math.floor(this.wH.thermo / 60) / 100}W/h` : "はありません。";
    let options = this.chart.options;
    options.hAxis.title = title//`${from.getMonth() + 1}/${from.getDate()}～${to.getMonth() + 1}/${to.getDate()}`;
    options.hAxis.titleFontSize = 18;
    options.hAxis.format = "M/dd\nHH:mm";
    this.chart.component.draw();
  }
  clickChart(e) {
    if (!e.column) return;
    let title = `${e.columnLabel}合計 `;
    title += this.wH[e.columnLabel] ? `${Math.floor(this.wH[e.columnLabel] / 60) / 100}W/h` : "はありません。";
    this.chart.options.hAxis.title = title;
    this.chart.component.draw();
    if (e.selectedRowValues.length) {
      this.selected.day = new Date(e.selectedRowValues[0]);
      this.selected.val = e.selectedRowValues[1];
    }
  }
  percent() {
    this.chart.options.isStacked = this.chart.options.isStacked === 'absolute' ? 'percent' : 'absolute';
    this.chart.component.draw();
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
    const from = this.chart.dataTable[1][0];
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

