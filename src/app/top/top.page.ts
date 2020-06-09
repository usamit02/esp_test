import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../service/user.service';
@Component({
  selector: 'app-top',
  templateUrl: './top.page.html',
  styleUrls: ['./top.page.scss']
})
export class TopPage implements OnInit, OnDestroy {
  user: any = { id: "", na: "" };
  private onDestroy$ = new Subject();
  constructor(private userService: UserService) {

  }
  ngOnInit() {
    this.userService.$.pipe(takeUntil(this.onDestroy$)).subscribe(user => {
      this.user = user;
    });
  }
  logout(e) {
    this.userService.logout();
  }
  ngOnDestroy() {
    this.onDestroy$.next();
  }
}
