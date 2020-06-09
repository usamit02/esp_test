import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TopPage } from './top.page';
import { MenuComponent } from './component/menu/menu.component';
import { PipeSharedModule } from '../pipe/shared.module';
const routes: Routes = [
  {
    path: '', component: TopPage,
    children: [
      { path: '', loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule) },
      { path: 'tabs', loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule) },
    ]
  }
];
@NgModule({
  entryComponents: [],
  declarations: [TopPage, MenuComponent,],
  imports: [
    CommonModule, IonicModule, RouterModule.forChild(routes), FormsModule, ReactiveFormsModule, PipeSharedModule,
  ],
})
export class TopPageModule { }
