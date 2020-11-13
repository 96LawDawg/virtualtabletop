class Pile extends Widget {
  constructor(object, surface) {
    super(object, surface);

    Object.assign(this.defaults, {
      flipEnter: undefined,
      flipLeave: undefined,
      stackOffsetX: 0,
      stackOffsetY: 0,
      dropOffsetX: 4,
      dropOffsetY: 4
    });
  }

  dispenseCard(card) {
    if(this.p('flipLeave') !== undefined && card.flip)
      card.flip(this.p('flipLeave'));
    this.receiveCard(null);
  }

  receiveCard(card, pos, parentChanged) {
    if(this.p('childrenPerOwner') && card)
      card.p('owner', playerName);

    if(card && parentChanged && this.p('flipEnter') !== undefined && card.flip)
      card.flip(this.p('flipEnter'), !this.p('stackOffsetX') && !this.p('stackOffsetY'));

    if(!this.p('stackOffsetX') && !this.p('stackOffsetY'))
      return;

    // get children sorted by X or Y position
    // replace coordinates of the received card to its previous coordinates so it gets dropped at the correct position
    const children = this.children().filter(c=>!c.p('owner') || c.p('owner')==playerName).sort((a, b)=>{
      if(this.p('stackOffsetX'))
        return (a == card ? pos[0] : a.p('x')) - (b == card ? pos[0] : b.p('x'));
      return (a == card ? pos[1] : a.p('y')) - (b == card ? pos[1] : b.p('y'));
    });
    this.rearrangeChildren(children, card);
  }

  rearrangeChildren(children, card) {
    let xOffset = 0;
    let yOffset = 0;
    let z = 1;

    for(const child of children) {
      const newX = this.p('x') + this.p('dropOffsetX') + xOffset;
      const newY = this.p('y') + this.p('dropOffsetY') + yOffset;
      const newZ = z++;

      if(newX != child.p('x') || newY != child.p('y') || newZ != child.p('z'))
        child.setPosition(newX, newY, newZ, child != card);
      if(child == card)
        child.sendUpdate();

      xOffset += this.p('stackOffsetX');
      yOffset += this.p('stackOffsetY');
    }
  }

  receiveUpdate(object) {
    super.receiveUpdate(object);
    this.domElement.classList.add('pile');
    if(!this.p('transparent'))
      this.domElement.classList.add('default');
  }

  updateAfterShuffle() {
    if(!this.p('stackOffsetX') && !this.p('stackOffsetY'))
      return;

    const children = this.children();
    for(const owner of new Set(children.map(c=>c.p('owner')))) {
      this.rearrangeChildren(children.filter(c=>!c.p('owner') || c.p('owner')==owner).sort((a, b)=>{
        return a.p('z') - b.p('z');
      }));
    }
  }
}
