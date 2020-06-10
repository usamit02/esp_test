import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormBuilder, Validators } from '@angular/forms';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';
import { UserService } from '../../service/user.service';
import { UiService } from '../../service/ui.service';
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

  private onDestroy$ = new Subject();
  constructor(private builder: FormBuilder, private sdb: AngularFirestore, private db: AngularFireDatabase, private userService: UserService, private ui: UiService, ) { }

  ngOnInit() {
    this.deviceForm.valueChanges.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe(changes => {
      this.deviceUpdate(changes);
    });
  }
  ledgreenChange() {
    this.sdb.doc(`state/3180960054094360`).update({ led_green: this.led_green ? 1 : 0 });
  }
  ledredChange() {
    // this.sdb.doc(`state/3180960054094360`).update({ led_red: this.ledred });
    //console.log(`led_red:${this.ledred}`);
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
