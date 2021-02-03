let jeEnabled = null;
let jeZoomOut = false;
let jeWidget = null;
let jeStateBefore = null;
let jeStateNow = null;
let jeJSONerror = null;
let jeContext = null;
const jeWidgetLayers = {};
const jeState = {
  ctrl: false,
  shift: false,
  mouseX: 0,
  mouseY: 0,
  widget: null
};

const jeCommands = [
  {
    name: 'toggle boolean',
    context: '"(true|false)"',
    call: function() {
      jeInsert(jeContext.slice(1), jeContext[jeContext.length-2], jeContext[jeContext.length-1]=='"false"');
    }
  },
  {
    name: 'open widget by ID',
    context: '"([^"]+)"',
    call: function() {
      const m = jeContext.join('').match(/"([^"]+)"/);
      jeClick(widgets.get(m[1]));
    },
    show: function() {
      const m = jeContext.join('').match(/"([^"]+)"/);
      return widgets.has(m[1]);
    }
  },
  {
    name: 'upload a different asset',
    context: '"(/assets/[0-9_-]+)"',
    call: function() {
      uploadAsset().then(a=>jePasteText(a));
    }
  },
  {
    name: 'toggle zoom out',
    forceKey: 'Z',
    call: function() {
      jeZoomOut = !jeZoomOut;
      if(jeZoomOut) {
        $('body').classList.add('jeZoomOut');
      } else {
        $('body').classList.remove('jeZoomOut');
      }
      setScale();
    }
  },
  {
    name: _=>`remove property ${jeContext && jeContext[jeContext.length-1]}`,
    forceKey: 'D',
    context: ' ↦ (?=[^"]+$)',
    call: function() {
      let pointer = jeGetValue(jeContext.slice(0, -1));
      delete pointer[jeContext[jeContext.length-1]];

      const oldStart = getSelection().anchorOffset;
      const oldEnd   = getSelection().focusOffset;
      jeSet(JSON.stringify(jeStateNow, null, '  '));
      jeSelect(oldStart, oldEnd);
    },
    show: function() {
      return jeStateNow && jeGetValue(jeContext.slice(0, -1))[jeContext[jeContext.length-1]] !== undefined;
    }
  },
  {
    name: _=>jeJSONerror?'go to error':'apply changes',
    forceKey: ' ',
    call: function() {
      if(jeJSONerror) {
        const location = String(jeJSONerror).match(/line ([0-9]+) column ([0-9]+)/);
        if(location) {
          const pos = $('#jeText').textContent.split('\n').slice(0, location[1]-1).join('\n').length + +location[2];
          jeSelect(pos, pos);
        }
      } else {
        $('#editWidgetJSON').dataset.previousState = jeStateBefore;
        $('#editWidgetJSON').value = $('#jeText').textContent;
        $('#updateWidgetJSON').click();
      }
    }
  },
  {
    name: _=>`change ${jeContext && jeContext[4]} to applyVariables`,
    context: '^button.*\\) ↦ [a-zA-Z]+',
    call: function() {
      const operation = jeGetValue(jeContext.slice(1, 3));
      delete operation[jeContext[4]];
      if(!operation.applyVariables)
        operation.applyVariables = [];
      operation.applyVariables.push({ parameter: jeContext[4], variable: '###SELECT ME###' });
      jeSetAndSelect('');
    },
    show: function() {
      return jeContext && jeContext[4] != 'applyVariables';
    }
  }
];

function jeAddButtonOperationCommands(command, defaults) {
  jeCommands.push({
    name: command,
    context: `^button ↦ clickRoutine`,
    call: function() {
      if(jeContext.length == 2)
        jeStateNow.clickRoutine.push({func: command});
      else
        jeStateNow.clickRoutine.splice(jeContext[2]+1, 0, {func: '###SELECT ME###'});
      jeSetAndSelect(command);
    }
  });

  defaults.skip = false;
  for(const property in defaults) {
    jeCommands.push({
      name: property,
      context: `^button.* ↦ \\(${command}\\) ↦ `,
      call: function() {
        jeInsert(jeContext.slice(1, 3), property, defaults[property]);
      },
      show: function() {
        return jeStateNow && jeGetValue()[property] === undefined;
      }
    });
  }
}

