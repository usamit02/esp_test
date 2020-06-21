import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Tab2Page } from './tab2.page';
import { Ng2GoogleChartsModule } from 'ng2-google-charts';
import { CalendarModule } from "ion2-calendar";
import { PipeSharedModule } from '../../pipe/shared.module';
import { AreaChartComponent } from '../component/areaChart/areaChart.component';
@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule, ReactiveFormsModule,
    RouterModule.forChild([{ path: '', component: Tab2Page }]),
    Ng2GoogleChartsModule, CalendarModule, PipeSharedModule,
  ],
  declarations: [Tab2Page, AreaChartComponent]
})
export class Tab2PageModule { }
