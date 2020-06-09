import { Injectable } from '@angular/core';
import { Store } from './store.service';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFireDatabase } from '@angular/fire/database';
import { Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { User, USER } from '../class';
@Injectable({ providedIn: 'root' })
export class UserService {
  get $() {
    return this.store.select(state => state.user);
  }
  constructor(private store: Store, private fireAuth: AngularFireAuth, private db: AngularFireDatabase, ) { }
  get(): User {
    return this.store.get('user');
  }
  mailLink(href: string) {//メールリンクログインでメーラーから飛んできた場合の処理
    if (this.fireAuth.auth.isSignInWithEmailLink(href)) {
      let email: string = localStorage.getItem('emailForSignIn');
      if (!email) {
        //email = prompt("メールアドレスを入力してください。");
        email = "usamit02@gmail.com"; console.log("mailaddress empty in localstrage!");
      }
      this.fireAuth.auth.signInWithEmailLink(email, href).then(res => {
        console.log("maillinklogin success:" + href + "\r\nname:" + res.user.displayName + "\r\nemail:" + res.user.email);
      }).catch(err => {
        alert("メールログインに失敗しました。\r\n" + err.message);
      }).finally(() => {
        localStorage.removeItem('emailForSignIn');
      })
    }
  }
  login(): Subscription {
    return this.fireAuth.user.subscribe(async user => {
      if (user && user.uid) {
        if ((await this.db.database.ref(`ban/${user.uid}`).once('value')).val()) {
          alert("アカウントは凍結されています。");
        } else {
          let data: any = {
            id: user.uid, displayName: user.displayName, photoURL: user.photoURL, email: user.email,
            phone: user.phoneNumber, created: user.metadata.creationTime, logined: user.metadata.lastSignInTime
          }
          const token = await this.fireAuth.auth.currentUser.getIdToken();
          data.token = token ? token : "";
          const ref = this.db.database.ref(`user/${user.uid}`);
          const dbuser = (await ref.once('value')).val();
          if (dbuser) {
            data.na = dbuser.na; data.avatar = dbuser.avatar; data.image = dbuser.image; data.direct = dbuser.direct;
            const admin = (await this.db.database.ref(`admin/${user.uid}`).once('value')).val();
            data.admin = admin ? admin : 0;
          } else {
            data.na = user.displayName; data.avatar = user.photoURL; data.image = user.photoURL; data.direct = 'support';
            ref.set({
              na: data.na, avatar: data.avatar, image: data.image,
              report: 0, view: 0, fan: 0, follow: 0, block: 0, good: 0, bad: 0, direct: 'support'
            });
          }
          this.store.update(state => ({ ...state, user: data }));
        }
      } else {
        this.store.update(state => ({ ...state, user: USER }));
      }
    });
  }
  logout() {
    this.fireAuth.auth.signOut();
  }
  update(user: User) {
    this.store.update(state => ({ ...state, user: user }));
  }
}
