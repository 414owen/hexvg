console.log('hexplode');

const q = query => document.querySelector(query);
const qa = query => Array.from(document.querySelectorAll(query));
const svg   = q('svg');
const main  = q('#main');
const orig  = q('#orig');
const board = q('#board');
const classes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const pass = () => {};
const constant = a => b => a;
const getAttrs = (node, attrs) => attrs.map(a => node.getAttributeNS(null, a));
const view = () => getAttrs(svg, ['viewBox'])[0].split(' ')
  .map(a => parseInt(a, 10));
const dims = () => view().slice(2);
const [width, height] = dims();
const rads = n => Math.PI * n / 180;
const vedge = (width / 2) * Math.cos(rads(30));
const signum = a => a > 0 ? 1 : a < 0 ? -1 : 0;

const withClick = (el, callback) => {
  el.onclick = callback;
  return el;
};

const emptyEl = node => {
  Array.from(node.childNodes).forEach(el => { el.remove(); });
  return node;
};

const attrs = (node, attrs) =>
  Object.entries(attrs).reduce((node, [key, val]) => {
    node.setAttributeNS(null, key, val);
    return node;
  }, node);

attrs(q('.hex path'), {
  d: `M0 ${height / 2}l${width / 4} ${vedge}l${width / 2} 0L${width} ${height / 2}l-${width / 4} -${vedge}l-${width / 2} 0z`,
});

const cloneOrig = (att = {}, onClick = pass) => {
  const res = orig.cloneNode(true);
  res.id = '';
  return attrs(withClick(res, onClick), att);
};

const crel = el => document.createElementNS('http://www.w3.org/2000/svg', el);
const append = (par, child) => {
  par.appendChild(child);
  return [par, child];
};

const crText = str => document.createTextNode(str);

const text = (x, y, str, {bl = 'text-after-edge'} = {}) => append(
  attrs(
    crel('text'), {
    'text-anchor': 'middle',
    x,
    y,
    'dominant-baseline': bl,
  }),
  crText(str)
)[0];

const bottomText = str =>
  append(main, text(width / 2, height, str, 'middle'))[1];

const middleText = str =>
  append(main, text(width / 2, height / 2, str))[1];

const numMenu = (values, text, callback) => {
  emptyEl(main).classList.add('menu');
  append(main, board);
  const n = values.length;
  const newWidth = width * n;
  const newHeight = height * n;
  values.forEach((value, ind) => {
    append(board, cloneOrig({
      transform: `scale(${1 / values.length}) translate(${width * ind} ${newHeight / 2 - height / 2})`,
      'class': `hex ${classes[value]}`,
      style: `animation-delay: -100s`
    }, () => {
      callback(value)
      main.classList.remove('menu');
    }));
  });
  bottomText(text);
};

const isOnGrid = (n, ptarr) => Math.max(...ptarr.map(Math.abs)) <= n;
const isPointOnGrid = (n, point) => isOnGrid(n, point.get());
const sum = arr => arr.reduce((a, b) => a + b);
const isHexPoint = point => sum(point.get()) === 0;

const surround = [
  [0, 1, 1],
  [0, 1, -1],
  [0, -1, 1],
  [0, -1, -1],
  [1, 1, 0],
  [1, -1, 0],
  [1, 0, 1],
  [1, 0, -1],
  [-1, 1, 0],
  [-1, -1, 0],
  [-1, 0, 1],
  [-1, 0, -1],
];

class Point {
  constructor(x, y, z) {
    this.pt = [x, y, z];
  }

  get() {
    return this.pt;
  }

  add(pt) {
    const [x, y, z] = pt.get();
    const [i, j, k] = this.pt;
    return new Point(x + i, y + j, z + k);
  }

  surrounding() {
    return surround.map(a => new Point(...a).add(this));
  }

  equals(pt) {
    const [x, y, z] = pt.get();
    const [i, j, k] = this.pt;
    return x === i && y === j && z === k;
  }

  pathFrom(pt) {
    const par = this.get();
    const path = [];
    while (!this.equals(pt)) {
      let step;
      const p = pt.get();
      const [a, b, c] = par.map((a, i) => Math.abs(a - p[i]));
      if (a <= b && a <= c) {
        step = new Point(0, signum(par[1] - p[1]), signum(par[2] - p[2]));
      } else if (b <= a && b <= c) {
        step = new Point(signum(par[0] - p[0]), 0, signum(par[2] - p[2]));
      } else {
        step = new Point(signum(par[0] - p[0]), signum(par[1] - p[1]), 0);
      }
      path.push(step);
      pt = pt.add(step);
    }
    return path;
  }
}

const dx = [width / 2, 0];
const dy = [-width / 4, vedge];
const dz = [-width / 4, -vedge];
const diffs = [dx, dy, dz];
const zip = (a, b) => a.map((ea, i) => [ea, b[i]]);