function jeAddCommands() {
  jeAddWidgetPropertyCommands(new BasicWidget());
  jeAddWidgetPropertyCommands(new Button());
  jeAddWidgetPropertyCommands(new Card());
  jeAddWidgetPropertyCommands(new Deck());
  jeAddWidgetPropertyCommands(new Holder());
  jeAddWidgetPropertyCommands(new Label());
  jeAddWidgetPropertyCommands(new Pile());
  jeAddWidgetPropertyCommands(new Spinner());

  jeAddButtonOperationCommands('CLICK', { collection: 'DEFAULT', count: 1 });
  jeAddButtonOperationCommands('COMPUTE', { operation: '+', operand1: 1, operand2: 1, operand3: 1, variable: 'COMPUTE' });
  jeAddButtonOperationCommands('COUNT', { collection: 'DEFAULT', variable: 'COUNT' });
  jeAddButtonOperationCommands('FLIP', { count: 0, face: null });
  jeAddButtonOperationCommands('GET', { variable: 'id', collection: 'DEFAULT', property: 'id', aggregation: 'first' });
  // INPUT is missing
  jeAddButtonOperationCommands('LABEL', { value: 0, mode: 'set', label: null });
  jeAddButtonOperationCommands('MOVE', { count: 1, face: null, from: null, to: null });
  jeAddButtonOperationCommands('MOVEXY', { count: 1, face: null, from: null, x: 0, y: 0 });
  jeAddButtonOperationCommands('RANDOM', { min: 1, max: 10, variable: 'RANDOM' });
  jeAddButtonOperationCommands('RECALL', { owned: true, holder: null });
  jeAddButtonOperationCommands('ROTATE', { count: 1, angle: 90, mode: 'add', holder: null });
  jeAddButtonOperationCommands('SELECT', { type: 'all', property: 'parent', relation: '==', value: null, max: 999999, collection: 'DEFAULT', mode: 'add', source: 'all' });
  jeAddButtonOperationCommands('SET', { collection: 'DEFAULT', property: 'parent', relation: '=', value: null });
  jeAddButtonOperationCommands('SORT', { key: 'value', reverse: false, holder: null });
  jeAddButtonOperationCommands('SHUFFLE', { holder: null });

  jeAddCSScommands();
}

function jeAddCSScommands() {
  for(const css of [ 'border: 1px solid black', 'background: black', 'font-size: 30px', 'color: black' ]) {
    jeCommands.push({
      name: css,
      context: ' ↦ css',
      call: function() {
        jePasteText(css + '; ');
      },
      show: function() {
        return !jeJSONerror && !jeGetValue().css.match(css.split(':')[0]);
      }
    });
  }
}

function jeAddWidgetPropertyCommands(object) {
  for(const property in object.defaults)
    if(property != 'typeClasses')
      jeAddWidgetPropertyCommand(object.defaults, property);
  object.applyRemove();
}

function jeAddWidgetPropertyCommand(defaults, property) {
  jeCommands.push({
    name: property,
    context: `^${defaults.typeClasses.replace('widget ', '')}`,
    call: function() {
      jeInsert([], property, defaults[property]);
    },
    show: function() {
      return jeStateNow && jeStateNow[property] === undefined;
    }
  });
}

function jeClick(widget, e) {
  if(jeState.ctrl) {
    jeWidget = widget;
    jeSet(jeStateBefore = JSON.stringify(widget.state, null, '  '));
  } else if(widget.click) {
    widget.click();
  }
}

function jeColorize() {
  const langObj = [
    [ /^ +"(.*)": "(.*)",?$/, 'key', 'string' ],
    [ /^ +"(.*)": (-?[0-9.]+),?$/, 'key', 'number' ],
    [ /^ +"(.*)": (null|true|false),?$/, 'key', 'null' ],
    [ /^ +"(.*)":/, 'key' ]
  ];
  let out = [];
  for(const line of $('#jeText').textContent.split('\n')) {
    let foundMatch = false;
    for(const l of langObj) {
      const match = line.match(l[0]);
      if(match) {
        let outLine = line;
        for(let i=1; i<l.length; ++i)
          outLine = outLine.replace(match[i], `<i class=${l[i]}>${match[i]}</i>`);
        out.push(outLine);
        foundMatch = true;
        break;
      }
    }
    if(!foundMatch)
      out.push(line);
  }
  $('#jeTextHighlight').innerHTML = out.join('\n');
}

function jeDisplayTree() {
  const allWidgets = Array.from(widgets.values());
  let result = 'CTRL-click a widget on the left to edit it.\n\nRoom\n';
  result += jeDisplayTreeAddWidgets(allWidgets, null, '  ');
  console.log(allWidgets);
  jeSet(jeStateBefore = result);
}

