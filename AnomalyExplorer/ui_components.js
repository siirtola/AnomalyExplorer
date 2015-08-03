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

 *
 * This file contains browser related stuff like event listening
 */

var AE = (function (module) {
  var colors = {};
  colors[AE.const.LOW_PEAK] = "rgba(255, 0, 0, 0.43)";
  colors[AE.const.OSCILLATION] = "rgba(151, 255, 255, 0.75)";
  colors[AE.const.MIDDLE_PEAK] = "rgba(255, 102, 0, 0.43)";
  colors[AE.const.BOTTOM_PEAK] = "rgba(113, 190, 162, 0.43)";
  colors[AE.const.MULTIPLE_PEAK] = "rgba(153, 153, 0, 0.43)";
  colors[AE.const.IRREGULAR_PHASE] = "rgba(172, 92, 172, 0.27)";
  colors[AE.const.PLATFORM_ABNORMALITY] = "rgba(13, 82, 220, 0.35)";
  module.colors = colors;

  var settings = {};
  settings[AE.const.ui.SUMMARY_WIDTH] = 800;
  settings[AE.const.ui.SUMMARY_HEIGHT] = 400;
  settings[AE.const.ui.GRAPH_WIDTH] = settings[AE.const.ui.SUMMARY_WIDTH];
  settings[AE.const.ui.GRAPH_HEIGHT] = 200;
  settings[AE.const.ui.GRAPH_PREVIEW_HEIGHT] = 20;
  module.settings = settings;

  return module;
}(AE || {}));

var AE = (function (module) {

  module.notifyUserOfError = function (message) {
	// TODO: add component to page or something like that
	alert(message);
  };

  document.addEventListener("DOMContentLoaded", function () {
	initialize();
  });

  function initialize() {
	AE.graphViewController.reset();
	AE.summaryViewController.reset();
	addEventListeners();
  }

  function addEventListeners() {
	document.getElementById("inputFiles").addEventListener("change", handleFileEvent);

	var checkboxes = document.getElementsByClassName("thresholdCheckbox");
	for (var i = 0; i < checkboxes.length; i++) {
	  checkboxes.item(i).addEventListener("change", handleCheckboxSelection);
	}

	var resetButton = document.getElementById("resetValues");
	resetButton.addEventListener("click", handleResetValues);
  }

  var checkboxIdsToConstants = {
	noiseCheckbox: AE.const.NOISE,
	lowCheckbox: AE.const.LOW_PEAK,
	oscCheckbox: AE.const.OSCILLATION,
	middleCheckbox: AE.const.MIDDLE_PEAK,
	platformCheckbox: AE.const.PLATFORM_ABNORMALITY,
	multipleCheckbox: AE.const.MULTIPLE_PEAK,
	bottomCheckbox: AE.const.BOTTOM_PEAK,
	irregularCheckbox: AE.const.IRREGULAR_PHASE
  };

  function handleCheckboxSelection(evt) {
	var checkBoxId = evt.target.id;
	var isChecked = evt.target.checked;
	AE.anomalySelection.selectionChanged(checkboxIdsToConstants[checkBoxId], isChecked);
  }

  function handleFileEvent(evt) {
	if (!window.File || !window.FileReader) {
	  notifyUserOfError("This browser does not support needed html5 file features");
	  return;
	}
	var files = evt.target.files;
	AE.fileProcessor.handleFiles(files);
  }

  function handleResetValues() {
	AE.threshold.resetDefaults();
  }

  return module;
}(AE || {}));


var AE = (function (module) {

  module.anomalySelection = function () {
	var anomalySelection = {};

	var anomalySelectionStates = {};
	anomalySelectionStates[AE.const.NOISE] = true;
	anomalySelectionStates[AE.const.OSCILLATION] = true;
	anomalySelectionStates[AE.const.LOW_PEAK] = true;
	anomalySelectionStates[AE.const.LOW_PEAK] = true;
	anomalySelectionStates[AE.const.MIDDLE_PEAK] = true;
	anomalySelectionStates[AE.const.BOTTOM_PEAK] = true;
	anomalySelectionStates[AE.const.MULTIPLE_PEAK] = true;
	anomalySelectionStates[AE.const.IRREGULAR_PHASE] = true;
	anomalySelectionStates[AE.const.PLATFORM_ABNORMALITY] = true;

	anomalySelection.selectionChanged = function (type, selected) {
	  anomalySelectionStates[type] = selected;
	  AE.eventDispatcher.dispatch(new AE.Event({type: AE.const.EVENT_TYPE_ANOMALY_SELECTION_CHANGED}));
	  // hs 26.11.2014
	  // force re-computation
	  AE.eventDispatcher.dispatch(new AE.Event({type: AE.const.EVENT_TYPE_THRESHOLD_VALUE_CHANGED}));
	  // alert("selectionChanged");
	};

	anomalySelection.isSelected = function (type) {
	  return anomalySelectionStates[type];
	};

	return anomalySelection;
  }();

  module.signalSelection = function () {
	var signalSelection = {};

	var maxSelections = 0;
	var selectedSignals = [];

	signalSelection.selectionChanged = function (selectionNumber, signalName) {
	  selectedSignals[selectionNumber] = signalName;
	  AE.eventDispatcher.dispatch(new AE.Event({type: AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED}));
	};

	signalSelection.getSelected = function () {
	  return selectedSignals;
	};

	signalSelection.getMaxSelectionCount = function () {
	  return maxSelections;
	};

	signalSelection.setMaxSelectionCount = function (count) {
	  if (maxSelections > count) {
		selectedSignals.splice(count);
	  } else if (maxSelections < count) {
		for (var i = maxSelections; i < count; i++) {
		  selectedSignals[i] = null;
		}
	  }
	  maxSelections = count;
	  AE.eventDispatcher.dispatch(new AE.Event({type: AE.const.EVENT_TYPE_SIGNAL_SELECTION_CHANGED}));
	};

	signalSelection.setMaxSelectionCount(1);
	return signalSelection;
  }();

  return module;
}(AE || {}));