const translate = point => {
  const [nw, nh] = dims();
  const [ox, oy] = [nw / 2 - width / 2, nh / 2 - height / 2];
  return zip(point.get(), diffs).reduce(([x, y], [n, [dx, dy]]) =>
    [x + dx * n, y + dy * n], [ox, oy]);
};

const newCell = (n, point, onClick) => {
  const [x, y, z] = point.get();
  const node = cloneOrig({
    transform: `translate(${translate(point)})`,
    style: `animation-delay: ${(Math.random() + n + Math.min(x, y, z)) / 10}s`,
    'data-point': JSON.stringify(point.get()),
  }, onClick);
  return {
    id: point.get().toString(),
    player: null,
    pieces: 0,
    point,
    node: append(board, node)[1],
    neighbours: point.surrounding()
      .filter(isHexPoint)
      .filter(isPointOnGrid.bind(null, n))
  };
}

const pointsIn = (n, callback) => {
  for (let i = 0; i <= n * 2; i++) {
    const x = i - n;
    for (let j = 0; j <= n * 2; j++) {
      const y = j - n;
      const z = 0 - x - y;
      const point = new Point(x, y, z);
      if (isPointOnGrid(n, point)) callback(point);
    }
  }
};

const updateIn = (root, path, updater) => {
  let node = root;
  path.forEach((seg, ind) => {
    if (ind === path.length - 1) {
      node[seg] = updater(node[seg]);
    } else {
      if (!(node[seg] instanceof Object)) node[seg] = {};
      node = node[seg];
    }
  });
};

const getIn = (root, path) => path.reduce((acc, seg) => acc[seg], root);

class Game {
  constructor(n) {

    this.n = n;
    this.turn = 0;
    this.playerInd = 0;
    this.ownedCells = [0, 0];
    this.winner = false;
    this.clickLock = false;

    const grid = this.grid = {};
    this.points = 0;
    pointsIn(this.n, point => {
      this.points++;
      updateIn(grid, point.get(), constant(newCell(this.n, point, data => {
        this.handleCellClick(data)
      })));
    });
    pointsIn(this.n, point => {
      const cell = getIn(grid, point.get());
      cell.neighbours = cell.neighbours.map(point => getIn(grid, point.get()));
    });
    this.origin = getIn(grid, [0, 0, 0]);
  }

  get(x, y, z) {
    return this.grid[x][y][z];
  }

  getPoint(point) {
    return this.get(...point.get());
  }

  getNextPlayer() {
    return (this.playerInd + 1) % 2;
  }

  addToCell(cell) {
    let frontier = [cell];
    while (frontier.length > 0) {
      const newFrontier = [];
      frontier.forEach(cell => {
        cell.pieces++;
        if (cell.node.classList.contains('zero') || !cell.node.classList.contains(`p${this.playerInd}`)) {
          this.ownedCells[this.playerInd]++;
        }
        if (cell.node.classList.contains(`p${this.getNextPlayer()}`)) {
          this.ownedCells[this.getNextPlayer()]--;
        }
        if (cell.pieces >= cell.neighbours.length) {
          this.ownedCells[this.playerInd]--;
          cell.neighbours.forEach(cell => {
            newFrontier.push(cell);
          })
          cell.pieces = 0;
        }
        attrs(cell.node, {
          'class': `hex ${cell.pieces > 0 ? `p${this.playerInd}` : ''} ${classes[cell.pieces]}`
        });
      });
      frontier = newFrontier;
      if (this.turn > 1 && this.ownedCells[this.getNextPlayer()] === 0) {
        this.winner = this.playerInd;
        middleText(`Player ${this.playerInd + 1} Wins`);
        main.classList.add('game-over');
        main.classList.add(`p${this.playerInd}`);
        return;
      }
    }
    this.clickLock = false;
  }

  handleCellClick(data) {
    const pointStr = data.target.dataset.point;
    if (pointStr) {
      const cell = this.get(...JSON.parse(pointStr));
      if (cell.node.classList.contains('zero') || !cell.node.classList.contains(`p${this.getNextPlayer()}`)) {
        if (this.clickLock) return;
        this.clickLock = true;
        this.addToCell(cell);
        this.turn++;
        this.playerInd = this.getNextPlayer();
      }
    } else {
      this.handleCellClick({ target: data.target.parentNode });
    }
  }
}

const runGame = size => {
  size--;
  append(emptyEl(main), emptyEl(board));
  attrs(board, {
    'transform-origin': 'center',
    transform: `scale(${1 / (1 + 2 * size)})`,
  });
  const grid = new Game(size);
};

const startGame = () => {
  numMenu([3, 4, 5, 6, 7, 8, 9], 'Select board size', runGame)
};

startGame();
