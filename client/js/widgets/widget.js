class Widget extends Draggable {
  constructor(object, surface) {
    const div = document.createElement('div');
    super(div, surface);
    surface.appendChild(div);
    this.receiveUpdate(object);
  }

  children() {
    return Array.from(widgets.values()).filter(w=>w.sourceObject.parent==this.sourceObject.id&&w.sourceObject.type!='deck').sort((a,b)=>b.sourceObject.z-a.sourceObject.z);
  }

  moveToPile(pile) {
    const p = pile.sourceObject;
    this.sourceObject.parent = p.id;
    this.setPosition(p.x+(p.dropOffsetX || 4), p.y+(p.dropOffsetY || 4), getMaxZ(this.sourceObject.layer || 0) + 1, false);

    if(pile.receiveCard) {
      pile.receiveCard(this);
    } else {
      this.sendUpdate();
    }
  }

  onDragStart() {
    this.dragZ = getMaxZ(this.sourceObject.layer || 0) + 1;
    this.dropTargets = getValidDropTargets(this.sourceObject);
    this.hoverTargetDistance = 99999;
    this.hoverTarget = null;
    for(const t of this.dropTargets)
      t.domElement.classList.add('droppable');
  }

  onDrag(x, y) {
    this.setPosition(x, y, this.dragZ);
    const myCenter = center(this);

    this.hoverTargetChanged = false;
    if(this.hoverTarget) {
      if(overlap(this, this.hoverTarget)) {
        this.hoverTargetDistance = distance(myCenter, this.hoverTargetCenter);
      } else {
        this.hoverTargetDistance = 99999;
        this.hoverTarget = null;
        this.hoverTargetChanged = true;
      }
    }

    for(const t of this.dropTargets) {
      const tCenter = center(t);
      const d = distance(myCenter, tCenter);
      if(d < this.hoverTargetDistance) {
        if(overlap(this, t)) {
          this.hoverTarget = t;
          this.hoverTargetCenter = tCenter;
          this.hoverTargetDistance = d;
          this.hoverTargetChanged = true;
        }
      }
    }

    if(this.hoverTargetChanged) {
      if(this.lastHoverTarget)
        this.lastHoverTarget.domElement.classList.remove('droptarget');
      if(this.hoverTarget)
        this.hoverTarget.domElement.classList.add('droptarget');
      this.lastHoverTarget = this.hoverTarget;
    }
  }

  onDragEnd() {
    for(const t of this.dropTargets)
      t.domElement.classList.remove('droppable');

    if(this.hoverTarget) {
      this.moveToPile(this.hoverTarget);
      this.hoverTarget.domElement.classList.remove('droptarget');
    }
  }

  receiveUpdate(object) {
    this.sourceObject = object;

    this.domElement.id = object.id;
    this.domElement.className = 'widget';
    if(object.css)
      this.domElement.style.cssText = object.css || '';
    if(object.width)
      this.domElement.style.width = (this.width = object.width) + 'px';
    if(object.height)
      this.domElement.style.height = (this.height = object.height) + 'px';
    if(object.owner && object.owner != playerName)
      this.domElement.classList.add('foreign');

    this.isDraggable = this.sourceObject.movable !== false;
    this.setPositionFromServer(object.x || 0, object.y || 0, object.z || 0)
  }

  sendUpdate() {
    toServer('update', this.sourceObject);
  }

  setPosition(x, y, z, send=true) {
    this.sourceObject.x = this.x = x;
    this.sourceObject.y = this.y = y;
    this.sourceObject.z = z;
    if(send)
      toServer("translate", { id: this.sourceObject.id, pos: [ x, y, z ]});
  }

  setPositionFromServer(x, y, z) {
    this.sourceObject.x = this.x = x;
    this.sourceObject.y = this.y = y;
    this.sourceObject.z = z;
    this.domElement.style.zIndex = (((this.sourceObject.layer || 0) + 10) * 100000) + z;
    if(!this.active)
      this.setTranslate(x, y, this.domElement);
  }

  setZ(z) {
    this.setPosition(this.x, this.y, z);
  }
}
