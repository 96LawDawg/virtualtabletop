import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const checkersColors = {
  default: [ '#000000', '#525252' ],
  black:   [ '#4a4a4a', '#848484' ],
  blue:    [ '#4c5fea', '#8693f1' ],
  purple:  [ '#bc5bee', '#d290f4' ],
  red:     [ '#e84242', '#f07f7f' ],
  yellow:  [ '#e0cb0b', '#eadc59' ],
  green:   [ '#23ca5b', '#6adb90' ],
  orange:  [ '#e2a633', '#ecc375' ]
};
const classicURLs = {
  black:   'https://svgshare.com/i/Q1P.svg',
  blue:    'https://svgshare.com/i/PzK.svg',
  purple:  'https://svgshare.com/i/Q0v.svg',
  red:     'https://svgshare.com/i/Pzi.svg',
  yellow:  'https://svgshare.com/i/Pzg.svg',
  green:   'https://svgshare.com/i/Q0h.svg',
  orange:  'https://svgshare.com/i/Q0i.svg'
};

export default async function convertPCIO(content) {
  const zip = await JSZip.loadAsync(content);
  const widgets = JSON.parse(await zip.files['widgets.json'].async('string'));

  const nameMap = {};
  for(const filename in zip.files) {
    if(filename.match(/^userassets/) && zip.files[filename]._data && zip.files[filename]._data.uncompressedSize < 2097152) {
      const targetFile = '/assets/' + zip.files[filename]._data.crc32 + '_' + zip.files[filename]._data.uncompressedSize;
      nameMap['package://' + filename] = targetFile;
      if(!fs.existsSync(path.resolve() + '/save' + targetFile))
        fs.writeFileSync(path.resolve() + '/save' + targetFile, await zip.files[filename].async('nodebuffer'));
    }
  }

  function mapName(name) {
    if(name.match(/^\/img\//))
      name = 'https://playingcards.io' + name;
    return nameMap[name] || name;
  }

  const pileHasDeck = {};
  for(const widget of widgets)
    if(widget.type == 'cardDeck' && widget.parent)
      pileHasDeck[widget.parent] = true;

  const output = {};

  for(const widget of widgets) {
    const w = {};

    w.id = widget.id;
    w.x = widget.x;
    w.y = widget.y;
    w.z = widget.z;
    if(widget.width)
      w.width  = widget.width;
    if(widget.height)
      w.height = widget.height;

    if(widget.type == 'gamePiece' && widget.pieceType == 'checkers') {
      w.width  = 90;
      w.height = 90;
      const [ c1, c2 ] = checkersColors[widget.color] || checkersColors.default;
      w.css = `box-sizing: border-box; background: radial-gradient(circle, ${c1} 0%, ${c1} 33%, ${c2} 33%, ${c2} 46%, ${c1} 46%, ${c1} 58%, rgba(0, 0, 0, 0) 58%);`;
      w.layer = 1;
    } else if(widget.type == 'gamePiece' && widget.pieceType == 'classic') {
      w.width  = 90;
      w.height = 90;
      w.image = classicURLs[widget.color];
      w.layer = 1;
    } else if(widget.type == 'gamePiece' && widget.pieceType == 'pin') {
      w.width  = 35.85;
      w.height = 43.83;
      w.image = `https://playingcards.io/img/pieces/pin-${widget.color}.svg`;
      w.layer = 1;
    } else if(widget.type == 'gamePiece') {
      w.image = `https://playingcards.io/img/pieces/${widget.color}-${widget.pieceType}.svg`;
      w.layer = 1;
    } else if(widget.type == 'hand') {
      if(widget.enabled === false)
        continue;
      w.type = 'pile';
      w.movable = false;
      w.layer = -2;
      w.dropTarget = { 'type': 'card' };
      w.dropOffsetX = 10;
      w.dropOffsetY = 14;
      w.flipEnter = 1;
      w.flipLeave = 0;
      w.stackOffsetX = 40;
      w.childrenPerOwner = true;
      w.width = widget.width || 1500;
      w.height = widget.height || 180;
    } else if(widget.type == 'cardPile') {
      w.type = 'pile';
      w.movable = false;
      w.layer = -2;
      w.dropTarget = { 'type': 'card' };
      w.width = widget.width || 111;
      w.height = widget.height || 168;

      if(widget.label) {
        output[widget.id + '_label'] = {
          id: widget.id + '_label',
          x: widget.x,
          y: widget.y - 20,
          width: w.width,
          type: 'label',
          text: widget.label,
          movable: false,
          layer: -3
        };
      }

      if(widget.hasShuffleButton && pileHasDeck[widget.id]) {
        output[widget.id + '_shuffleButton'] = {
          id: widget.id + '_shuffleButton',
          x: widget.x,
          y: widget.y + 1.02*w.height,
          width: w.width,
          height: 32,
          type: 'button',
          label: w.width < 70 ? 'R&S' : 'Recall & Shuffle',
          layer: -1,

          clickRoutine: [
            [ "RECALL", widget.id ],
            [ "FLIP", 'pile', widget.id, 'faceDown' ],
            [ "SHUFFLE", widget.id ]
          ]
        };
      }
    } else if(widget.type == 'cardDeck') {
      w.type = 'deck';
      w.parent = widget.parent;
      w.cardTypes = widget.cardTypes;
      w.faceTemplates = [
        widget.backTemplate,
        widget.faceTemplate
      ];
      w.cardDefaults = {};
      if(widget.cardWidth && widget.cardWidth != 103)
        w.cardDefaults.width = widget.cardWidth;
      if(widget.cardHeight && widget.cardHeight != 160)
        w.cardDefaults.height = widget.cardHeight;
      if(widget.enlarge)
        w.cardDefaults.enlarge = true;

      for(const face of w.faceTemplates)
        for(const object of face.objects)
          object.value = mapName(object.value);
      for(const type in w.cardTypes)
        for(const key in w.cardTypes[type])
          w.cardTypes[type][key] = mapName(w.cardTypes[type][key]);
    } else if(widget.type == 'card') {
      w.type = 'card';
      w.deck = widget.deck;
      w.cardType = widget.cardType;
      w.parent = widget.parent;
      w.activeFace = widget.faceup ? 1 : 0;
    } else if(widget.type == 'counter') {
      w.type = 'label';
      w.text = widget.counterValue;
      w.css = 'font-size: 30px;';
      w.movable = false;
      w.layer = -3;
      if(!w.width)
        w.width = 140;
      if(!w.height)
        w.height = 44;

      function addCounterButton(suffix, x, label, value) {
        output[widget.id + suffix] = {
          id: widget.id + suffix,
          x,
          y: widget.y,
          width: w.height - 4,
          height: w.height - 4,
          type: 'button',
          label,
          layer: -1,

          clickRoutine: [
            [ "LABEL", widget.id, 'inc', value ]
          ]
        };
      }
      addCounterButton('_decrementButton', widget.x,                      '-', -1);
      addCounterButton('_incrementButton', widget.x + w.width - w.height, '+',  1);

      if(widget.label) {
        output[widget.id + 'label'] = {
          id: widget.id + 'label',
          x: widget.x,
          y: widget.y - 20,
          width: w.width,
          type: 'label',
          text: widget.label,
          movable: false,
          layer: -3
        };
      }
    } else if(widget.type == 'labelText') {
      const weight = widget.bold ? 'bold' : 'normal';
      w.type = 'label';
      w.text = widget.labelContent;
      w.css = `font-size: ${widget.textSize}px; font-weight: ${weight}; text-align: ${widget.textAlign};`;
      w.movable = false;
      w.layer = -3;
    } else if(widget.type == 'board') {
      w.image = widget.boardImage;
      w.movable = false;
      w.layer = -4;
      w.z = 10000 - w.z;
    } else if(widget.type == 'automationButton') {
      w.type = 'button';
      w.label = widget.label;
      w.layer = -1;

      w.clickRoutine = [];
      for(let c of widget.clickRoutine) {
        if(c.func == "MOVE_CARDS_BETWEEN_HOLDERS") {
          const moveFlip = c.args.moveFlip && c.args.moveFlip.value;
          c = [ "MOVE", c.args.from.value, (c.args.quantity || { value: 1 }).value, c.args.to.value ];
          if(c[1].length == 1)
            c[1] = c[1][0];
          if(c[3].length == 1)
            c[3] = c[3][0];
          if(moveFlip && moveFlip != "none")
            c[4] = moveFlip;
        }
        if(c.func == "SHUFFLE_CARDS") {
          c = [ "SHUFFLE", c.args.holders.value ];
          if(c[1].length == 1)
            c[1] = c[1][0];
        }
        if(c.func == "FLIP_CARDS") {
          const flipFace = c.args.flipFace;
          c = [ "FLIP", c.args.flipMode ? c.args.flipMode.value : 'card', c.args.holders.value ];
          if(c[2].length == 1)
            c[2] = c[2][0];
          if(flipFace)
            c.push(flipFace.value);
        }
        if(c.func == "CHANGE_COUNTER") {
          c = [ "LABEL", c.args.counters.value, c.args.changeMode ? c.args.changeMode.value : 'set', c.args.changeNumber ? c.args.changeNumber.value : 0 ];
          if(c[1].length == 1)
            c[1] = c[1][0];
        }
        w.clickRoutine.push(c);
      }

    } else if(widget.type == 'spinner') {
      w.type = widget.type;
      w.options = widget.options;
      w.value = widget.value;
    } else {
      w.css = 'background: repeating-linear-gradient(45deg, red, red 10px, darkred 10px, darkred 20px);';
    }

    if(w.image)
      w.image = mapName(w.image);

    output[widget.id] = w;
  }
  return output;
}
