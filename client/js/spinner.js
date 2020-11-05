class Spinner extends Widget {
  constructor(object, surface) {
    super(object, surface);
    const div = document.createElement('div');
    this.domElement.addEventListener('click', e=>this.click(e));
  }

  click(e) {
    this.sourceObject.value = this.sourceObject.options[this.sourceObject.options.length * Math.random() | 0];
    this.sendUpdate();
  }

  receiveUpdate(object) {
    super.receiveUpdate(object);
    this.domElement.className += ' spinner';
    this.domElement.textContent = object.value || '🎲';
  }
}
