import { Widget } from './widget.js';

//for automation normally associated with buttons look into widgets.js

//look for similar function in widget.js
export class Button extends Widget {
  constructor(id) {
    super(id);

    this.addDefaults({
      width: 80,
      height: 80,

      typeClasses: 'widget button',
      layer: -1,
      movable: false,
      clickable: true,

      image: '',
      color: 'black',
      svgReplaces: {},

      text: ''
    });
  }

  applyDeltaToDOM(delta) {
    super.applyDeltaToDOM(delta);
    if(delta.text !== undefined)
      setText(this.domElement, delta.text);

    for(const property of Object.values(this.get('svgReplaces') || {}))
      if(delta[property] !== undefined)
        this.domElement.style.cssText = this.css();
  }

  //look for similar function in widget.js
  css() {
    let css = super.css();

    if(this.get('color'))
      css += '; --color:' + this.get('color');
    if(this.get('image'))
      css += '; background-image: url("' + this.getImage() + '")';

    return css;
  }

  //look for similar function in widget.js
  cssProperties() {
    const p = super.cssProperties();
    p.push('image', 'color', 'svgReplaces');
    return p;
  }

  //functionn gets the image on the image property and applies the svg replace to recolor it. Same as in basic widgets.
  getImage() {
    if(!Object.keys(this.get('svgReplaces')).length)
      return this.get('image');

    const replaces = {};
    for(const key in this.get('svgReplaces'))
      replaces[key] = this.get(this.get('svgReplaces')[key]);
    return getSVG(this.get('image'), replaces, _=>this.domElement.style.cssText = this.css());
  }
}

