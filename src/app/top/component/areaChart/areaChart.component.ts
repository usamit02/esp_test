import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { FormControl, FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { GoogleChartInterface } from 'ng2-google-charts';
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
  private now: Date;
  private data = {};
  @Input()
  set param(_param: any) {
    if (_param.from.getTime() !== _param.to.getTime()) {
      this.from = _param.from;
      this.to = _param.to;
      this.now = _param.to;
      this.data = _param.data;
      if (_param.child_added) {
        const diff = this.to.getTime() - this.from.getTime() + 1000;
        const from = this.chart.dataTable[1][0];
        const term = Math.ceil(diff / this.xScale / 60000) * 60000;
        const to = new Date(from.getTime() + term - 1000);
        let noZoom = this.from.getTime() === from.getTime();// || this.to.getTime() === to.getTime();          
        if (noZoom) {//拡大表示中
          this.updateChart(this.from, this.to, Math.ceil(diff / 86400000 / this.xScale));
          console.log(`child_added ${this.from}～${this.to}`);
        } else {
          let slide = this.to.getTime() - to.getTime();
          slide = slide > 0 ? slide : 0;
          console.log(`child_added zoom ${from}～${to}`);
          this.updateChart(new Date(from.getTime() + slide), new Date(to.getTime() + slide), Math.ceil(diff / 86400000 / this.xScale));
        }
      } else {
        this.updateChart(this.from, this.to, Math.ceil((this.to.getTime() - this.from.getTime()) / 86400000) + 1);
        if (this.xRange.value > 0) this.xRange.setValue(0);
        this.selected.day = new Date(this.from.getTime() + Math.floor((this.to.getTime() - this.from.getTime()) / 2));
        this.slide.next = this.to.getTime() < this.now.getTime() ? true : false;
      }
    }
  }
  @Output() sliding = new EventEmitter<{ from: Date, to: Date }>();
  private selected = { day: new Date(new Date().getTime() - 43200000), val: 0 };
  private term: String;//タイトルに表示されている期間
  private wH: any = {};//期間内の電力 
  slide = { prev: true, next: false };//前、次ボタンの可否
  private control = { xRange: 0 };
  xRange = new FormControl(this.control.xRange);
  chartForm: FormGroup = this.builder.group({ xRange: this.xRange });//({ ledred: this.ledred })
  private xScale = 1;
  private onDestroy$ = new Subject();
  constructor(private ui: UiService, private builder: FormBuilder) { }
  ngOnInit() {
    this.chartForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.updateControl(changes);
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
      this.sliding.emit({ from: this.from, to: this.to });
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
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}