function jeDisplayTreeAddWidgets(allWidgets, parent, indent) {
  let result = '';
  for(const widget of allWidgets.filter(w=>w.p('parent')==parent)) {
    result += `${indent}${widget.p('id')} (${widget.p('type') || 'basic'} - ${Math.floor(widget.p('x'))},${Math.floor(widget.p('y'))})\n`;
    result += jeDisplayTreeAddWidgets(allWidgets, widget.p('id'), indent+'  ');
    delete allWidgets[allWidgets.indexOf(widget)];
  }
  return result;
}

function jeGetContext() {
  if(!jeWidget)
    return [];

  const s = getSelection().anchorOffset;
  const e = getSelection().focusOffset;
  const v = $('#jeText').textContent;
  const t = jeWidget.p('type') || 'basic';

  const select = v.substr(s, e-s).replace(/\n/g, '\\n');
  const line = v.substr(0, s).split('\n').pop();

  try {
    jeStateNow = JSON.parse(v);
    jeJSONerror = null;
  } catch(e) {
    jeStateNow = null;
    jeJSONerror = e;
  }

  let keys = [ t ];
  for(const line of v.substr(0, s).split('\n')) {
    const m = line.match(/^( +)(["{])([^"]*)/);
    if(m) {
      const depth = m[1].length/2;
      keys[depth] = m[2]=='{' ? (keys[depth] === undefined ? -1 : keys[depth]) + 1 : m[3];
      keys = keys.slice(0, depth+1);
    }
  }
  try {
    if(keys[1] == 'clickRoutine' && typeof keys[2] == 'number' && !jeJSONerror)
      keys.splice(3, 0, '(' + jeStateNow.clickRoutine[keys[2]].func + ')');
  } catch(e) {}

  if(select)
    keys.push(`"${select}"`);

  jeContext = keys;

  jeShowCommands();

  return jeContext;
}

function jeGetValue(context, all) {
  let pointer = jeStateNow;
  for(const key of context || jeContext)
    if(all && typeof pointer[key] !== undefined || typeof pointer[key] == 'object' && pointer[key] !== null)
      pointer = pointer[key];
  return pointer
}

function jeInsert(context, key, value) {
  if(!jeJSONerror) {
    let pointer = jeGetValue(context);
    pointer[key] = '###SELECT ME###';
    jeSetAndSelect(value);
  }
}

function jePasteText(text) {
  const s = getSelection().anchorOffset;
  const e = getSelection().focusOffset;
  const v = $('#jeText').textContent;

  jeSet(v.substr(0, s) + text + v.substr(e));
  jeSelect(s, s + text.length);
}

function jeSelect(start, end) {
  const t = $('#jeText');
  const text = t.textContent;
  try {
    t.focus();

    const scroll = t.scrollTop;
    t.textContent = text.substring(0, end);
    const height = t.scrollHeight;
    t.scrollTop = 50000;
    t.textContent = text;

    if(t.scrollTop) {
      if(Math.abs(t.scrollTop + t.clientHeight/2 - scroll) < t.clientHeight*.25)
        t.scrollTop = scroll;
      else
        t.scrollTop += t.clientHeight/2;
    }

    const node = t.firstChild;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const selection = window.getSelection();
    selection.removeAllRanges();

    selection.addRange(range);
  } catch(e) {
    t.textContent = text;
  }
}

function jeSet(text) {
  $('#jeText').textContent = text;
  $('#jeText').focus();
  jeColorize();
}

function jeSetAndSelect(replaceBy) {
  let jsonString = JSON.stringify(jeStateNow, null, '  ');
  const startIndex = jsonString.indexOf('"###SELECT ME###"');
  let length = jsonString.length-17;

  jsonString = JSON.stringify(jeStateNow, null, '  ').replace(/"###SELECT ME###"/, JSON.stringify(replaceBy));

  jeSet(jsonString);
  const quote = typeof replaceBy == 'string' ? 1 : 0;
  jeSelect(startIndex + quote, startIndex+jsonString.length-length - quote);
}

