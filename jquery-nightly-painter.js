$.fn.nightlyPainter = function(opts) {
  this.init = function(opts) {
    this.renderFunction = this.updateCanvasByLine;
    this.context = this[0].getContext("2d");	
    this.context.strokeStyle = "#000000";
    this.context.lineWidth = 3;

    this.touchSupported = Modernizr.touch;
    this.lastMousePoint = {x:0, y:0};
    if (this.touchSupported) {
      this.mouseDownEvent = "touchstart";
      this.mouseMoveEvent = "touchmove";
      this.mouseUpEvent = "touchend";
    }
    else {
      this.mouseDownEvent = "mousedown";
      this.mouseMoveEvent = "mousemove";
      this.mouseUpEvent = "mouseup";
    }

    this.bind(this.mouseDownEvent, this.onCanvasMouseDown());

    if (opts) {
      this.processOptions(opts);
    }

    return this;
  }

  this.processOptions = function (opts) {
    for(var key in opts) {
      var value = opts[key];
      switch(key) {
        case "strokeStyle":
          this.setStrokeStyle(value);
        case "lineWidth":
          this.setLineWidth(value);
      }
    }
  }

  this.setStrokeStyle = function (value) {
    this.context.strokeStyle = value;
  }

  this.setLineWidth = function (value) {
    this.context.lineWidth = value;
  }

  this.onCanvasMouseDown = function () {
    var self = this;
    return function(event) {
      self.mouseMoveHandler = self.onCanvasMouseMove();
      self.mouseUpHandler = self.onCanvasMouseUp();

      $(document).bind( self.mouseMoveEvent, self.mouseMoveHandler );
      $(document).bind( self.mouseUpEvent, self.mouseUpHandler );

      self.updateMousePosition( event );
      self.renderFunction( event );
    };
  };

  this.onCanvasMouseMove = function () {
    var self = this;
    return function(event) {

      self.renderFunction( event );
      event.preventDefault();
      return false;
    };
  };

  this.onCanvasMouseUp = function (event) {
    var self = this;
    return function(event) {

      $(document).unbind( self.mouseMoveEvent, self.mouseMoveHandler );
      $(document).unbind( self.mouseUpEvent, self.mouseUpHandler );

      self.mouseMoveHandler = null;
      self.mouseUpHandler = null;
    };
  };

  this.updateMousePosition = function (event) {
    var target;
    if (this.touchSupported) {
      target = event.originalEvent.touches[0]
    }
    else {
      target = event;
    }

    var offset = this.offset();
    this.lastMousePoint.x = target.pageX - offset.left;
    this.lastMousePoint.y = target.pageY - offset.top;

  };

  this.updateCanvasByLine = function (event) {
    this.context.beginPath();
    this.context.moveTo( this.lastMousePoint.x, this.lastMousePoint.y );
    this.updateMousePosition( event );
    this.context.lineTo( this.lastMousePoint.x, this.lastMousePoint.y );
    this.context.stroke();
  };

  this.updateCanvasByBrush = function (event) {
    var halfBrushW = this.brush.width/2;
    var halfBrushH = this.brush.height/2;

    var start = { x:this.lastMousePoint.x, y: this.lastMousePoint.y };
    this.updateMousePosition( event );
    var end = { x:this.lastMousePoint.x, y: this.lastMousePoint.y };

    var distance = parseInt( Trig.distanceBetween2Points( start, end ) );
    var angle = Trig.angleBetween2Points( start, end );

    var x,y;

    for ( var z=0; (z<=distance || z==0); z++ )
    {
      x = start.x + (Math.sin(angle) * z) - halfBrushW;
      y = start.y + (Math.cos(angle) * z) - halfBrushH;
      this.context.drawImage(this.brush, x, y);
    };
  };

  this.toString = function () {
    var dataString = this.canvas.get(0).toDataURL("image/png");
    var index = dataString.indexOf( "," )+1;
    dataString = dataString.substring( index );
    return dataString;
  };

  this.toDataURL = function () {
    var dataString = this[0].toDataURL("image/png");
    return dataString;
  };

  this.clear = function () {
    this.context.clearRect( 0, 0, this.width(), this.height() );
  };

  return this.init(opts);
};
