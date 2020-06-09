import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class UiService {
  loader;
  confirmSubject = new Subject();
  constructor(private toastController: ToastController, private loadingController: LoadingController,
    private confirmController: AlertController) { }
  async pop(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000
    });
    toast.present();
  }
  async popm(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      position: 'middle',
      duration: 3000
    });
    toast.present();
  }
  async alert(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      position: 'top',
    });
    toast.present();
  }
  async loading(msg?: string, duration?: number) {
    msg = msg ? msg : "処理中...";
    duration = duration ? duration : 5000;
    this.loader = await this.loadingController.create({
      message: msg,
      duration: duration
    });
    await this.loader.present();
  }
  loadend() {
    if (this.loader) {
      this.loader.dismiss();
    } else {
      setTimeout(() => { this.loader.dismiss(); }, 500)
    }
  }
  confirm(header: string, msg: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const confirm = await this.confirmController.create({
        header: header,
        message: msg,
        buttons: [
          {
            text: 'いいえ',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (blah) => {
              resolve(false);
            }
          }, {
            text: 'はい',
            handler: () => {
              resolve(true);
            }
          }
        ]
      });
      await confirm.present();
    })
  }
}
