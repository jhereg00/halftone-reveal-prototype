/**
 *  Creates a canvas element that masks an image using halftone-style dots
 */

// requirements

// settings
var DOT_SIZE = 16;
// SIZE_STOPS determines stop points for transition
// first number is where it starts growing from 0
// second number is where it reaches 1
// third number is where it starts shrinking from 1
// fourth number is where it gets back to 0
var SIZE_STOPS = [0,.4,1,1.2];

// easing function
function invertedQuadratic (percentage) {
  return (percentage < .5 ? -2 : 2) * (percentage - .5) * (percentage - .5) + .5;
}
function halfExponent (percentage) {
  // if (percentage < .5)
  //   return Math.sqrt(2 * percentage) / 2;
  // return 1 - (Math.sqrt(-2 * percentage + 2) / 2);
  if (percentage < .5)
    return 2 * (Math.sqrt(2 * percentage) - .5) - .5;
  return 2 * (1.5 - Math.sqrt(-2 * percentage + 2)) - .5;
}
function halfExponentSteep (percentage) {
if (percentage < .5)
  return Math.sqrt(2 * percentage) - .5;
return 1.5 - Math.sqrt(-2 * percentage + 2);
}

/**
 *  the Dot class
 */
var Dot = function (gridX, gridY, halftoneReveal) {
  this.x = gridX + (gridY % 2 == 1 ? 1 : 0);
  this.y = gridY;
  // pixel x,y
  this.ctxX = this.x * DOT_SIZE + DOT_SIZE / 2;
  this.ctxY = this.y * DOT_SIZE + DOT_SIZE / 2;

  // parent halftoneReveal
  this.halftoneReveal = halftoneReveal;

  this.maxRadius = DOT_SIZE;
  if (this.x === 0 || this.x >= this.halftoneReveal.dotsX - 1)
    this.maxRadius /= 2;
  if (this.y === 0 || this.y >= this.halftoneReveal.dotsY - 1)
    this.maxRadius /= 2;

  // determine when to draw
  this.percentage = (this.x + this.y) / (this.halftoneReveal.dotsX + this.halftoneReveal.dotsY);
}
Dot.prototype = {
  draw: function (ctx, percentage) {
    percentage = percentage || .5;
    ctx.save();
    var rad = this.getRadiusByPercentage(percentage);
    ctx.moveTo(this.ctxX, this.ctxY - rad);
    ctx.arc(this.ctxX, this.ctxY, rad, 0, 2 * Math.PI, false);
    ctx.restore();
  },
  getRadiusByPercentage: function (percentage) {
    // determine effective percentage
    // percentage = percentage + .5 - this.percentage;
    percentage = halfExponent(percentage) + .5 - this.percentage;
    if (percentage < SIZE_STOPS[0])
      return 0;
    else if (percentage < SIZE_STOPS[1])
      return (percentage - SIZE_STOPS[0]) / (SIZE_STOPS[1] - SIZE_STOPS[0]) * this.maxRadius;
    else if (percentage < SIZE_STOPS[2])
      return this.maxRadius;
    else if (percentage < SIZE_STOPS[3])
      return (1 - (percentage - SIZE_STOPS[2]) / (SIZE_STOPS[3] - SIZE_STOPS[2])) * this.maxRadius;
    else
      return 0;
  }
}

/**
 *  the HalftoneReveal class
 */
var HalftoneReveal = function (baseElement, ratio) {
  this.baseElement = baseElement;
  this.canvas = document.createElement('canvas');
  this.canvas.width = this.baseElement.offsetWidth;
  this.canvas.height = ratio ? this.baseElement.offsetWidth * ratio : this.baseElement.offsetWidth / 2;
  this.baseElement.appendChild(this.canvas);
  this.ctx = this.canvas.getContext('2d');

  this.image = this.baseElement.getElementsByTagName('IMG')[0];
  this.image.remove();
  this.imageRatio = this.image.height / this.image.width;
  this.imagePos = [
    0,
    (this.canvas.height - (this.canvas.width * this.imageRatio)) / 2,
    this.canvas.width,
    this.canvas.width * this.imageRatio
  ]

  // make the dots
  this.dotsX = Math.floor(this.canvas.width / DOT_SIZE);
  this.dotsY = Math.floor(this.canvas.height / DOT_SIZE);
  this.dots = [];
  for (var i = 0, len = this.dotsX * this.dotsY; i < len; i+=2) {
    this.dots.push(new Dot(i % this.dotsX, Math.floor(i / this.dotsX), this));
  }

  this.measure();
}
HalftoneReveal.prototype = {
  draw: function (percentage) {
    // start by putting percentage through a custom curve
    // if (percentage < .5)
    //   percentage = percentage * percentage * 2;
    // else
    //   percentage = -2 * (percentage - 1) * (percentage - 1) + 1;
    // percentage = halfExponent(percentage);
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.ctx.save();
    this.ctx.beginPath();
    for (var i = 0, len = this.dots.length; i < len; i++) {
      this.dots[i].draw(this.ctx, percentage);
    }
    this.ctx.fill();
    // draw the image
    this.ctx.globalCompositeOperation = "source-in";
    this.ctx.drawImage(this.image,this.imagePos[0],this.imagePos[1],this.imagePos[2],this.imagePos[3]);
    this.ctx.restore();
  },
  measure: function () {
    // TODO: make true page offset
    var po = this.baseElement.offsetTop;
    this.top = po - window.innerHeight;
    this.bottom = po + this.baseElement.offsetHeight;
    this.height = this.bottom - this.top;
  },
  getPercentageFromScroll: function () {
    // TODO: make cross browser friendly
    var scrollY = window.scrollY;
    return (scrollY - this.top) / (this.height);
  }
}

// auto-init
var htrEl = document.querySelector('.halftone-reveal');
var htr = new HalftoneReveal(htrEl);

// listen for scroll
window.addEventListener('scroll', function (e) {
  var scrollPerc = htr.getPercentageFromScroll();
  if (scrollPerc >= 0 && scrollPerc <= 1)
    htr.draw(scrollPerc);
});
