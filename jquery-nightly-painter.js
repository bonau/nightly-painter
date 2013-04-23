$.fn.nightlyPainter = function(opts) {
  var defaultOptions = {
    strokeStyle: "#666666",
    lineWidth: 2,
    brush: new Image(),
  };

  this.init = function(opts) {
    this.renderFunction = this.updateCanvasByLine;
    this.context = this[0].getContext("2d");	
    this.undoStack = [];
    this.redoStack = [];

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

    $.extend(defaultOptions, opts);
    this.processOptions(defaultOptions);

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

  this.setBrush = function (image) {
    if (image instanceof Image) {
      this.brush = image;
    }
  }

  this.setBrushByURL = function (url) {
    var self = this;
    var image = new Image();
    image.onload = function() {
      self.brush = this;
      self.brushMode(); // TODO: deal with cancellation
    }
    image.src = url;
  }

  this.onCanvasMouseDown = function () {
    var self = this;
    return function(event) {
      self.saveUndoState();

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
    this.saveUndoState();
    this.context.clearRect( 0, 0, this.width(), this.height() );
  };

  this.saveUndoState = function (opts) {
    if (!opts || !opts.callFromRedo) {
      this.clearRedoState();
    };
    this.undoStack.push(this.toDataURL());
  };

  this.saveRedoState = function () {
    this.redoStack.push(this.toDataURL());
  };

  this.clearRedoState = function () {
    this.redoStack = [];
  };

  this.undo = function () {
    var dataURL = this.undoStack.pop();
    if (dataURL)
    {
      this.saveRedoState();
      var oldGlobalCompositeOperation = this.context.globalCompositeOperation;
      this.readDataURL(dataURL);
      this.context.globalCompositeOperation = oldGlobalCompositeOperation;
    }
  };

  this.redo = function () {
    var dataURL = this.redoStack.pop();
    if (dataURL)
    {
      this.saveUndoState({callFromRedo: true});
      var oldGlobalCompositeOperation = this.context.globalCompositeOperation;
      this.readDataURL(dataURL);
      this.context.globalCompositeOperation = oldGlobalCompositeOperation;
    }
  };

  this.readDataURL = function(dataURL) {
    if (dataURL)
    {
      var imageObj = new Image();
      var self = this;
      imageObj.onload = function() {
        self.context.globalCompositeOperation = 'source-over';
        self.context.clearRect(0, 0, self.width(), self.height());
        self.context.drawImage(this, 0, 0);
      };
      imageObj.src = dataURL;
    }
  }

  this.download = function () {
    var dataURL = this.toDataURL();

    // init global tools
    window.URL = window.webkitURL || window.URL;
    window.BlobBuilder = window.Blob || window.BlobBuilder ||
                         window.WebKitBlobBuilder || window.MozBlobBuilder;

    // create data link
    var a = document.createElement('a');
    a.download = 'chat9-' +  $.now() + '.png';
    $(a).hide();
    a.href = dataURL;
    a.textContent = 'Download';
    a.dataset.downloadurl = ["image/png", a.download.toString(), a.href.toString()].join(":");
    document.body.appendChild(a);

    // force invoke click event to data link
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("click", true, true, window,
      0, 0, 0, 0, 0, false, false, false, false, 0, null);
    var allowDefault = a.dispatchEvent(evt);
  };

  this.setRenderFunction = function (name) {
    if (this[name]) {
      this.renderFunction = this[name];
    }
  };

  this.eraserMode = function () {
    this.setRenderFunction('updateCanvasByLine');
    this.context.globalCompositeOperation = 'destination-out';
    return true;
  };

  this.lineMode = function () {
    this.setRenderFunction('updateCanvasByLine');
    this.context.globalCompositeOperation = 'source-over';
    return true;
  };

  this.brushMode = function () {
    if (this.brush instanceof Image) {
      this.setRenderFunction('updateCanvasByBrush');
      this.context.globalCompositeOperation = 'source-over';
      return true;
    }
    return false;
  };

  this.readFile = function(e) {
    window.URL = window.URL || window.webkitURL;
    var fileField = document.createElement("input");
    var self = this;
    fileField.type = "file";
    fileField.onchange = function(e) {
      var target = $(e.target);
      var file = target.prop('files')[0];
      self.readDataURL(window.URL.createObjectURL(file));
    };
    $(fileField).click();
  };

  return this.init(opts);
};
