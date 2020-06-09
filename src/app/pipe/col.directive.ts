import { Directive, ElementRef, Renderer2, OnInit, Input } from '@angular/core';
@Directive({
  selector: '[col-s]'
})
export class ColDirective implements OnInit {
  @Input('col-s') S: string;
  @Input('col-m') M: string;
  @Input('col-l') L: string;
  constructor(private el: ElementRef, private renderer: Renderer2, ) {
    this.renderer.setAttribute(this.el.nativeElement, 'size-xs', this.S);
    this.renderer.setAttribute(this.el.nativeElement, 'size-sm', this.M);
    this.renderer.setAttribute(this.el.nativeElement, 'size-md', this.M);
    this.renderer.setAttribute(this.el.nativeElement, 'size-lg', this.L);
    this.renderer.setAttribute(this.el.nativeElement, 'size-xl', this.L);
  }
  ngOnInit() {

  }
}

/*

size-xs="3" size-sm="2" size-md="2" size-lg="2" size-xl="2"
*/