function jeShowCommands() {
  const activeCommands = {};

  const context = jeContext.join(' ↦ ');
  for(const command of jeCommands) {
    delete command.currentKey;
    const contextMatch = context.match(new RegExp(command.context));
    if(contextMatch && (!command.show || command.show())) {
      if(activeCommands[contextMatch[0]] === undefined)
        activeCommands[contextMatch[0]] = [];
      activeCommands[contextMatch[0]].push(command);
    }
  }

  const usedKeys = { c: 1, x: 1, v: 1, w: 1, n: 1, t: 1, q: 1, j: 1, z: 1 };
  let commandText = '';

  const sortByName = function(a, b) {
    const nameA = typeof a.name == 'function' ? a.name() : a.name;
    const nameB = typeof b.name == 'function' ? b.name() : b.name;
    return nameA.localeCompare(nameB);
  }

  for(const contextMatch of (Object.keys(activeCommands).sort((a,b)=>b.length-a.length))) {
    commandText += `\n  <b>${contextMatch}</b>\n`;
    for(const command of activeCommands[contextMatch].sort(sortByName)) {
      if(context.match(new RegExp(command.context)) && (!command.show || command.show())) {
        const name = typeof command.name == 'function' ? command.name() : command.name;
        if(command.forceKey && !usedKeys[command.forceKey])
          command.currentKey = command.forceKey;
        for(const key of name.split(''))
          if(key != ' ' && !command.currentKey && !usedKeys[key.toLowerCase()])
            command.currentKey = key.toLowerCase();
        for(const key of 'abcdefghijklmnopqrstuvwxyz1234567890'.split(''))
          if(!command.currentKey && !usedKeys[key])
            command.currentKey = key;
        usedKeys[command.currentKey] = true;
        commandText += `Ctrl-${command.currentKey}: ${name.replace(command.currentKey, '<b>' + command.currentKey + '</b>')}\n`;
      }
    }
  }
  commandText += `\n${context}\n`;
  if(jeJSONerror)
    commandText += `\n${String(jeJSONerror)}\n`;
  $('#jeCommands').innerHTML = commandText;
}

window.addEventListener('mousemove', function(e) {
  if(!jeEnabled)
    return;
  jeState.mouseX = Math.floor((e.clientX - roomRectangle.left) / scale);
  jeState.mouseY = Math.floor((e.clientY - roomRectangle.top ) / scale);

  const hoveredWidgets = [];
  for(const [ widgetID, widget ] of widgets)
    if(jeState.mouseX >= widget.absoluteCoord('x') && jeState.mouseX <= widget.absoluteCoord('x')+widget.p('width'))
      if(jeState.mouseY >= widget.absoluteCoord('y') && jeState.mouseY <= widget.absoluteCoord('y')+widget.p('height'))
        hoveredWidgets.push(widget);

  for(let i=1; i<=12; ++i) {
    if(hoveredWidgets[i-1]) {
      jeWidgetLayers[i] = hoveredWidgets[i-1];
      $(`#jeWidgetLayer${i}`).textContent = `F${i}:\nid: ${hoveredWidgets[i-1].p('id')}\ntype: ${hoveredWidgets[i-1].p('type') || 'basic'}`;
    } else {
      delete jeWidgetLayers[i];
      $(`#jeWidgetLayer${i}`).textContent = '';
    }
  }
});

window.addEventListener('mouseup', function(e) {
  if(!jeEnabled)
    return;
  if(e.target == $('#jeText'))
    jeGetContext();
});

window.addEventListener('keydown', function(e) {
  if(e.key == 'Control')
    jeState.ctrl = true;
  if(e.key == 'Shift')
    jeState.shift = true;

  if(e.key == 'Enter' && jeEnabled) {
    document.execCommand('insertHTML', false, '\n');
    e.preventDefault();
  }

  if(jeState.ctrl) {
    if(e.key == 'j') {
      e.preventDefault();
      if(jeEnabled === null) {
        jeAddCommands();
        jeDisplayTree();
        $('#jeText').addEventListener('input', jeColorize);
        $('#jeText').onscroll = e=>$('#jeTextHighlight').scrollTop = e.target.scrollTop;
        jeColorize();
      }
      jeEnabled = !jeEnabled;
      if(jeEnabled) {
        $('body').classList.add('jsonEdit');
      } else {
        $('body').classList.remove('jsonEdit');
      }
      setScale();
    } else {
      for(const command of jeCommands) {
        if(command.currentKey == e.key) {
          e.preventDefault();
          command.call();
        }
      }
    }
  }

  const functionKey = e.key.match(/F([0-9]+)/);
  if(functionKey && jeWidgetLayers[+functionKey[1]]) {
    e.preventDefault();
    if(jeState.ctrl) {
      jePasteText(jeWidgetLayers[+functionKey[1]].p('id'));
    } else {
      jeState.ctrl = true;
      jeClick(jeWidgetLayers[+functionKey[1]]);
      jeState.ctrl = false;
    }
  }
});

window.addEventListener('keyup', function(e) {
  if(e.key == 'Control')
    jeState.ctrl = false;
  if(e.key == 'Shift')
    jeState.shift = false;

  if(e.target == $('#jeText'))
    jeGetContext();
});
