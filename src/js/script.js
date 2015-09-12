$(document).ready(function(){

    window.addEventListener('load', init);

    //a few master variables
    var painter;
    var bucket;
    var orientation='h';
    var tool="pen";

    function isTouchDevice(){
        return typeof window.ontouchstart !== 'undefined';
    }

    // requestAnimationFrame shim layer with setTimeout fallback
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function( callback ){
        window.setTimeout(callback, 1000 / 60);
      };
    })();

    /*************************************************************

            MAIN SKETCH OBJECT

    *************************************************************/

    var Sketch = function(options) {
      this.canvas = options.el;
      this.p_canvas = options.p_el;

      //ctx is for drawing, p_ctx is for saving
      this.ctx = this.canvas[0].getContext("2d");
      this.p_ctx = this.p_canvas[0].getContext("2d");
      //text area
      this.textarea=$('#text_tool')
      //text processing div
      this.tmp_txt_ctn=options.txt_ctn;

      //the points array
      this.points = [];
      //requestAnimationFrame render loop only runs if(isDrawing)
      this.isDrawing=false;
      
      this.setup();
      this.initEvents();

      // Setup render loop.
      requestAnimFrame(this.renderLoop.bind(this));
    };
    Sketch.prototype.setup = function() {
      //initialize white, so the fill tool can recognize
      this.p_ctx.rect(0,0,720,450);
      this.p_ctx.fillStyle="white";
      this.p_ctx.fill()
      //initialize options
      // ctx.lineWidth = options.size || Math.ceil(Math.random() * 35);
      this.ctx.lineCap = "round";
      this.ctx.lineWidth=4;
      this.ctx.strokeStyle="black";
      this.ctx.fillStyle="black";
    };
    Sketch.prototype.getPointsFromEvent = function(evt) {
      var point = {};
      if(evt.originalEvent.targetTouches) {
          // Prefer Touch Events
          point.x = evt.originalEvent.targetTouches[0].clientX;
          point.y = evt.originalEvent.targetTouches[0].clientY;
        } else {
          // Either Mouse event or Pointer Event
          point.x = evt.clientX;
          point.y = evt.clientY;
        }
        return point;
    }
    Sketch.prototype.scaleToCanvas = function(e) {
      var point=this.getPointsFromEvent(e);
      var x = point.x;
      var y = point.y;
      var scale=e.target.width/e.target.clientWidth;
      var offsetx=e.target.offsetParent.offsetLeft*scale+5-e.view.pageXOffset*scale;
      var offsety=e.target.offsetParent.offsetTop*scale+5-e.view.pageYOffset*scale;
      return {x:Math.round(x*scale-offsetx), y:Math.round(y*scale-offsety)}
    };
    //for the text tool, which is absolutely positioned
    Sketch.prototype.absolutePoints = function(event) {
        var point=this.getPointsFromEvent(event);
        var offsetx=event.target.offsetParent.offsetLeft+10-event.view.pageXOffset;
        var offsety=event.target.offsetParent.offsetTop+10-event.view.pageYOffset;
        return {x:Math.round(point.x-offsetx), y:Math.round(point.y-offsety)}
    }
    Sketch.prototype.initEvents = function() {
      var canvas = this.canvas;
      if (window.PointerEventsSupport) {
        // Add Pointer Event Listener
        canvas.on(pointerDownName, this.onPenDown.bind(this));
        canvas.on(pointerMoveName, this.onPenMove.bind(this));
        canvas.on(pointerUpName, this.onPenUp.bind(this));
        canvas.on(pointerCancelName, this.onPenUp.bind(this));
        canvas.on(pointerLeaveName, this.onPenUp.bind(this));
      } else {
        if(isTouchDevice()) {
        // Add Touch Listeners
            canvas.on('touchstart', this.onPenDown.bind(this));
            canvas.on('touchmove', this.onPenMove.bind(this));
            canvas.on('touchend', this.onPenUp.bind(this));
            canvas.on('touchcancel', this.onPenUp.bind(this));
            canvas.on('touchleave', this.onPenUp.bind(this));
        }
        else{
            // Add Mouse Listeners
            canvas.on('mousedown', this.onPenDown.bind(this));
            canvas.on('mousemove', this.onPenMove.bind(this));
            canvas.on('mouseup', this.onPenUp.bind(this));
            canvas.on('mousecancel', this.onPenUp.bind(this));
            canvas.on('mouseleave', this.onPenUp.bind(this));
        }
      }
    };

    Sketch.prototype.onPenDown = function(event) {
      event.preventDefault(); 
      //var width = event.pointerType === 'touch' ? (event.width || 10) : 4;
      this.isDrawing=true;
      if(tool=='text') {
        this.onFinishText();
      } else {
        var scaled=this.scaleToCanvas(event);
        this.points.push({x:scaled.x,y:scaled.y})
      }
      if(tool=='paint') {
          bucket.paintAt(scaled.x,scaled.y);
          return;
      }
    };

    Sketch.prototype.onPenMove = function(event) {
      event.preventDefault(); 
      if (this.isDrawing) {
        if(tool=='text') {
            var a = this.absolutePoints(event);
            this.points.push({x:a.x,y:a.y});
        } else {
            var scaled=this.scaleToCanvas(event);
            this.points.push({x:scaled.x,y:scaled.y})
        }
      }
    };

    Sketch.prototype.onPenUp = function(event) {
        //stops the render loop
        this.isDrawing=false;
        // Writing down to real canvas now
        this.p_ctx.drawImage(this.canvas[0], 0, 0);
        // Clearing tmp canvas
        this.ctx.clearRect(0, 0, this.canvas[0].width, this.canvas[0].height);
        //empties array of points
        this.points=[];
        bucket.colorLayerData = this.p_ctx.getImageData(0, 0, 720, 450);
    };

    Sketch.prototype.renderLoop = function(lastRender) {
        if (this.isDrawing && this.points.length>0) {
            var points = this.points;
            var tmp_ctx=this.ctx;
            //comment out this next line for crazy patterns
            tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
            switch(tool) {
                case 'pen':
                    this.onPaint(points,tmp_ctx);
                    break;
                case 'line':
                    this.onLine(points,tmp_ctx);
                    break;
                case 'rect':
                    this.onRect(points,tmp_ctx);
                    break;
                case 'circle':
                    this.onCircle(points,tmp_ctx);
                    break;
                case 'ellipse':
                    this.onEllipse(points,tmp_ctx);
                    break;
                case 'text':
                    this.onText(points,tmp_ctx);
                    break;
            }
        }
      requestAnimFrame(this.renderLoop.bind(this));
    };


    /*********************************************************************

                UI FUNCTIONS

    *********************************************************************/

    function init() {
        var canvas=$('canvas');
        //div for text processing
        var tmp_txt_ctn = document.createElement('div');
        tmp_txt_ctn.style.display = 'none';
        $('#sketch')[0].appendChild(tmp_txt_ctn);
        /*var tmp_canvas = $('<canvas/>',{
            id: 'tmp_canvas'
        }).attr({width:canvas[0].width,height:canvas[0].height})
        $('#sketch').append(tmp_canvas);*/
        /*var txt = $('<textarea/>',{
            id: 'text_tool'
        })
        $('#sketch').append(txt);*/
        var tmp_canvas=$('#tmp_canvas')
        painter = new Sketch({el: tmp_canvas, p_el: canvas, txt_ctn:tmp_txt_ctn});
        bucket = new Bucket();
    
        /**************
        TOOL SELECTION
        ***************/
        var activeTool = 0;
        var sliderOpen = false;
        var toolToogleSizes = ['600%','400%','0%','600%','600%','100%'];

        function slideAway(e) {
            if(orientation=='h') {
                //pointer events none so that the translated pin does not interfere with drawing
                e.children('.sub').css("pointer-events","none").animate({
                    opacity: "0",
                    width: "0"
                })
            }
            else {
                e.children('.sub').css("pointer-events","none").animate({
                    opacity: "0",
                    height: "0"
                })
            }
            sliderOpen = false;
        }

        function slideOpen(e, index) {
            var sub = e.children('.sub');
            sub.css("pointer-events","auto");
            if(orientation=='h') {
                sub.css("height","100%").animate({
                    width: toolToogleSizes[index],
                    opacity: "1"
                }, function() {
                    if(index==0) {
                        sizeslider.limiter=$(this).find('.bar')[0].clientWidth;
                    }
                    else if(index==4) {
                        colorslider.limiter=$(this).find('.bar')[0].clientWidth;
                    }
                    sliderOpen = true;
                })
            }
            else {
                sub.css("width","100%").animate({
                    height: toolToogleSizes[index],
                    opacity: "1"
                }, function() {
                    //set the limiters for the slider objects
                    if(index==0) {
                        sizeslider.limiter=$(this).find('.bar')[0].clientHeight*-1;
                    }
                    else if(index==4) {
                        colorslider.limiter=$(this).find('.bar')[0].clientHeight*-1;
                    }
                    sliderOpen = true;
                })
            }
        }

        //select a tool
        $(".tool").each( function(index) {
            $(this).on(click, function(event) {
                if(index==0){tool="pen";}
                else if(index==1){tool=subtool_selected;}
                else if(index==2){tool="paint";}
                else if(index==3){tool="text";}
                //stop propagation to document event listener
                event.stopPropagation();
                //close other tools if they are open
                $(this).siblings().addBack().each( function(idx){
                    if(index!=idx && activeTool==idx) {
                        slideAway($(this));
                    }
                    if(index<4) {
                        $(this).removeClass('active-tool');
                    }
                })
                //designate active tool
                $(this).addClass('active-tool');
                activeTool=index;
            })
            $(this).on(upclick, function(event) {
                //close by clicking on itself
                if(index==0 || index==1 || index==4 || index==5) {
                    if(activeTool==index && sliderOpen) {
                        slideAway($(this));
                        if(index==4) {
                            $(this).removeClass('active-tool');
                        }
                    }
                    //open slider
                    else {
                        slideOpen($(this),index); 
                    }
                }
            })
        })

        //document click closes the tool as well
        $(document).on(click, function(){
            $('#usertool').removeClass('active-tool');
            if(sliderOpen) {
                $('.sub').each( function(index) {
                    console.log(index)
                    if(index>2){
                        index++;
                        $(this).parent().removeClass('active-tool');
                    }
                    if(activeTool==index) {
                        slideAway($(this).parent());
                    }
                });
            }
        });

        $('#download').on(click, function() {
            console.log(painter.p_canvas)
            var dt = painter.p_canvas[0].toDataURL('image/jpeg');
            $(this)[0].href = dt;
        });

        /**************
        PEN SIZE SLIDER
        **************/
        var pin1 = $('#sizepin')[0];
        var sizeslider = new Slider(pin1, 'black', 0, true);

        pin1.addEventListener("changey", function(e) {
            var el=e.detail.target;
            var val=el.getAttribute('data-value');
            if(orientation=='h') {
                var text=Math.round(val/el.previousSibling.clientWidth*100)+1;
            } else {
                var text=Math.round(val/el.previousSibling.clientHeight*-100)+1;
            }
            if(text>99){text=99;}
            el.parentNode.previousSibling.childNodes[1].innerHTML=text;
            painter.ctx.lineWidth=text;
        },false);

        /********
          SHAPES
        *********/
        var subtool_selected="circle";
        $(".subtool").each(function(index) {
            $(this).on(click, function(event) {
                $(".subtool").removeClass('active-subtool');
                $(this).addClass('active-subtool');
                var svg=$(this).parent().parent().children('svg');                
                if(index==0) {
                    svg.children().remove();
                    $(SVG('circle'))
                        .attr('cx', 100)
                        .attr('cy', 100)
                        .attr('r', 60)
                        .attr('stroke', "black")
                        .attr('stroke-width', 16)
                        .attr("fill","none")
                        .appendTo(svg);
                    tool="circle";
                    subtool_selected="circle";
                }
                if(index==1) {
                    svg.children().remove();
                    $(SVG('polyline'))
                        .attr('points', "40,160 160,40")
                        .attr('stroke', "black")
                        .attr('stroke-width', 16)
                        .appendTo(svg);
                    tool="line";
                    subtool_selected="line";
                }
                if(index==2) {
                    svg.children().remove();
                    $(SVG('polyline'))
                        .attr('points', "40,40 40,160 160,160 160,40 32,40")
                        .attr('stroke', "black")
                        .attr('stroke-width', 16)
                        .attr("fill","none")
                        .appendTo(svg);
                    tool="rect";
                    subtool_selected="rect";
                }
                if(index==3) {
                    svg.children().remove();
                    $(SVG('ellipse'))
                        .attr('cx', 100)
                        .attr('cy', 100)
                        .attr('rx', 70)
                        .attr('ry', 35)
                        .attr('stroke', "black")
                        .attr('stroke-width', 16)
                        .attr("fill","none")
                        .appendTo(svg);
                    tool="ellipse";
                    subtool_selected="ellipse";
                }
            })
        })
        function SVG(tag){
           return document.createElementNS('http://www.w3.org/2000/svg', tag);
        }

        /***************
          COLOR SLIDER
        ****************/
        var pin2 = $('#colorpin')[0];
        var colorslider = new Slider(pin2, 'black', 0, false); //arguments are element, initial color, initial pos, and color-changing

        pin2.addEventListener("changey", function(e) {
            var el=e.detail.target;
            var val=el.getAttribute('data-value');
            if(orientation=='h') {
                var text=Math.round(val/el.previousSibling.clientWidth*99)+1;
            } else {
                var text=Math.round(val/el.previousSibling.clientHeight*-99)+1;
            }
            if(text>99){text=99;}
            //scale to 360 for HSV
            var col = HSVtoRGB(text*.0085,1,1);
            
            if(text==1) {
                col={r:0,g:0,b:0};
            }
            else if(text==99) {
                col={r:255,g:255,b:255};
            }
            var color = 'rgb('+col.r+','+col.g+','+col.b+')';
            pin2.style.backgroundColor=color;
            //painter.pen.color=color;
            painter.ctx.strokeStyle=color;
            painter.ctx.fillStyle=color;
            painter.textarea[0].style.color=color;
            bucket.curColor.r=col.r;
            bucket.curColor.g=col.g;
            bucket.curColor.b=col.b;

        },false)

        
        var resize = function() {
            if(sliderOpen==true) {
                slideAway($('.active-tool'));
            }
            if(window.innerWidth>window.innerHeight) {
                if(orientation=='v'){
                    switchTranslate($('#sizepin')[0]);
                    orientation='h';
                    rotator(-90);
                }
                var w=$('#sketch').width();
                canvas[0].style.width=w+'px';
                canvas[0].style.height=w/1.6+'px';
                tmp_canvas[0].style.width=w+'px';
                tmp_canvas[0].style.height=w/1.6+'px';
                $('#toolbar')[0].style.width='10%';
                $('#toolbar')[0].style.height=canvas.outerHeight()+'px';
            }
            //vertical arrangement
            else{
                if(orientation=='h'){
                    switchTranslate($('#sizepin')[0]);
                    orientation='v';
                    rotator(90);
                }
                var h=$('#sketch').height();
                canvas[0].style.height=h+'px';
                canvas[0].style.width=h/1.6+'px';
                tmp_canvas[0].style.height=h+'px';
                tmp_canvas[0].style.width=h/1.6+'px';
                $('#toolbar')[0].style.height='10%';
                $('#toolbar')[0].style.width=canvas.outerWidth()+'px';
            }
        }
        var switchTranslate = function(element) {
            var val=element.getAttribute('data-value');
            if(orientation=='v') {
                  var transformStyle = 'translateX('+ (val*-1) +'px) translateY(0px)';
            }
            else if(orientation=='h') {
              var transformStyle = 'translateY('+ (val*-1) +'px) translateX(0px)';
            }
            element.style.msTransform = transformStyle;
            element.style.MozTransform = transformStyle;
            element.style.webkitTransform = transformStyle;
            element.style.transform = transformStyle;

            //change the Slider positions to negative
            sizeslider.initialPos = sizeslider.initialPos * -1;
            sizeslider.lastPos = sizeslider.lastPos * -1;
            sizeslider.lastHolderPos = sizeslider.lastHolderPos * -1;
        }
        var rotator = function(deg) {
            var ctx = canvas[0].getContext("2d");
            var tempCanvas = document.createElement("canvas");
            var tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = canvas[0].width;
            tempCanvas.height = canvas[0].height;
            // put our data onto the temp canvas
            tempCtx.drawImage(canvas[0],0,0);
            if(deg==90) {
                canvas[0].width='450';
                canvas[0].height='720';
            }
            else {
                canvas[0].height='450';
                canvas[0].width='720';
            }
            ctx.lineCap="round";
            //save the state
            ctx.save();
            //center
            ctx.translate(canvas[0].width/2, canvas[0].height/2);
            // Rotate it
            ctx.rotate(deg*Math.PI/180);
            //de-center
            ctx.translate(-canvas[0].height/2, -canvas[0].width/2);
            // Finally draw the image data from the temp canvas.
            ctx.drawImage(tempCanvas,0,0);
            //restore the state
            ctx.restore();
        }

        //start off with a resize
        $( window ).resize(resize);
        window.addEventListener("orientationchange", resize, false);
        resize();

        
    }//end init

    /*******************
    SOME SETUp VARIABLES
    ********************/

    //for pointer support
    var pointerDownName = 'MSPointerDown';
    var pointerUpName = 'MSPointerUp';
    var pointerMoveName = 'MSPointerMove';
    var pointerCancelName = 'MSPointerCancel';
    var pointerLeaveName = 'MSPointerLeave'

    if(window.PointerEvent) {
        pointerDownName = 'pointerdown';
        pointerUpName = 'pointerup';
        pointerMoveName = 'pointermove';
        pointerCancelName = 'pointercancel';
        pointerLeaveName = 'pointerleave';
    }

    // create strings for UI click events
    window.PointerEventsSupport = false;
    var click="mousedown";
    var upclick="mouseup"
    if(window.PointerEvent || window.navigator.msPointerEnabled) {
        window.PointerEventsSupport = true;
        click=pointerDownName;
        upclick=pointerUpName;
    }
    else {
        if (isTouchDevice()) {click="touchstart";upclick="touchend"}
    }


    /***************************************************************

            SLIDER OBJECT

    ****************************************************************/

    function Slider(element, color, initial, colorchange) {
        var isAnimating = false;
        this.lastPos = initial;
        this.initialPos = initial;
        this.lastHolderPos = initial;
        var myEvent = new CustomEvent("changey", {'detail':{'target':element,'initial':initial}});

        this.limiter=0;

        if (orientation=='v') {
          this.limiter=element.parentNode.clientHeight*-1;
        }
        else if(orientation=='h') {
          this.limiter=element.parentNode.clientWidth;
        }
  
        // Handle the start of gestures 
        this.handleGestureStart = function(evt) {
            evt.preventDefault();
            var point = getGesturePointFromEvent(evt);
            
            if(orientation=='v') {
              this.initialPos = point.y;
            }
            else if(orientation=='h') {
              this.initialPos = point.x;
            }
            
            //event listeners added only on start. AKA no multitouch
            if (!window.PointerEventsSupport) {
                // Add Mouse Listeners
                document.addEventListener('mousemove', this.handleGestureMove, true);
                document.addEventListener('mouseup', this.handleGestureEnd, true);
                document.addEventListener('mousecancel', this.handleGestureEnd, true);
                document.addEventListener('touchmove', this.handleGestureMove, true);
                document.addEventListener('touchend', this.handleGestureEnd, true);
                document.addEventListener('touchcancel', this.handleGestureEnd, true);
            }
            else {
                elementHold.addEventListener(pointerMoveName, this.handleGestureMove, true);
                elementHold.addEventListener(pointerUpName, this.handleGestureEnd, true);
                elementHold.addEventListener(pointerCancelName, this.handleGestureEnd, true);
            }

            if(colorchange==true) {
                element.style.backgroundColor="yellow";
            }

        }.bind(this);

        this.handleGestureEnd = function(evt) {
          evt.preventDefault();

          if(evt.targetTouches && evt.targetTouches.length > 0) {
            return;
          }
          
          //event listeners removed
          if (!window.PointerEventsSupport) {  
            // Remove Mouse Listeners
            document.removeEventListener('mousemove', this.handleGestureMove, true);
            document.removeEventListener('mouseup', this.handleGestureEnd, true);
            document.removeEventListener('mousecancel', this.handleGestureEnd, true);
            document.removeEventListener('touchmove', this.handleGestureMove, true);
            document.removeEventListener('touchend', this.handleGestureEnd, true);
            document.removeEventListener('touchcancel', this.handleGestureEnd, true);
          }
          else {
            elementHold.removeEventListener(pointerMoveName, this.handleGestureMove, true);
            elementHold.removeEventListener(pointerUpName, this.handleGestureEnd, true);
            elementHold.removeEventListener(pointerCancelName, this.handleGestureEnd, true);
          }

          if(colorchange==true) {
            element.style.backgroundColor=color;
          }
          
          isAnimating = false;
            this.lastHolderPos = this.lastHolderPos + -(this.initialPos - this.lastPos);
            this.lastHolderPos=this.limitValueToSlider(this.lastHolderPos);
        }.bind(this);

        this.handleGestureMove = function(evt) {
          evt.preventDefault();
          var point = getGesturePointFromEvent(evt);
          if(orientation=='v') {
            this.lastPos = point.y;
          }
          else if(orientation=='h') {
            this.lastPos = point.x;
          }

          if(isAnimating) {
            return;
          }

          isAnimating = true;
          window.requestAnimFrame(this.onAnimFrame);

        }.bind(this);


        function getGesturePointFromEvent(evt) {
          var point = {};

          if(evt.targetTouches) {
              // Prefer Touch Events
              point.x = evt.targetTouches[0].clientX;
              point.y = evt.targetTouches[0].clientY;
            } else {
              // Either Mouse event or Pointer Event
              point.x = evt.clientX;
              point.y = evt.clientY;
            }

            return point;
        }

        this.onAnimFrame = function() {
          if(!isAnimating) {
            return;
          }
            var newTransform={};
            var newTransform = this.lastHolderPos + -(this.initialPos - this.lastPos);
            newTransform = this.limitValueToSlider(newTransform);
            element.setAttribute('data-value',newTransform);
          element.dispatchEvent(myEvent);

            if(orientation=='v') {
              var transformStyle = 'translateY('+newTransform+'px)';
            }
            else if(orientation=='h') {
                
              var transformStyle = 'translateX('+newTransform+'px)';
            }
          element.style.msTransform = transformStyle;
          element.style.MozTransform = transformStyle;
          element.style.webkitTransform = transformStyle;
          element.style.transform = transformStyle;
          
          isAnimating = false;
        }.bind(this);

        this.limitValueToSlider = function(value) {
            if(orientation=='h') {
              if(value>this.limiter) {
                value=this.limiter;
              } else if(value<0) {
                value=0;
              }
            } else {
              if(value<this.limiter) {
                value=this.limiter;
              } else if(value>0) {
                value=0;
              }
            }
          return value;
        }.bind(this);

        elementHold=element;
        // Check if pointer events are supported.
        if (window.PointerEventsSupport) {
            // Add Pointer Event Listener
            elementHold.addEventListener(pointerDownName, this.handleGestureStart, true);
          } else {
            // Add Touch Listeners
            elementHold.addEventListener('touchstart', this.handleGestureStart, true);

            // Add Mouse Listeners
            elementHold.addEventListener('mousedown', this.handleGestureStart, true);
          }
  
    }//end Slider object




    /********************************************************

         PEN, SHAPE, TEXT TOOL

            by Rishabh

         http://codetheory.in/different-tools-for-our-sketching-application/

    ********************************************************/
    Sketch.prototype.onPaint = function(points,tmp_ctx) {

        if (points.length < 3) {
            var b = points[0];
            tmp_ctx.beginPath();
            tmp_ctx.moveTo(b.x, b.y);
            tmp_ctx.lineTo(b.x+1, b.y+1);
            tmp_ctx.stroke();
            //tmp_ctx.fillStyle = this.pen.color;
            //tmp_ctx.arc(b.x, b.y, tmp_ctx.lineWidth / 2, 0, Math.PI * 2, !0);
            //tmp_ctx.fill();
            tmp_ctx.closePath();
            
            return;
        }
        
        tmp_ctx.beginPath();
        tmp_ctx.moveTo(points[0].x, points[0].y);
        
        for (var i = 1; i < points.length - 2; i++) {
            var c = (points[i].x + points[i + 1].x) / 2;
            var d = (points[i].y + points[i + 1].y) / 2;
            
            tmp_ctx.quadraticCurveTo(points[i].x, points[i].y, c, d);
        }
        
        // For the last 2 points
        tmp_ctx.quadraticCurveTo(
            points[i].x,
            points[i].y,
            points[i + 1].x,
            points[i + 1].y
        );
        tmp_ctx.stroke();
        
    };

    Sketch.prototype.onLine = function(points,tmp_ctx) {
        tmp_ctx.beginPath();
        tmp_ctx.moveTo(points[0].x, points[0].y);
        tmp_ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
        tmp_ctx.stroke();
        tmp_ctx.closePath();
    };

    Sketch.prototype.onRect = function(points,tmp_ctx) {
        var x = Math.min(points[points.length-1].x, points[0].x);
        var y = Math.min(points[points.length-1].y, points[0].y);
        var width = Math.abs(points[points.length-1].x - points[0].x);
        var height = Math.abs(points[points.length-1].y - points[0].y);
        tmp_ctx.strokeRect(x, y, width, height);
    };

    Sketch.prototype.onCircle = function(points,tmp_ctx) {
        var x = (points[points.length-1].x + points[0].x) / 2;
        var y = (points[points.length-1].y + points[0].y) / 2;

         var radius = Math.max(
            Math.abs(points[points.length-1].x - points[0].x),
            Math.abs(points[points.length-1].y - points[0].y)
        ) / 2;
     
        tmp_ctx.beginPath();
        tmp_ctx.arc(x, y, radius, 0, Math.PI*2, false);
        // tmp_ctx.arc(x, y, 5, 0, Math.PI*2, false);
        tmp_ctx.stroke();
        tmp_ctx.closePath();
    };

    Sketch.prototype.onEllipse = function(points,ctx) {
        //http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
        var x = Math.min(points[points.length-1].x, points[0].x);
        var y = Math.min(points[points.length-1].y, points[0].y);
        var w = Math.abs(points[points.length-1].x - points[0].x);
        var h = Math.abs(points[points.length-1].y - points[0].y);

        var kappa = .5522848;
        ox = (w / 2) * kappa, // control point offset horizontal
        oy = (h / 2) * kappa, // control point offset vertical
        xe = x + w,           // x-end
        ye = y + h,           // y-end
        xm = x + w / 2,       // x-middle
        ym = y + h / 2;       // y-middle

        ctx.beginPath();
        ctx.moveTo(x, ym);
        ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
        ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
        ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
        ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
        ctx.closePath();
        ctx.stroke();
    };

    Sketch.prototype.onText = function(points,ctx) {
        var textarea=this.textarea;
        var x = Math.min(points[points.length-1].x, points[0].x);
        var y = Math.min(points[points.length-1].y, points[0].y);
        var width = Math.abs(points[points.length-1].x - points[0].x);
        var height = Math.abs(points[points.length-1].y - points[0].y);

        textarea.css({"left":x + 'px',"top":y + 'px',"width":width + 'px',"height":height + 'px',"display":"block"})
    };

    Sketch.prototype.onFinishText = function() {
        var textarea=this.textarea[0];
        var tmp_ctx=this.ctx;
        var tmp_txt_ctn=this.tmp_txt_ctn;

        var lines = textarea.value.split('\n');
        var processed_lines = [];
        
        for (var i = 0; i < lines.length; i++) {
            var chars = lines[i].length;
            
            for (var j = 0; j < chars; j++) {
                var text_node = document.createTextNode(lines[i][j]);
                tmp_txt_ctn.appendChild(text_node);
                
                // Since tmp_txt_ctn is not taking any space
                // in layout due to display: none, we gotta
                // make it take some space, while keeping it
                // hidden/invisible and then get dimensions
                tmp_txt_ctn.style.position   = 'absolute';
                tmp_txt_ctn.style.visibility = 'hidden';
                tmp_txt_ctn.style.display    = 'block';
                
                var width = tmp_txt_ctn.offsetWidth;
                var height = tmp_txt_ctn.offsetHeight;
                
                tmp_txt_ctn.style.position   = '';
                tmp_txt_ctn.style.visibility = '';
                tmp_txt_ctn.style.display    = 'none';
                
                // Logix
                // console.log(width, parseInt(textarea.style.width));
                if (width > parseInt(textarea.style.width)) {
                    break;
                }
            }
            
            processed_lines.push(tmp_txt_ctn.textContent);
            tmp_txt_ctn.innerHTML = '';
        }
        
        var ta_comp_style = getComputedStyle(textarea);
        var fs = ta_comp_style.getPropertyValue('font-size');
        var ff = ta_comp_style.getPropertyValue('font-family');
        
        //get the scale
        var scale=this.canvas[0].width/this.canvas[0].clientWidth;
        //change the font size to scale
        fs=Math.round(parseInt(fs)*scale)+'px';

        tmp_ctx.font = fs + ' ' + ff;
        tmp_ctx.textBaseline = 'top';

        for (var n = 0; n < processed_lines.length; n++) {
            var processed_line = processed_lines[n];
            
            tmp_ctx.fillText(
                processed_line,
                //scale the placement of the text finally
                Math.round(scale*parseInt(textarea.style.left)),
                Math.round(scale*(parseInt(textarea.style.top) + n*parseInt(fs)))
            );
        }
        
        // clearInterval(sprayIntervalID);
        textarea.style.display = 'none';
        textarea.value = '';
    }





    /******************************************************

        FILL BUCKET TOOL
        
        by William Malone

        http://www.williammalone.com/articles/html5-canvas-javascript-paint-bucket-tool/

    ********************************************************/

    var Bucket = function() {

        this.canvasWidth=720;
        this.canvasHeight=450;
        this.colorLayerData = painter.p_ctx.getImageData(0, 0, this.canvasWidth, this.canvasHeight);
        this.curColor = {r:0,g:0,b:0};
    };

    Bucket.prototype.matchStartColor = function (pixelPos, startR, startG, startB) {

        var r = this.colorLayerData.data[pixelPos],
            g = this.colorLayerData.data[pixelPos + 1],
            b = this.colorLayerData.data[pixelPos + 2];
            //a = this.outlineLayerData.data[pixelPos + 3];

        // If the current pixel matches the clicked color
        if (r === startR && g === startG && b === startB) {
            return true;
        } else {
            return false
        }

    };

    Bucket.prototype.colorPixel = function (pixelPos, r, g, b, a) {

        this.colorLayerData.data[pixelPos] = r;
        this.colorLayerData.data[pixelPos + 1] = g;
        this.colorLayerData.data[pixelPos + 2] = b;
        this.colorLayerData.data[pixelPos + 3] = a !== undefined ? a : 255;
    };

    Bucket.prototype.floodFill = function (startX, startY, startR, startG, startB) {
        var newPos,
            x,
            y,
            pixelPos,
            reachLeft,
            reachRight,
            drawingBoundLeft = 0,
            drawingBoundTop = 0,
            drawingBoundRight = this.canvasWidth - 1,
            drawingBoundBottom = this.canvasHeight - 1,
            pixelStack = [[startX, startY]];

        while (pixelStack.length) {
            newPos = pixelStack.pop();
            x = newPos[0];
            y = newPos[1];
            // Get current pixel position
            pixelPos = (y * this.canvasWidth + x) * 4;

            // Go up as long as the color matches and are inside the canvas
            while (y >= drawingBoundTop && this.matchStartColor(pixelPos, startR, startG, startB)) {
                y -= 1;
                pixelPos -= this.canvasWidth * 4;
            }

            pixelPos += this.canvasWidth * 4;
            y += 1;
            reachLeft = false;
            reachRight = false;

            // Go down as long as the color matches and in inside the canvas
            while (y <= drawingBoundBottom && this.matchStartColor(pixelPos, startR, startG, startB)) {
                y += 1;

                this.colorPixel(pixelPos, this.curColor.r, this.curColor.g, this.curColor.b);

                if (x > drawingBoundLeft) {
                    if (this.matchStartColor(pixelPos - 4, startR, startG, startB)) {
                        if (!reachLeft) {
                            // Add pixel to stack
                            pixelStack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    } else if (reachLeft) {
                        reachLeft = false;
                    }
                }

                if (x < drawingBoundRight) {
                    if (this.matchStartColor(pixelPos + 4, startR, startG, startB)) {
                        if (!reachRight) {
                            // Add pixel to stack
                            pixelStack.push([x + 1, y]);
                            reachRight = true;
                        }
                    } else if (reachRight) {
                        reachRight = false;
                    }
                }

                pixelPos += this.canvasWidth * 4;
            }
        }
    };

    // Start painting with paint bucket tool starting from pixel specified by startX and startY
    Bucket.prototype.paintAt = function (startX, startY) {

        var pixelPos = (startY * this.canvasWidth + startX) * 4,
            r = this.colorLayerData.data[pixelPos],
            g = this.colorLayerData.data[pixelPos + 1],
            b = this.colorLayerData.data[pixelPos + 2],
            a = this.colorLayerData.data[pixelPos + 3];

        if (r === this.curColor.r && g === this.curColor.g && b === this.curColor.b) {
            // Return because trying to fill with the same color
            return;
        }
        this.floodFill(startX, startY, r, g, b);

        painter.p_ctx.putImageData(this.colorLayerData, 0, 0);
    };


    //HSVtoRGB from http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
    function HSVtoRGB(h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
            s = h.s, v = h.v, h = h.h;
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }



});