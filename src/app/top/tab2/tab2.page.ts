import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { AngularFireDatabase } from '@angular/fire/database';
import { CalendarModal, CalendarModalOptions } from "ion2-calendar";
import { UiService } from '../../service/ui.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit, OnDestroy {
  param = { from: new Date(), to: new Date(), data: {}, child_added: false };
  from: Date = new Date();
  to: Date = new Date();
  now: Date = new Date();
  private child_added;//１分ごとの新規データ追加イベント
  private onDestroy$ = new Subject();
  constructor(public modalCtrl: ModalController, private db: AngularFireDatabase, private ui: UiService,) { }
  ngOnInit() {
    let d = new Date();
    d.setMilliseconds(0);
    this.now = new Date(d.setSeconds(59));
    this.from = new Date(this.now.getTime() - 86399000);
    this.to = new Date(d);
    this.changeFromTo();
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
      this.param = { from: this.from, to: this.to, data: data, child_added: false };
      if (this.child_added) this.child_added.off();
      if (this.to.getTime() >= this.now.getTime()) {
        console.log(`event add`);
        const startAt = (Math.ceil(this.now.getTime() / 1000)).toString();
        this.child_added = this.db.database.ref(`monitor/3180960054094360/${y}/${m}/${d}`).orderByKey().startAt(startAt);
        this.child_added.on('child_added', snap => {
          let data = { [snap.key]: snap.val() };
          const diff = this.to.getTime() - this.from.getTime() + 1000;
          let now = new Date(Number(snap.key) * 1000);
          now.setSeconds(59);
          this.now = new Date(now);
          this.to = new Date(now);
          this.from = new Date(now.getTime() - diff + 1000);
          this.param = { from: this.from, to: this.to, data: { ...this.param.data, ...data }, child_added: true };
        });
      }
    }).catch(err => {
      this.ui.alert(`データーの読込に失敗しました。`);
      console.log(`${err}`);
    }).finally(() => {
      this.ui.loadend();
    });
  }
  sliding(e) {
    this.from = e.from;
    this.to = e.to;
    this.changeFromTo();
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
