import { Component, OnInit } from '@angular/core';
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
  constructor(public modalCtrl: ModalController, private db: AngularFireDatabase, private ui: UiService,) { }
  ngOnInit() {
    let d = new Date();
    this.to = new Date();
    this.from = new Date(d.setDate(d.getDate() - 1));
    this.updateChart(this.from, this.to);
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
      this.to = new Date(event.data.to.dateObj);
      this.updateChart(this.from, this.to);
    });
  }
  updateChart(from: Date, to: Date) {
    let y, m, d;
    let data = [];
    let promises = []
    let ii = (to.getTime() - from.getTime()) / 86400000;
    let day = new Date(from);
    for (let i = 0; i <= ii; i++) {
      y = day.getFullYear();
      m = day.getMonth() + 1;
      d = day.getDate();
      day.setDate(day.getDate() + 1);
      let promise = new Promise((resolve, reject) => {
        this.db.database.ref(`monitor/3180960054094360/thermo/${y}/${m}/${d}`).once('value', d => {
          data[i] = d.val();
          resolve();
        }).catch(err => {
          reject(err);
        });
      });
      promises.push(promise);
    }
    Promise.all(promises).then(() => {
      let p = 0;
      let date = new Date(from);
      let minuteAdd = 1;
      this.tempChart.dataTable = [['date', 'number']] //[[{ type: 'date' }, '']];
      for (let i = 0; i < data.length; i++) {
        while (date.getTime() < to.getTime()) {
          let compareKey = date.getTime() / 1000;
          let key = Number(Object.keys(data[i])[p]);
          if (compareKey < key) {
            this.tempChart.dataTable.push([date, null]);
          } else {
            let d = new Date(date);
            d.setMinutes(d.getMinutes() + minuteAdd);
            let sum = 0; let count = 0;
            while (d.getTime() / 1000 > key) {
              sum += data[i][p];
              p++;
              count++;
              key = Number(Object.keys(data[i])[p]);
              if (!key) break;
            }
            this.tempChart.dataTable.push([date, Math.floor(sum / count)]);
          }
          date.setMinutes(date.getMinutes() + minuteAdd);
        }
      }
      let options = this.tempChart.options;
      options.hAxis.title = `${from.getMonth() + 1}/${from.getDate()}～${to.getMonth() + 1}/${to.getDate()}`;
      options.hAxis.format = "M/dd\nHH:mm";
      this.tempChart.component.draw();
    }).catch(err => {
      this.ui.alert(`データーの読込に失敗しました。`);
      console.log(`${err}`);
    });
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
}
