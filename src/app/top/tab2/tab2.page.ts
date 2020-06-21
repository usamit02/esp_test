import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';
import { CalendarModal, CalendarModalOptions } from "ion2-calendar";
import { UiService } from '../../service/ui.service';
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit, OnDestroy {
  fromTo = { from: new Date(), to: new Date() };
  now: Date;
  private onDestroy$ = new Subject();
  constructor(public modalCtrl: ModalController, private ui: UiService,) { }
  ngOnInit() {
    let d = new Date();
    d.setMilliseconds(0);
    this.now = new Date(d.setSeconds(59));
    this.fromTo = { from: new Date(this.now.getTime() - 86399000), to: new Date(d) }
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
      this.fromTo = { from: new Date(event.data.from.dateObj), to: new Date(event.data.to.dateObj.getTime() + 86399000) };
    });
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