/*
 * EXPORT VIEW 
 */
var AE = (function (module) {

  module.exportViewController = function () {
	var controller = {};

	controller.onEvent = function (evt) {
	  var textArea = document.getElementById("export");
	  var anomalyOrder = [
		[AE.const.LOW_PEAK, AE.const.MIN_LOW, AE.const.MAX_LOW],
		[AE.const.MIDDLE_PEAK, AE.const.MIN_MIDDLE, AE.const.MAX_MIDDLE],
		[AE.const.BOTTOM_PEAK, AE.const.MIN_BOTTOM],
		[AE.const.MULTIPLE_PEAK, AE.const.MIN_MULTIPLE, AE.const.MAX_MULTIPLE],
		[AE.const.IRREGULAR_PHASE, AE.const.MIN_IRREGULAR],
		[AE.const.PLATFORM_ABNORMALITY, AE.const.MAX_PLATFORM],
		[AE.const.OSCILLATION, AE.const.MAX_OSCILLATION]];
	  var summary = "FILE_NAME\t";
	  for (var i = 0; i < anomalyOrder.length; i++) {
		summary += anomalyOrder[i][0] + "(" + AE.threshold.value(anomalyOrder[i][1]) * 100;
		if (anomalyOrder[i].length > 2) {
		  summary += "-" + AE.threshold.value(anomalyOrder[i][2]) * 100;
		}
		summary += "%)\t";
	  }
	  summary += "\n";
	  var signals = AE.dataModel.getSignals();
	  for (var i = 0; i < signals.length; i++) {
		summary += padR(signals[i].fileName(), 70) + "\t";
		for (var j = 0; j < anomalyOrder.length; j++) {
		  summary += signals[i].getTimeWindowsForAnomaly(anomalyOrder[j][0]).length + "\t";
		}
		summary += "\n";
	  }
	  textArea.value = summary;
	};

	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_ADDED);
	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNALS_REANALYZED);

	return controller;
  }();

  return module;
}(AE || {}));

function padR(value, length) {
  return (value.toString().length < length) ? padR(value + " ", length) : value;
}

function padL(value, length) {
  return (value.toString().length < length) ? padL(" " + value, length) : value;
}

/*
 * PERCENTAGE VIEW 
 */

var AE = (function (module) {

  module.percentageViewController = function () {
	var controller = {};

	controller.onEvent = function (evt) {
	  var textArea = document.getElementById("percentage");
	  var anomalyOrder = [
		[AE.const.LOW_PEAK, AE.const.MIN_LOW, AE.const.MAX_LOW],
		[AE.const.MIDDLE_PEAK, AE.const.MIN_MIDDLE, AE.const.MAX_MIDDLE],
		[AE.const.BOTTOM_PEAK, AE.const.MIN_BOTTOM],
		[AE.const.MULTIPLE_PEAK, AE.const.MIN_MULTIPLE, AE.const.MAX_MULTIPLE],
		[AE.const.IRREGULAR_PHASE, AE.const.MIN_IRREGULAR],
		[AE.const.PLATFORM_ABNORMALITY, AE.const.MAX_PLATFORM],
		[AE.const.OSCILLATION, AE.const.MAX_OSCILLATION]];
	  var summary = "FILE_NAME\t";
	  for (var i = 0; i < anomalyOrder.length; i++) {
		summary += anomalyOrder[i][0] + "%\t";
	  }
	  summary += "\n";
	  var signals = AE.dataModel.getSignals();
	  for (var i = 0; i < signals.length; i++) {
		summary += padR(signals[i].fileName(), 70) + "\t";
		for (var j = 0; j < anomalyOrder.length; j++) {
		  var value = ((signals[i].getPercentageForAnomaly(anomalyOrder[j][0]).toFixed(2)).toString());
		  summary += value + "\t";
		}
		summary += "\n";
	  }
	  textArea.value = summary;
	};

	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_ADDED);
	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNALS_REANALYZED);

	return controller;
  }();

  return module;
}(AE || {}));

