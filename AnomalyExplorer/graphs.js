/*
 * 
 
 AnomalyExplorer

Copyright (c) Tiina Vainio and Harri Siirtola, University of Tampere

Distributed under the MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

 */


var AE = (function(module) {
  
  function Graph(id) {
    var id = id;
    var signal = null;
    var canvas = document.getElementById(id);
    
    var fontSize = 10;
    var leftMargin = 40;
    var rightMargin = 5;
    var bottomMargin = fontSize * 2 + 5;
    var topMargin = 5;
    
    var canvasHeight;
    var canvasWidth;
    var graphHeight;
    var graphWidth;
    var xScale;
    var yScale;
    var xTranslation;
    var yTranslation;
    var maxValBaseline;
    var minValBaseline;
    var timeBaseline;
    var medianBaseline;
    
    var xLeftMost, xRightMost;
    
    var zoomX = 0;
    var zoomLevel = 1;
    var maxZoomLevel = 10;
    var prevZoomLevel = 1;
    
    var xValueShown = -1;
    
    calculateComponentPlacement();
    
    function isZoomingPossible(zoomDirection) {
      return !((zoomLevel === 1 && zoomDirection === "out") || 
              (zoomLevel === maxZoomLevel && zoomDirection === "in"));
    }
    
    function convertXToMeasurementIndex(x) {
      var nrOfMeasurements = Math.round(signal.getMeasurements().length / prevZoomLevel);
      var measurementLengthInGraph = graphWidth / nrOfMeasurements;
      var indexOfMeasurementAtX = xLeftMost.measurementIndex + Math.round((x - leftMargin) / measurementLengthInGraph);
      return indexOfMeasurementAtX >= 0 ? indexOfMeasurementAtX : 0;
    }
    
    this.zoom = function(zoomData) {
      if (signal !== null) {
        if (isZoomingPossible(zoomData.zoomDirection)) {
          prevZoomLevel = zoomLevel;
          zoomLevel = zoomData.zoomDirection === "in" ? zoomLevel+1 : zoomLevel-1;
          zoomX = zoomData.x;
          calculateXScaleAndValuesShown();
          this.updateUI();
        }
      }
    };
    
    var deltaX = 0;
    this.move = function(x) {
      if (zoomLevel !== 1) {
        deltaX += x;
        var nrOfMeasurements = Math.round(signal.getMeasurements().length / zoomLevel);
        var measurementLengthInGraph = graphWidth / nrOfMeasurements;
        if (Math.abs(deltaX) >= measurementLengthInGraph) {
          var leftIndex = xLeftMost.measurementIndex;
          var rightIndex = xRightMost.measurementIndex;
          if (deltaX < 0 && rightIndex < signal.getMeasurements().length - 1) {
            leftIndex++;
            rightIndex++;
          } else if (deltaX > 0 && leftIndex > 0) {
            leftIndex--;
            rightIndex--;
          }
          xLeftMost = {measurementIndex: leftIndex, value: signal.getMeasurements()[leftIndex].time};
          xRightMost = {measurementIndex: rightIndex, value: signal.getMeasurements()[rightIndex].time};
          xTranslation = -xScale *  xLeftMost.value + leftMargin;
          deltaX = 0;
        }
        this.updateUI();
      }
    };
    
    this.getBorderIndeces = function() {
      return {left: xLeftMost.measurementIndex, right: xRightMost.measurementIndex};
    };
    
    this.showValuesAt = function(x) {
      if (signal !== null) {
        xValueShown = x;
        this.updateUI();
      }
    };
    
    this.getId = function() {
      return id;
    };
    
    this.setSignal = function(newSignal) {
      // TODO: what to do when set to null?
      if (!newSignal) return;
      xLeftMost = {measurementIndex: 0};
      zoomLevel = 1;
      prevZoomLevel = 1;
      zoomX = 0;
      signal = newSignal;
      calculateXScaleAndValuesShown();
      calculateYScaleAndTranslation();
      this.updateUI();
    };
    
    this.getSignal = function() {
      return signal;
    };
    
    /*
     * Calculates variables that need to be 
     * recalculated (only) when canvas is resized
     */
    function calculateComponentPlacement() {
      // TODO: to use jQuery or not to use?
      canvasHeight = $("#"+ id).height();
      canvasWidth = $("#" + id).width();

      var ctx = canvas.getContext("2d");
      ctx.font = fontSize + "px Arial";
      leftMargin = ctx.measureText("9999.99").width + 3;
      graphHeight = canvasHeight - bottomMargin - topMargin;
      graphWidth = canvasWidth - leftMargin - rightMargin;
      xTranslation = leftMargin;
      maxValBaseline = topMargin + fontSize / 2;
      minValBaseline = topMargin + graphHeight + fontSize / 2;
      timeBaseline = topMargin + graphHeight + fontSize;
      medianBaseline = timeBaseline + fontSize;
    }
    
    /*
     * Calculates scale and translation values for y-axis that need to 
     * be recalculated every time signal is changed
     */
    function calculateYScaleAndTranslation() {
      yScale = -graphHeight / (signal.getMaxValue() - signal.getMinValue());
      yTranslation = -yScale * signal.getMaxValue() + topMargin;
    }
    
    /*
     * Calculates scale and border values for x-axis that need to 
     * be recalculated every time signal is zoomed
     */
    function calculateXScaleAndValuesShown() {
      var zoomPointDistanceFromGraphLeftEdge = zoomX - leftMargin;
      var leftPortion = zoomPointDistanceFromGraphLeftEdge / graphWidth;
      var rightPortion = 1 - leftPortion;
      
      var measurementIndex = convertXToMeasurementIndex(zoomX);
      var nrOfMeasurementsToInclude = Math.round(signal.getMeasurements().length / zoomLevel);
      var leftIndex, rightIndex;
      var lastIndex = signal.getMeasurements().length - 1;
      var nrOfMeasurementsOnTheLeft = Math.round(leftPortion * nrOfMeasurementsToInclude);
      var nrOfMeasurementsOnTheRight = Math.round(rightPortion * nrOfMeasurementsToInclude);

      
      if (measurementIndex - nrOfMeasurementsOnTheLeft < 0) {
        leftIndex = 0;
        rightIndex = nrOfMeasurementsToInclude - 1;
      } else if (measurementIndex + nrOfMeasurementsOnTheRight > lastIndex) { 
        rightIndex = lastIndex;
        leftIndex = lastIndex - (nrOfMeasurementsToInclude - 1);
      } else {
        leftIndex = measurementIndex - nrOfMeasurementsOnTheLeft;
        rightIndex = measurementIndex + nrOfMeasurementsOnTheRight;
      }
      
      xLeftMost = {measurementIndex: leftIndex, value: signal.getMeasurements()[leftIndex].time};
      xRightMost = {measurementIndex: rightIndex, value: signal.getMeasurements()[rightIndex].time};
      xScale = graphWidth / (xRightMost.value - xLeftMost.value);
      xTranslation = -xScale *  xLeftMost.value + leftMargin;
    }
    
    this.updateUI = function() {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.save();
      drawDecreasingSections(ctx);
      drawAnomalies(ctx);
      ctx.restore();
      
      drawAxesAndTexts(ctx);
      drawRegressionLines(ctx);
      drawSignal(ctx);
      
      drawShownValues(ctx);
    };
    
    function drawDecreasingSections(ctx) {
      if (AE.anomalySelection.isSelected(AE.const.NOISE)) {
        ctx.fillStyle = "rgba(193, 193, 193, 0.51)";
        drawRectsForTimeWindows(ctx, signal.getDecreasingTimeWindows());
      }
    }
    
    function drawAnomalies(ctx) {
      var anomalyArray = [AE.const.LOW_PEAK, AE.const.MIDDLE_PEAK, AE.const.PLATFORM_ABNORMALITY,
        AE.const.MULTIPLE_PEAK, AE.const.BOTTOM_PEAK, AE.const.IRREGULAR_PHASE, AE.const.OSCILLATION];
      
      for (var i = 0; i < anomalyArray.length; i++) {
        if (AE.anomalySelection.isSelected(anomalyArray[i])) {
          ctx.fillStyle = AE.colors[anomalyArray[i]];
          drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(anomalyArray[i]));
        }
      }
    }
    
    function drawRectsForTimeWindows(ctx, timeWindows) {
      timeWindows.forEach(function(window) {
        var x = xScale * window.start + xTranslation;
        var width = xScale * window.end + xTranslation - x;
        if (x < leftMargin && !(x + width) < leftMargin) {
          width = (x + width) - leftMargin;
          x = leftMargin;
        }
        if (x + width > canvasWidth - rightMargin) {
          width = canvasWidth - rightMargin - x;
        }
        if (x + width > leftMargin && x < canvasWidth - rightMargin) {
          ctx.fillRect(x, 0, width, topMargin + graphHeight);
        }
      });
    }
    
    function drawAxesAndTexts(ctx) {
      ctx.font = fontSize + "px Arial";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "grey";
      
      ctx.save();
      ctx.setLineDash([5]);
      ctx.beginPath();
      ctx.moveTo(leftMargin, topMargin);
      ctx.lineTo(canvasWidth, topMargin);
      ctx.stroke();
      ctx.restore();
      
      ctx.beginPath();
      ctx.moveTo(leftMargin, 0);
      ctx.lineTo(leftMargin, topMargin+graphHeight);
      ctx.lineTo(canvasWidth, topMargin+graphHeight);
      ctx.stroke();
      
      ctx.fillText(signal.getMaxValue(), 0, maxValBaseline);
      ctx.fillText(signal.getMinValue(), 0, minValBaseline);
      ctx.fillText("T" + (xLeftMost.measurementIndex+1) + "=" + xLeftMost.value, leftMargin, timeBaseline);
      var lastMeasurementText = "T" + (xRightMost.measurementIndex+1) + "=" + xRightMost.value;
      var position = canvasWidth - ctx.measureText(lastMeasurementText).width;
      ctx.fillText(lastMeasurementText, position, timeBaseline);
      ctx.fillText("Median of the phase: " + signal.getMedianPhase(), 0, medianBaseline);
    }
    
    function drawRegressionLines(ctx) {
      ctx.strokeStyle = "yellow";
      drawRegressionLine(ctx, signal.getTopRegression());
      drawRegressionLine(ctx, signal.getMiddleRegression());
      drawRegressionLine(ctx, signal.getBottomRegression());
    }
    
    function drawRegressionLine(ctx, equation) {
      var x1 = leftMargin;
      var y1 = equation.slope * xLeftMost.value + equation.yIntercept;
      y1 = y1 * yScale + yTranslation;
      var x2 = canvasWidth - rightMargin;
      var y2 = equation.slope * xRightMost.value + equation.yIntercept;
      y2 = y2 * yScale + yTranslation;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    function drawSignal(ctx) {
      ctx.strokeStyle = "black";
      ctx.beginPath();
      var values = signal.getMeasurements();
      var firstIndex = xLeftMost.measurementIndex;
      var lastIndex = xRightMost.measurementIndex;
      
      for (var i = firstIndex; i <= lastIndex; i++) {
        var element = values[i];
        var x = element.time * xScale + xTranslation;
        var y = element.value * yScale + yTranslation;
        
        if (i === firstIndex) {
          ctx.moveTo(x,y);
        } else {
          ctx.lineTo(x,y);
        }
      }
      
      ctx.stroke(); 
    }
    
    function drawShownValues(ctx) {
      if (xValueShown >= leftMargin && xValueShown <= canvasWidth - rightMargin) {
        var measurementIndex = Math.round(xLeftMost.measurementIndex + (xValueShown - leftMargin) * (xRightMost.measurementIndex - xLeftMost.measurementIndex) / graphWidth);
        var measurement = signal.getMeasurements()[measurementIndex];
        var xVal = measurement.time;
        var yVal = measurement.value;
        var x = measurement.time * xScale + xTranslation;
        var y = measurement.value * yScale + yTranslation;
        
        var yValueText = "Ca2+ = " + yVal;
        var xValueText = "T" + (measurementIndex+1) + "=" + xVal;
        var yTextWidth = ctx.measureText(yValueText).width;
        var xTextWidth = ctx.measureText(xValueText).width;
        
        var padding = 2;
        
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = "rgb(10, 30, 150)";
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(leftMargin + graphWidth, y);
        ctx.moveTo(x,y);
        ctx.lineTo(x, topMargin + graphHeight);
        ctx.stroke();
  
        if (x + xTextWidth/2 > canvasWidth) {
          x = canvasWidth - xTextWidth/2;
        }
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.fillRect(leftMargin - yTextWidth/2 - padding, y - fontSize/2 + padding,
                      yTextWidth + 2*padding, fontSize + 2*padding);
        ctx.fillRect(x - xTextWidth/2 - padding, topMargin + graphHeight - fontSize/2 - padding, 
                      xTextWidth + 2*padding, fontSize + 2*padding);
        
        ctx.fillStyle = "black";
        ctx.fillText(yValueText, leftMargin - yTextWidth/2, y + fontSize/2 + padding);
        ctx.fillText(xValueText, x - xTextWidth/2, topMargin + graphHeight + fontSize/2);
      }
    }
  };
  
  // TODO: REFACTOR, REFACTOR, REFACTOR!!!
  // bunch of code copied from Graph with very minor changes
  // (mostly removed stuff)
  function GraphPreview(id) {
    this.id = id;
    var signal = null;
    var canvas = document.getElementById(id);
    
    var canvasHeight;
    var canvasWidth;
    var graphHeight;
    var graphWidth;
    var xScale;
    var yScale;
    var xTranslation;
    var yTranslation;
    
    var leftMargin = 40;
    var rightMargin = 5;
    var bottomMargin = 0;
    var topMargin = 0;
    
    var xLeftMost, xRightMost;
    var shownIndeces;
    
    calculateComponentPlacement();
    
    this.setSignal = function(newSignal) {
      if (!newSignal) return;
      signal = newSignal;
      calculateXScaleAndValuesShown();
      calculateYScaleAndTranslation();
      this.setShownIndeces({left: 0, right: signal.getMeasurements().length - 1});
    };
    
    this.setShownIndeces = function(indeces) {
      shownIndeces = indeces;
      this.updateUI();
    };
    
    function calculateYScaleAndTranslation() {
      yScale = -graphHeight / (signal.getMaxValue() - signal.getMinValue());
      yTranslation = -yScale * signal.getMaxValue() + topMargin;
    }
    
    function calculateXScaleAndValuesShown() {
      xLeftMost = {measurementNr: 1, value: signal.getStartTime()};
      xRightMost = {measurementNr: signal.getMeasurements().length, value: signal.getEndTime()};
      xScale = graphWidth / (xRightMost.value - xLeftMost.value);
    }
    
    function calculateComponentPlacement() {
      canvasHeight = $("#"+ id).height();
      canvasWidth = $("#" + id).width();

      graphHeight = canvasHeight - bottomMargin - topMargin;
      graphWidth = canvasWidth - leftMargin - rightMargin;
      xTranslation = leftMargin;
    }
    
    this.updateUI = function() {
      var ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.strokeRect(leftMargin, 0, graphWidth, canvasHeight);
      
      ctx.save();
      drawAnomalies(ctx);
      ctx.restore();
      
      drawSignal(ctx);
      
      ctx.save();
      drawShownArea(ctx);
      ctx.restore();
    };
    
    function drawAnomalies(ctx) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.43)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.LOW_PEAK));
        ctx.fillStyle = "rgba(255, 102, 0, 0.43)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.MIDDLE_PEAK));
        ctx.fillStyle = "rgba(13, 82, 220, 0.35";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.PLATFORM_ABNORMALITY));
        ctx.fillStyle = "rgba(153, 153, 0, 0.43)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.MULTIPLE_PEAK));
        ctx.fillStyle = "rgba(113, 190, 162, 0.43)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.BOTTOM_PEAK));
        ctx.fillStyle = "rgba(172, 92, 172, 0.27)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.IRREGULAR_PHASE));
        ctx.fillStyle = "rgba(151, 255, 255, 0.75)";
        drawRectsForTimeWindows(ctx, signal.getTimeWindowsForAnomaly(AE.const.OSCILLATION));
    }
    
    function drawRectsForTimeWindows(ctx, timeWindows) {
      timeWindows.forEach(function(window) {
        var x = xScale * window.start + xTranslation;
        var width = xScale * window.end + xTranslation - x;
        ctx.fillRect(x, 0, width, topMargin + graphHeight);
      });
    }
    
    function drawSignal(ctx) {
      ctx.strokeStyle = "black";
      ctx.beginPath();
      var values = signal.getMeasurements();
      var isfirst = true;
      values.forEach(function(element){
          var x = element.time * xScale + xTranslation;
          var y = element.value * yScale + yTranslation;
          if (isfirst) {
            ctx.moveTo(x,y);
            isfirst = false;
          } else {
            ctx.lineTo(x,y);
          }
      });
      ctx.stroke(); 
    }
    
    function drawShownArea(ctx) {
      var x1 = signal.getMeasurements()[shownIndeces.left].time * xScale + xTranslation;
      var x2 = signal.getMeasurements()[shownIndeces.right].time * xScale + xTranslation;
      ctx.fillStyle = "rgba(50, 50, 50, 0.4)";
      ctx.strokeStyle = "green";
      ctx.fillRect(leftMargin, 0, x1 - leftMargin, canvasHeight);
      ctx.fillRect(x2, 0, canvasWidth - rightMargin - x2, canvasHeight);
      ctx.strokeRect(x1, 0, x2-x1, canvasHeight);
    }
  }
  
  function GraphController(id) {
    var id = id;
    var graph = new Graph("graph" + id);
    var graphPreview = new GraphPreview("graphPreview" + id);
    
    var mouseButtonDown = false;
    
    this.getId = function() {
      return id;
    };
    
    this.setSignal = function(signal) {
      graph.setSignal(signal);
      graphPreview.setSignal(signal);
    };
    
    this.getSignal = function() {
      return graph.getSignal();
    };
    
    this.updateUI = function() {
      graph.updateUI();
      graphPreview.updateUI();
    };
    
    document.getElementById("graph" + id).addEventListener("wheel", function(evt) {
      if (!graph.getSignal()) return;
      evt.preventDefault();
      evt.stopPropagation();
      var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
      var y = evt.clientY - evt.target.offsetTop + window.scrollY;
      var zoomDirection = evt.deltaY > 0 ? "out" : "in";
      graph.zoom({x: x, y: y, zoomDirection: zoomDirection});
      graphPreview.setShownIndeces(graph.getBorderIndeces());
    });
    document.getElementById("graph" + id).addEventListener("mousemove", function(evt) {
      if (!graph.getSignal()) return;
      if (mouseButtonDown) {
        var movX = evt.movementX || evt.mozMovementX;
        if (movX) {
          graph.move(movX);
          graphPreview.setShownIndeces(graph.getBorderIndeces());
        }
      }
      var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
      graph.showValuesAt(x);
    });
    document.getElementById("graph" + id).addEventListener("mouseleave", function() {
      graph.showValuesAt(-1);
      mouseButtonDown = false;
    });
    document.getElementById("graph" + id).addEventListener("mousedown", function(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      mouseButtonDown = true;
    });
    document.getElementById("graph" + id).addEventListener("mouseup", function() {
      mouseButtonDown = false;
    });
  }  
  
  module.graphViewController = function() {
    var controller = {};
    
    var graphControllers = {};
    var nrOfGraphs = 0;
    
    controller.reset = function() {
      var width = AE.settings[AE.const.ui.GRAPH_WIDTH];
      var height = AE.settings[AE.const.ui.GRAPH_HEIGHT];
      var previewHeight = AE.settings[AE.const.ui.GRAPH_PREVIEW_HEIGHT];

      var graphs = document.getElementsByClassName("graphDiv");

      var graphCount = AE.signalSelection.getMaxSelectionCount();
      if (graphs.length > graphCount) {
        for (var i = graphs.length - 1; i >= graphCount; i--) {
          var graph = graphs.item(i);
          graph.parentNode.removeChild(graphs.item(i));
        }
      } else if (graphs.length < graphCount) {
        for (var i = graphs.length; i < AE.signalSelection.getMaxSelectionCount(); i++) {
          var div = document.createElement("div");
          div.setAttribute("id", "graphDiv" + i);
          div.setAttribute("class", "graphDiv");
          var select = document.createElement("select");
          select.setAttribute("class", "graphSelect");
          select.setAttribute("id","graphSelect" + i);
          var signals = AE.dataModel.getSignals();
          for (var j = 0; j < signals.length; j++) {
            var signalId = signals[j].fileName();
            var newElem = document.createElement("option");
            newElem.value = signalId;
            if (!AE.dataModel.getSignal(signalId).isNormal()) {
              newElem.setAttribute("style", "color:red");
            }
            newElem.appendChild(document.createTextNode(signalId));
            select.appendChild(newElem);
          }
          select.addEventListener("change", handleGraphSelection);

          var canvas1 = document.createElement("canvas");
          canvas1.setAttribute("id","graph" + i);
          canvas1.setAttribute("class", "graphCanvas");
          canvas1.width = width;
          canvas1.height = height;
          var canvas2 = document.createElement("canvas");
          canvas2.setAttribute("id","graphPreview" + i);
          canvas2.width = width;
          canvas2.height = previewHeight;

          div.appendChild(select);
          div.appendChild(canvas1);
          div.appendChild(canvas2);

          document.getElementById("graphicSignalView").appendChild(div);
        }
      }
      
      nrOfGraphs = graphCount;
      for (var i = 0; i < nrOfGraphs; i++) {
        graphControllers[i] = new GraphController(i); 
      }
      
      var nrOfGraphsInput = document.getElementById("numberOfGraphs");
      nrOfGraphsInput.addEventListener("change", handleNumberOfGraphs);
    };
    
    controller.zoom = function(id, zoomData) {
      graphControllers[id].zoom(zoomData);
    };
    
    controller.onEvent = function(event) {
      if (event.type === AE.const.EVENT_TYPE_SIGNAL_ADDED) {
        addSginalToSelections(event.value.fileName());
        for (var i = 0; i < nrOfGraphs; i++) {
          if (graphControllers[i].getSignal() === null) {
            graphControllers[i].setSignal(event.value);
          }
        }
      } else if (event.type === AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED) { 
        for (var i = 0; i < nrOfGraphs; i++) {
          graphControllers[i].setSignal(AE.dataModel.getSignal(AE.signalSelection.getSelected()[i]));
          var graphSelect = document.getElementById("graphSelect" + i);
          if (AE.signalSelection.getSelected()[i] && graphSelect.value !== AE.signalSelection.getSelected()[i]) {
            graphSelect.value = AE.signalSelection.getSelected()[i];
          }
        }
      } else if (event.type === AE.const.EVENT_TYPE_SIGNALS_REANALYZED) {
        updateUIs();
        updateGraphSelectionColors();
      } else {
        updateUIs();
      }
    };
    
    function handleGraphSelection(evt) {
      var id = evt.target.id;
      var nrOfGraph = parseInt(id.substring(id.length-1));
      AE.signalSelection.selectionChanged(nrOfGraph, evt.target.value);
    }
    
    function handleNumberOfGraphs(evt) {
      var newValue = evt.target.value;
      AE.signalSelection.setMaxSelectionCount(newValue);
      AE.graphViewController.reset();
    }
    
    function updateUIs() {
      for (var i = 0; i < nrOfGraphs; i++) {
        var graphController = graphControllers[i];
        if (graphController.getSignal()) {
          graphController.updateUI();
        }
      }
    }
    
    function addSginalToSelections(signalId) {
      for (var i = 0; i < nrOfGraphs; i++) {
        var newElem = document.createElement("option");
        newElem.setAttribute("class", "signalOption");
        newElem.value = signalId;
        if (!AE.dataModel.getSignal(signalId).isNormal()) {
          newElem.setAttribute("style", "color:red");
        }
        newElem.appendChild(document.createTextNode(signalId));

        document.getElementById("graphSelect" + i).appendChild(newElem);
      }
    }
    
    function updateGraphSelectionColors() {
      var options = document.getElementsByClassName("signalOption");
      for (var i = 0; i < options.length; i++) {
        var option = options.item(i);
        if (!AE.dataModel.getSignal(options.item(i).value).isNormal()) {
          option.setAttribute("style", "color:red");
        } else {
          option.setAttribute("style", "color:black");
        }
      }
    }
    
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_ADDED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNALS_REANALYZED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_ANOMALY_SELECTION_CHANGED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED);

    return controller;
  }();

  return module;
}(AE || {}));


