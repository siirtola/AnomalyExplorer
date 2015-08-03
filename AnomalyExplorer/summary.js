/*

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
  
  var abbreviations = {};
  abbreviations[AE.const.LOW_PEAK] = "L";
  abbreviations[AE.const.MIDDLE_PEAK] = "Mi";
  abbreviations[AE.const.BOTTOM_PEAK] = "B";
  abbreviations[AE.const.MULTIPLE_PEAK] = "D";
  abbreviations[AE.const.IRREGULAR_PHASE] = "I";
  abbreviations[AE.const.PLATFORM_ABNORMALITY] = "P"; 
  abbreviations[AE.const.OSCILLATION] = "O";
  
  function SummaryBySignal() {
    var id = "summaryBySignal";
    var ctx = document.getElementById(id).getContext("2d");
    var canvasHeight = $("#"+ id).height();
    var canvasWidth = $("#" + id).width();
    var fontSize = 10;
    var margin = {
      left: 40,
      right: 5,
      bottom: fontSize + 5,
      top: fontSize + 5
    };
    var graphHeight = canvasHeight - margin.top - margin.bottom;
    var graphWidth = canvasWidth - margin.left - margin.right;
    
    var typeToOrderBy = null;
    
    var selectedSignals = [];
    var mouseOverSignal = null;
    
    var signalsWithAnomalies;
    
    this.updateUI = function() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.font = fontSize + "px Arial";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "grey";
      ctx.strokeRect(margin.left, margin.top, graphWidth, graphHeight);
      
      var anomalyArray = AE.dataModel.getTotalAnomaliesByType().map(function(currentValue) {
        return currentValue.type;
      });
      if (typeToOrderBy) {
        anomalyArray.splice(anomalyArray.indexOf(typeToOrderBy), 1);
        anomalyArray.push(typeToOrderBy);
      }
      
      var signals = AE.dataModel.getSignals();
      signalsWithAnomalies = [];
      var biggestAnomalyCount = 0;
      for (var i = 0; i < signals.length; i++ ) {
        var signal = signals[i];
        var processedSignal = {fileName: signal.fileName()};
        var total = 0;
        var totalSelected = 0;
        for (var j = 0; j < anomalyArray.length; j++) {
          var anomalyCount = signal.getTimeWindowsForAnomaly(anomalyArray[j]).length;
          processedSignal[anomalyArray[j]] = anomalyCount;
          total += anomalyCount;
          if (AE.anomalySelection.isSelected(anomalyArray[j])) {
            totalSelected += anomalyCount;
          }
        }
        if (total > 0) {
          processedSignal.total = totalSelected;
          signalsWithAnomalies[signalsWithAnomalies.length] = processedSignal;
        }
        if (total > biggestAnomalyCount) {
          biggestAnomalyCount = total;
        }
      }
      
      if (typeToOrderBy) {
        signalsWithAnomalies.sort(function(a, b) {
          return a[typeToOrderBy] - b[typeToOrderBy];
        });
      }
      
      
      var unitHeight = graphHeight / biggestAnomalyCount;
      
      var median = Math.floor(biggestAnomalyCount/2);
      
      
      
      ctx.save();
      ctx.fillStyle = "black";
      ctx.font = "bold " + ctx.font;
      ctx.fillText("Signals with abnormalities: " + signalsWithAnomalies.length + 
              "/" + signals.length + " (" + Math.round(signalsWithAnomalies.length/signals.length * 100) + "%)",
              margin.left, margin.top - 3);
      ctx.restore();
      ctx.fillStyle = "black";
      ctx.fillText(biggestAnomalyCount, margin.left/2, margin.top + fontSize/2);
      ctx.fillText(median, margin.left/2, margin.top + (biggestAnomalyCount - median)*unitHeight + fontSize/2);
      ctx.fillText("1", margin.left/2, margin.top  + graphHeight - unitHeight + fontSize/2);
      
      ctx.save();
      ctx.setLineDash([5]);
      ctx.beginPath();
      var medianLineY = margin.top + (biggestAnomalyCount - median)*unitHeight;
      ctx.moveTo(margin.left, medianLineY);
      ctx.lineTo(margin.left + graphWidth, medianLineY);
      var oneLineY = margin.top + graphHeight - unitHeight;
      ctx.moveTo(margin.left, oneLineY);
      ctx.lineTo(margin.left + graphWidth, oneLineY);
      ctx.stroke();
      ctx.restore();
      
      var unitLength = graphWidth / signalsWithAnomalies.length;
      
      var selectedIndeces = [];
      var mouseOverIndex = null;
      var texts = [];
      
      ctx.strokeStyle = "grey";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 0; i < signalsWithAnomalies.length; i++) {
        var signal = signalsWithAnomalies[i];
        if (selectedSignals.indexOf(signal.fileName) !== -1) {
          selectedIndeces.push(i);
        }
        if (signal.fileName === mouseOverSignal) {
          mouseOverIndex = i;
        }
        var y = margin.top + graphHeight - signal.total * unitHeight;
        for (var j = 0; j < anomalyArray.length; j++) {
          var type = anomalyArray[j];
          if (signal[type] !== 0 && AE.anomalySelection.isSelected(type)) {
            ctx.fillStyle = AE.colors[type];
            ctx.fillRect(margin.left + i * unitLength, y, unitLength, signal[type] * unitHeight);
           
            ctx.moveTo(margin.left + i * unitLength, y);
            ctx.lineTo(margin.left + i * unitLength + unitLength, y);
            
            y += signal[type] * unitHeight;
             
            if (selectedSignals.indexOf(signal.fileName) !== -1 || signal.fileName === mouseOverSignal) {
              var text = abbreviations[type] + " = " + signal[type];              
              texts[texts.length] = {signal: signal.fileName,
                                     text: text, 
                                     x: margin.left + i*unitLength + (unitLength - ctx.measureText(text).width)/2,
                                     baseline: y - (signal[type]*unitHeight - fontSize)/2};
             }
          }
        }

        ctx.moveTo(margin.left + i * unitLength, margin.top);
        ctx.lineTo(margin.left + i * unitLength, margin.top + graphHeight);
      }
      ctx.stroke();
      
      if (selectedIndeces !== null) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 3;
        for (var i = 0; i < selectedIndeces.length; i++) {
          ctx.strokeRect(margin.left + selectedIndeces[i] * unitLength, margin.top, unitLength, graphHeight);
        }
      }
      if (mouseOverIndex !== null) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10]);
        ctx.strokeRect(margin.left + mouseOverIndex * unitLength, margin.top, unitLength, graphHeight);
        ctx.restore();
        
        ctx.fillStyle = "black";
        
        var fileName = signalsWithAnomalies[mouseOverIndex].fileName;
        var textWidth = ctx.measureText(fileName).width;
        var x = margin.left + mouseOverIndex * unitLength + unitLength/2 - textWidth/2;
        if (x < 0) x = 0;
        if (x + textWidth > canvasWidth) x = canvasWidth - textWidth;
        ctx.fillText(fileName, x, canvasHeight);
      }
      
      for (var i = 0; i < texts.length; i++) {
        var text = texts[i];
        if (text.signal === mouseOverSignal) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          var padding = 5;
          ctx.fillRect(text.x-padding, text.baseline-fontSize-padding, ctx.measureText(text.text).width + 2*padding, fontSize + 2*padding);
        }
        ctx.fillStyle = "black";
        ctx.fillText(text.text, text.x, text.baseline);
      }
    };
    
    this.orderBy = function(type) {
      typeToOrderBy = type;
      this.updateUI();
    };
    
    this.signalAt = function(x, y) {
      if (!withinMargins(x, y) || !signalsWithAnomalies) return null;
      var unitLength = graphWidth / signalsWithAnomalies.length;
      var index = Math.floor((x - margin.left)/ unitLength);
      return signalsWithAnomalies[index].fileName;
    };
    
    function withinMargins(x, y) {
      return x > margin.left && x < canvasWidth - margin.right 
              && y > margin.top && y < canvasHeight - margin.bottom;
    } 
    
    this.getSelected = function() {
      return selectedSignals;
    };
    
    this.setSelected = function(signalNames) {
      selectedSignals = signalNames;
      this.updateUI();
    };
    
    this.setMouseOver = function(signalName) {
      if (mouseOverSignal !== signalName) {
        mouseOverSignal = signalName;
        this.updateUI();
      }
    };
  }
  
  function TotalSummary() {
    var id = "totalSummary";
    var ctx = document.getElementById(id).getContext("2d");
    var canvasHeight = $("#"+ id).height();
    var canvasWidth = $("#" + id).width();
    var fontSize = 10;
    var margin = {
      left: 0,
      right: 0,
      bottom: fontSize + 5,
      top: 0
    };
    var graphHeight = canvasHeight - margin.top - margin.bottom;
    var graphWidth = canvasWidth - margin.left - margin.right;
    
    var heights;
    var selectedType = null;
    var mouseOverType = null;
    
    var totalAnomalies = {};
    totalAnomalies[AE.const.LOW_PEAK] = 0;
    totalAnomalies[AE.const.MIDDLE_PEAK] = 0;
    totalAnomalies[AE.const.BOTTOM_PEAK] = 0;
    totalAnomalies[AE.const.MULTIPLE_PEAK] = 0;
    totalAnomalies[AE.const.IRREGULAR_PHASE] = 0;
    totalAnomalies[AE.const.PLATFORM_ABNORMALITY] = 0;
	totalAnomalies[AE.const.OSCILLATION] = 0;
    
    
    this.updateUI = function() {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.font = fontSize + "px Arial";
      ctx.lineWidth = 1;
      ctx.strokeStyle = "grey";
      ctx.strokeRect(margin.left, margin.top, graphWidth, graphHeight);
      
      var anomalies = AE.dataModel.getTotalAnomaliesByType();
      var total = anomalies.reduce(function(previousValue, currentValue) {
        return previousValue + currentValue.value;
      }, 0);
      heights = anomalies.map(function(currentValue) {
        return {type: currentValue.type, value: Math.round(currentValue.value/total * graphHeight)};
      });
      
      var mouseOverRect = null;
      var texts = [];
      
      var y = margin.top;
      for (var i = 0; i < heights.length; i++) {
        if (heights[i].value !== 0) {
          if (heights[i].type === mouseOverType) {
            mouseOverRect = {x: margin.left, y: y, width: graphWidth, height: heights[i].value};
          }
          
          ctx.fillStyle = AE.colors[heights[i].type];
          ctx.fillRect(margin.left, y, graphWidth, heights[i].value);
          
          var text = abbreviations[heights[i].type] + " = " + anomalies[i].value;
          texts[texts.length] = {type: heights[i].type,
                                 text: text, 
                                 x: margin.left + (graphWidth - ctx.measureText(text).width)/2,
                                 baseline: y + (heights[i].value + fontSize)/2};
          
          if (heights[i].type === selectedType) {
            ctx.save();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.strokeRect(margin.left, y, graphWidth, heights[i].value);
            ctx.restore();
          }
          
          y += heights[i].value;
          
          if (heights[i].type !== selectedType) {
            ctx.strokeStyle = "grey";
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(margin.left + graphWidth, y);
            ctx.stroke();
          }
        }
      }
      
      if (mouseOverRect !== null) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10]);
        ctx.strokeRect(mouseOverRect.x, mouseOverRect.y, mouseOverRect.width, mouseOverRect.height);
        ctx.restore();
      }
      
      for (var i = 0; i < texts.length; i++) {
        var text = texts[i];
        if (text.type === mouseOverType) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          var padding = 5;
          ctx.fillRect(text.x-padding, text.baseline-fontSize-padding, ctx.measureText(text.text).width + 2*padding, fontSize + 2*padding);
        }
        ctx.fillStyle = "black";
        ctx.fillText(text.text, text.x, text.baseline);
      }
      
      var text = "Total anomalies: " + total;
      var x = margin.left + (graphWidth - ctx.measureText(text).width)/2;
      ctx.fillStyle = "black";
      ctx.fillText(text, x, canvasHeight);
      
    };
    
    this.typeAt = function(x, y) {
      if (!withinMargins(x, y) || !heights) return null;
      else {
        var typeY = margin.top;
        for (var i = 0; i < heights.length; i++) {
          if (y < typeY + heights[i].value) {
            return heights[i].type;
          } else {
            typeY += heights[i].value;
          }
        }
      }
    };
    
    function withinMargins(x, y) {
      return x > margin.left && x < canvasWidth - margin.right 
              && y > margin.top && y < canvasHeight - margin.bottom;
    }
    
    this.setSelected = function(type) {
      selectedType = type;
      this.updateUI();
    };
    
    this.getSelected = function() {
      return selectedType;
    };
    
    this.setMouseOver = function(type) {
      if (mouseOverType !== type) {
        mouseOverType = type;
        this.updateUI();
      }
    };
  }
  
  module.summaryViewController = function() {
    var controller = {};
    
    var summaryBySignal;
    var totalSummary;
    
    controller.reset = function() {
      var entireWidth = AE.settings[AE.const.ui.SUMMARY_WIDTH];
      var height = AE.settings[AE.const.ui.SUMMARY_HEIGHT];
      var totalSummaryWidth = 100;
      var summaryBySignalElement = document.getElementById("summaryBySignal");
      summaryBySignalElement.width = entireWidth - totalSummaryWidth;
      summaryBySignalElement.height = height;
      var totalSummaryElement = document.getElementById("totalSummary");
      totalSummaryElement.width = totalSummaryWidth;
      totalSummaryElement.height = height;
      
      summaryBySignal = new SummaryBySignal();
      totalSummary = new TotalSummary();
      
      document.getElementById("totalSummary").addEventListener("click", function(evt) {
        var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
        var y = evt.clientY - evt.target.offsetTop + window.scrollY;
        var type = totalSummary.typeAt(x, y);
        if (type) {
          if (totalSummary.getSelected() === type) {
            type = null;
          } 
          totalSummary.setSelected(type);
          summaryBySignal.orderBy(type);
        }
      });
      
      document.getElementById("totalSummary").addEventListener("mousemove", function(evt) {
        var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
        var y = evt.clientY - evt.target.offsetTop + window.scrollY;
        var type = totalSummary.typeAt(x, y);
        totalSummary.setMouseOver(type);
      });
      
      document.getElementById("totalSummary").addEventListener("mouseleave", function() {
        totalSummary.setMouseOver(null);
      });
      
      document.getElementById("summaryBySignal").addEventListener("click", function(evt) {
        var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
        var y = evt.clientY - evt.target.offsetTop + window.scrollY;
        var shift = evt.shiftKey;
        var signal = summaryBySignal.signalAt(x, y);
        var index = AE.signalSelection.getSelected().indexOf(signal);
        if (!shift) {
          // if shift not down, remove all existing selections
          for (var i = 0; i < summaryBySignal.getSelected().length; i++) {
            AE.signalSelection.selectionChanged(i, null);
          }
        }
        if (signal) {
          if (index !== -1) {
            // selected signal was already selected, deselect it
            AE.signalSelection.selectionChanged(index, null);
          } else {
            index = AE.signalSelection.getSelected().indexOf(null);
            if (index !== -1) {
              // There is an empty spot for selection
              AE.signalSelection.selectionChanged(index, signal);
            } else {
              // There was not an empty spot for a selection, but in case 
              // there is a normal signal (no anomalies) selected, replace it
              // with the selection. If no normal signal is selected, max number
              // of selections is made and this selection will be ignored
              for (var i = 0; i < summaryBySignal.getSelected().length; i++) {
                if (AE.dataModel.getSignal(summaryBySignal.getSelected()[i]).isNormal()) {
                  AE.signalSelection.selectionChanged(i, signal);
                  break;
                }
              }
            }
          }
        }
      });
      
      document.getElementById("summaryBySignal").addEventListener("mousemove", function(evt) {
        var x = evt.clientX - evt.target.offsetLeft + window.scrollX;
        var y = evt.clientY - evt.target.offsetTop + window.scrollY;
        var signal = summaryBySignal.signalAt(x, y);
        summaryBySignal.setMouseOver(signal);
      });
      
      document.getElementById("summaryBySignal").addEventListener("mouseleave", function(evt) {
        summaryBySignal.setMouseOver(null);
      });
    };
    
    controller.onEvent = function(evt) {
      if (evt.type === AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED) {
        summaryBySignal.setSelected(AE.signalSelection.getSelected());
      } else {
        totalSummary.updateUI();
        summaryBySignal.updateUI();
      }
    };
    
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_ADDED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNALS_REANALYZED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_ANOMALY_SELECTION_CHANGED);
    AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED);
    
    return controller;
  }();
  
  return module;
}(AE || {}));
