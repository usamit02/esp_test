import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Tab1Page } from './tab1.page';
import { Ng2GoogleChartsModule } from 'ng2-google-charts';
@NgModule({
  imports: [
    IonicModule, CommonModule, FormsModule, ReactiveFormsModule,
    RouterModule.forChild([{ path: '', component: Tab1Page }]),
    Ng2GoogleChartsModule,
  ],
  declarations: [Tab1Page]
})
export class Tab1PageModule { }
