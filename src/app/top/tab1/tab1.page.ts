import { Component } from '@angular/core';
//import { FormControl, FormBuilder, Validators } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireDatabase } from '@angular/fire/database';
import { UserService } from '../../service/user.service';
import { UiService } from '../../service/ui.service';
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  //led = { green: new FormControl(), red: new FormControl() };
  //thermo = { hi: new FormControl(), }
  //deviceForm = this.builder.group({ led: this.led, thermo: this.thermo });
  ledgreen: boolean = false;
  ledred: number = 0;
  thermo: number;
  constructor(private sdb: AngularFirestore, private db: AngularFireDatabase, private userService: UserService, private ui: UiService, ) { }


  ledgreenChange() {
    this.sdb.doc(`state/3180960054094360`).update({ led_green: this.ledgreen ? 1 : 0 });//this.ledgreen ? 1 : 0
  }
}
