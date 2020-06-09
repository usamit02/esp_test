import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafePipe } from './safe.pipe';
import { DatePipe } from './date.pipe';
import { ColDirective } from './col.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [SafePipe, DatePipe, ColDirective],
  exports: [SafePipe, DatePipe, ColDirective]
})
export class PipeSharedModule { }