/*
 * SIGNAL LIST VIEW
 */
var AE = (function (module) {

  module.signalListViewController = function () {
	var controller = {};

	controller.onEvent = function (evt) {
	  var normalTextArea = document.getElementById("normalList");
	  var abnormalTextArea = document.getElementById("abnormalList");
	  var normalSignals = "Regular\n\n";
	  var abnormalSignals = "Abnormal\n\n";
	  var signals = AE.dataModel.getSignals();
	  for (var i = 0; i < signals.length; i++) {
		if (signals[i].isNormal()) {
		  normalSignals += signals[i].fileName() + "\n";
		} else {
		  abnormalSignals += signals[i].fileName() + "\n";
		}
	  }
	  normalTextArea.value = normalSignals;
	  abnormalTextArea.value = abnormalSignals;
	};

	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNAL_ADDED);
	AE.eventDispatcher.addListener(controller, AE.const.EVENT_TYPE_SIGNALS_REANALYZED);

	return controller;
  }();

  return module;
}(AE || {}));


/*
 * PARAMETER VIEW
 * jQuery UI sliders
 */
$(function () {

  function handleSliderEvent(event, ui) {
	var id = event.target.id;
	var type = sliderIdsToConstants[id];
	if (Array.isArray(type)) {
	  if (ui.value === ui.values[0]) {
		type = sliderIdsToConstants[id][0];
	  } else {
		type = sliderIdsToConstants[id][1];
	  }
	}
	AE.threshold.setValueOf(type, ui.value / 100);
	setLabelValueFor(event.target.id);
  }

  function value(type) {
	return Math.round(AE.threshold.value(type) * 100);
  }

  function valueString(type) {
	return value(type) + "%";
  }

  function setLabelValueFor(sliderId) {
	var type = sliderIdsToConstants[sliderId];
	if (Array.isArray(type)) {
	  $("#" + sliderId + "Label").text(valueString(type[0]) + "-" +
			  valueString(type[1]));
	} else {
	  $("#" + sliderId + "Label").text(valueString(type));
	}
  }

  var sliderIdsToConstants = {
	noiseSlider: AE.const.NOISE_RATIO,
	oscSlider: AE.const.OSCILLATION,
	platformSlider: AE.const.MAX_PLATFORM,
	bottomSlider: AE.const.MIN_BOTTOM,
	irregularSlider: AE.const.MIN_IRREGULAR,
	lowSlider: [AE.const.MIN_LOW, AE.const.MAX_LOW],
	middleSlider: [AE.const.MIN_MIDDLE, AE.const.MAX_MIDDLE],
	multipleSlider: [AE.const.MIN_MULTIPLE, AE.const.MAX_MULTIPLE]
  };

  // Create sliders and set label values
  var sliders = document.getElementsByClassName("thresholdSlider");
  for (var i = 0; i < sliders.length; i++) {
	var id = sliders.item(i).id;
	var type = sliderIdsToConstants[id];
	if (Array.isArray(type)) {
	  $("#" + id).slider({
		range: true,
		min: 0,
		max: 100,
		values: [value(type[0]),
		  value(type[1])],
		slide: handleSliderEvent
	  });
	} else {
	  $("#" + id).slider({
		range: "max",
		min: 0,
		max: 100,
		value: value(type),
		slide: handleSliderEvent
	  });
	}
	setLabelValueFor(id);
  }

  // create sliders that do not match above creation pattern
  $("#noiseSlider").slider({
	range: "min",
	min: 0,
	max: 50,
	value: value(AE.const.NOISE_RATIO),
	slide: handleSliderEvent
  });
  $("#oscSlider").slider({
	range: "min",
	min: 0,
	max: 50,
	value: value(AE.const.OSCILLATION),
	slide: handleSliderEvent
  });
  $("#platformSlider").slider({
	range: "min",
	min: 0,
	max: 100,
	value: value(AE.const.MAX_PLATFORM),
	slide: handleSliderEvent
  });

  AE.eventDispatcher.addListener(function () {
	var test = {};
	test.onEvent = function () {
	  for (var i = 0; i < sliders.length; i++) {
		var id = sliders.item(i).id;
		var type = sliderIdsToConstants[id];
		if (Array.isArray(type)) {
		  $("#" + id).slider("option", "values", [value(type[0]), value(type[1])]);
		} else {
		  $("#" + id).slider("option", "value", value(type));
		}
		setLabelValueFor(id);
	  }
	};
	return test;
  }(), AE.const.EVENT_TYPE_THRESHOLD_VALUES_RESET);
});