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

 * This file contains data processing related stuff
 */
var AE = (function (module) {
  module.const = (function () {
	var constants = {};
	// thresholds
	constants.MIN_LOW = "MIN_LOW_PEAK";
	constants.MAX_LOW = "MAX_LOW_PEAK";
	constants.MIN_MIDDLE = "MIN_MIDDLE_PEAK";
	constants.MAX_MIDDLE = "MAX_MIDDLE_PEAK";
	constants.MIN_MULTIPLE = "MIN_MULTIPLE_PEAK";
	constants.MAX_MULTIPLE = "MAX_MULTIPLE_PEAK";
	constants.MIN_BOTTOM = "MIN_BOTTOM_PEAK";
	constants.MIN_IRREGULAR = "MIN_IRREGULAR_PHASE";
	constants.MAX_PLATFORM = "MAX_PLATFORM";
	constants.NOISE_RATIO = "NOISE_RATIO_SIGNAL";
	constants.MAX_OSCILLATION = "OSCILLATION";

	// event types
	constants.EVENT_TYPE_THRESHOLD_VALUE_CHANGED = "THRESHOLD_VALUE_CHANGED";
	constants.EVENT_TYPE_THRESHOLD_VALUES_RESET = "THRESHOLD_VALUES_RESET";
	constants.EVENT_TYPE_SIGNAL_ADDED = "SIGNAL_ADDED";
	constants.EVENT_TYPE_SIGNALS_REANALYZED = "SIGNALS_REANALYZED";
	constants.EVENT_TYPE_ANOMALY_SELECTION_CHANGED = "ANOMALY_SELECTION_CHANGED";
	constants.EVENT_TYPE_SIGNAL_SELECTION_CHANGED = "SIGNAL_SELECTION_CHANGED";

	// anomaly types
	constants.LOW_PEAK = "LOW_PEAK";
	constants.MIDDLE_PEAK = "MIDDLE_PEAK";
	constants.BOTTOM_PEAK = "BOTTOM_PEAK";
	constants.MULTIPLE_PEAK = "DOUBLE_PEAK";
	constants.IRREGULAR_PHASE = "IRREGULAR_PHASE";
	constants.PLATFORM_ABNORMALITY = "PLATEAU_ABNORMALITY";
	constants.OSCILLATION = "OSCILLATION";

	constants.NOISE = "NOISE";

	var uiConstants = {};
	uiConstants.SUMMARY_WIDTH = "SUMMARY_WIDTH";
	uiConstants.SUMMARY_HEIGHT = "SUMMARY_HEIGHT";
	uiConstants.GRAPH_WIDTH = "GRAPH_WIDTH";
	uiConstants.GRAPH_HEIGHT = "GRAPH_HEIGHT";
	uiConstants.GRAPH_PREVIEW_HEIGHT = "GRAPH_PREVIEW_HEIGHT";

	constants.ui = uiConstants;

	return constants;
  })();

  return module;
}(AE || {}));


var AE = (function (module) {

  module.fileProcessor = (function () {
	var processor = {};

	processor.handleFiles = function (files) {
	  if (files.length > 0) {
		processFiles(files);
	  }
	};

	function processFiles(files) {
	  for (var i = 0; i < files.length; i++) {
		if (files[i].type === "text/plain") {
		  processFile(files[i]);
		} else {
		  AE.notifyUserOfError("File " + files[i].name + " was not a text file");
		}
	  }
	}

	function processFile(file) {
	  var reader = new FileReader();
	  reader.onload = function () {
		try {
		  var signal = new AE.Signal();
		  signal.setFile(file.name);
		  delete signal.setFile;
		  parseText(reader.result, signal);
		  delete signal.addMeasurement;
		  AE.dataModel.addSignal(signal);
		} catch (e) {
		  console.log(e);
		  AE.notifyUserOfError(file.name + ": " + e);
		}
	  };
	  reader.readAsText(file);
	}

	function parseText(text, signal) {
	  var lines = text.split("\n");
	  lines.map(function (line, index) {
		if (line.trim() !== "") {
		  var values = line.split("\t");
		  var time = parseFloat(values[0]);
		  var value = parseFloat(values[1]);
		  if (isNaN(time) || isNaN(value)) {
			var lineNumber = index + 1;
			throw "Could not be parsed [line " + lineNumber + "]";
		  }
		  signal.addMeasurement(time, value);
		}
	  });
	}

	return processor;
  }());

  module.eventDispatcher = (function () {
	var dispatcher = {};
	var listeners = [];

	dispatcher.dispatch = function (event) {
	  for (var i = 0; i < listeners.length; i++) {
		var listener = listeners[i];
		if (listener.type === event.type) {
		  listener.listener.onEvent(event);
		}
	  }
	};

	dispatcher.addListener = function (listener, type) {
	  listeners[listeners.length] = {listener: listener, type: type};
	};

	dispatcher.removeListener = function (listener) {
	  for (var i = 0; i < listeners.length; i++) {
		if (listeners[i].listener === listener) {
		  listeners.splice(i, 1);
		  return;
		}
	  }
	};

	return dispatcher;
  })();

  module.Event = function (obj) {
	if (obj.type === undefined) {
	  throw "Event must have a type";
	}
	for (var property in obj) {
	  if (obj.hasOwnProperty(property)) {
		this[property] = obj[property];
	  }
	}
  };

  module.threshold = (function () {
	var threshold = {};
	var values = {};
	values[AE.const.MIN_LOW] = val(AE.const.MIN_LOW);
	values[AE.const.MAX_LOW] = val(AE.const.MAX_LOW);
	values[AE.const.MIN_MIDDLE] = val(AE.const.MIN_MIDDLE);
	values[AE.const.MAX_MIDDLE] = val(AE.const.MAX_MIDDLE);
	values[AE.const.MIN_MULTIPLE] = val(AE.const.MIN_MULTIPLE);
	values[AE.const.MAX_MULTIPLE] = val(AE.const.MAX_MULTIPLE);
	values[AE.const.MIN_BOTTOM] = val(AE.const.MIN_BOTTOM);
	values[AE.const.MIN_IRREGULAR] = val(AE.const.MIN_IRREGULAR);
	values[AE.const.MAX_PLATFORM] = val(AE.const.MAX_PLATFORM);
	values[AE.const.NOISE_RATIO] = val(AE.const.NOISE_RATIO);
	values[AE.const.OSCILLATION] = val(AE.const.OSCILLATION);

	threshold.value = function (type) {
	  return values[type];
	};

	threshold.setValueOf = function (type, value) {
	  if (values[type] !== undefined && values[type] !== value) {
		values[type] = value;
		AE.eventDispatcher.dispatch(
				new AE.Event({
				  type: AE.const.EVENT_TYPE_THRESHOLD_VALUE_CHANGED,
				  anomalyType: type,
				  newValue: value}));
	  }
	};

	threshold.resetDefaults = function () {
	  for (var property in values) {
		if (values.hasOwnProperty(property)) {
		  values[property] = defaultValue(property);
		}
	  }
	  AE.eventDispatcher.dispatch(
			  new AE.Event({
				type: AE.const.EVENT_TYPE_THRESHOLD_VALUES_RESET
			  }));
	};

	function val(name) {
	  return readSavedValue(name) || defaultValue(name);
	}

	// TODO
	function readSavedValue(name) {
	  return null;
	}

	function defaultValue(name) {
	  switch (name) {
		case AE.const.MIN_LOW:
		  return 0.10;
		case AE.const.MAX_LOW:
		  return 0.61;
		case AE.const.MIN_MIDDLE:
		  return 0.00;
		case AE.const.MAX_MIDDLE:
		  return 0.70;
		case AE.const.MIN_MULTIPLE:
		  return 0.20;
		case AE.const.MAX_MULTIPLE:
		  return 0.88;
		case AE.const.MIN_BOTTOM:
		  return 0.18;
		case AE.const.MIN_IRREGULAR:
		  return 1.00;
		case AE.const.MAX_PLATFORM:
		  return 0.75;
		case AE.const.NOISE_RATIO:
		  return 0.08;
		case AE.const.OSCILLATION:
		  return 0.31;
	  }
	}

	return threshold;
  }());

  module.dataModel = (function () {
	var dataModel = {};
	var signals = [];

	dataModel.addSignal = function (signal) {
	  signals[signals.length] = signal;
	  signal.analyzeSections();
	  AE.eventDispatcher.dispatch(
			  new AE.Event(
					  {type: AE.const.EVENT_TYPE_SIGNAL_ADDED,
						value: signal
					  }));
	};

	dataModel.getSignal = function (fileName) {
	  for (var i = 0; i < signals.length; i++) {
		if (signals[i].fileName() === fileName) {
		  return signals[i];
		}
	  }
	};

	dataModel.getSignals = function () {
	  return signals;
	};

	/*
	 * 
	 * @returns {Array} of object literals with properties 
	 *          type, and value, eg. {type: AE.const.LOW_PEAK, value: 2"}
	 *          type is the name of the anomaly
	 *          value is the sum of anomalies of all signals
	 *          
	 *          Array is in descending order by number of anomalies
	 */
	dataModel.getTotalAnomaliesByType = function () {
	  var totalAnomalies = [];
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.LOW_PEAK, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.MIDDLE_PEAK, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.BOTTOM_PEAK, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.MULTIPLE_PEAK, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.IRREGULAR_PHASE, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.PLATFORM_ABNORMALITY, value: 0};
	  totalAnomalies[totalAnomalies.length] = {type: AE.const.OSCILLATION, value: 0};

	  for (var i = 0; i < signals.length; i++) {
		for (var j = 0; j < totalAnomalies.length; j++) {
		  totalAnomalies[j].value += signals[i].getTimeWindowsForAnomaly(totalAnomalies[j].type).length;
		}
	  }

	  totalAnomalies.sort(function (a, b) {
		return b.value - a.value;
	  });

	  return totalAnomalies;
	};

	dataModel.onEvent = function (event) {
	  if (signals.length === 0)
		return;
	  if (event.anomalyType === AE.const.NOISE_RATIO || event.type === AE.const.EVENT_TYPE_THRESHOLD_VALUES_RESET) {
		for (var i = 0; i < signals.length; i++) {
		  signals[i].analyzeSections();
		}
	  } else {
		for (var i = 0; i < signals.length; i++) {
		  signals[i].analyzeAnomalies();
		}
	  }
	  AE.eventDispatcher.dispatch(new AE.Event({type: AE.const.EVENT_TYPE_SIGNALS_REANALYZED}));
	};

	AE.eventDispatcher.addListener(dataModel, AE.const.EVENT_TYPE_THRESHOLD_VALUE_CHANGED);
	AE.eventDispatcher.addListener(dataModel, AE.const.EVENT_TYPE_THRESHOLD_VALUES_RESET);

	return dataModel;
  })();

  module.Signal = function () {
	var file;
	var measurements = [];
	var minValue, maxValue;
	var start, end;
	var sections = [];
	var oscillatingSections = [];
	var topRegression = {};
	var middleRegression = {};
	var bottomRegression = {};
	var medianPhase = 0;
	var anomaliesPercent = {};
	var anomalies = {};

	this.fileName = function () {
	  return file;
	};
	this.getMeasurements = function () {
	  return measurements;
	};
	this.getMinValue = function () {
	  return minValue;
	};
	this.getMaxValue = function () {
	  return maxValue;
	};
	this.getStartTime = function () {
	  return start;
	};
	this.getEndTime = function () {
	  return end;
	};

	/**
	 * 
	 * @returns object literal containing properties
	 *          slope, and yIntercept meaning that 
	 *          the regression equation is
	 *          y = slope * x + yIntercept
	 *          eg. {slope: 2, yIntercept: 5}
	 */
	this.getTopRegression = function () {
	  return topRegression;
	};
	this.getMiddleRegression = function () {
	  return middleRegression;
	};
	this.getBottomRegression = function () {
	  return bottomRegression;
	};
	this.getMedianPhase = function () {
	  return medianPhase;
	};

	/**
	 * 
	 * @returns an Array of object literals containing 
	 *          properties 'start' and 'end' holding 
	 *          start and end time of one decresing section
	 *          eg. {start: 12, end: 45}
	 */
	this.getDecreasingTimeWindows = function () {
	  var windows = [];
	  sections.forEach(function (section) {
		if (section.direction === "down") {
		  windows[windows.length] = {start: measurements[section.startIndex].time,
			end: measurements[section.endIndex].time};
		}
	  });
	  return windows;
	};

	/**
	 * 
	 * @param type the name of the anomaly type
	 * 
	 * @returns an Array of object literals containing
	 *          properties 'start' and 'end' holding 
	 *          start and end time of a time window 
	 *          for one anomaly of requested type
	 *          eg. {start: 12, end: 45}
	 */
	this.getTimeWindowsForAnomaly = function (type) {
	  return anomalies[type];
	};

	this.getPercentageForAnomaly = function (type) {
	  return anomaliesPercent[type];
	};


	this.isNormal = function () {
	  for (var key in anomalies) {
		if (anomalies.hasOwnProperty(key)) {
		  if (anomalies[key].length !== 0) {
			return false;
		  }
		}
	  }
	  return true;
	};

	/*
	 * should be called when noise level changes
	 */
	this.analyzeSections = function () {
	  sections = [];
	  var sectionStartIndex = 0;
	  var direction = measurements[0].value >= measurements[1].value ? "down" : "up";
	  for (var i = 1; i < measurements.length; i++) {
		if (i === measurements.length - 1) {
		  sections[sections.length] = {startIndex: sectionStartIndex,
			endIndex: i,
			direction: direction};
		}
		else if (directionChanges(measurements[i], measurements[i + 1], direction)) {
		  sections[sections.length] = {startIndex: sectionStartIndex,
			endIndex: i,
			direction: direction};
		  sectionStartIndex = i;
		  direction = direction === "down" ? "up" : "down";
		}
	  }
	  combineSectionsCausedByNoise();

	  calculateRegressionLines();

	  this.analyzeAnomalies();
	};

	function directionChanges(firstValue, secondValue, currentDirection) {
	  var max = Math.max(firstValue.value, secondValue.value);
	  return currentDirection === "down" && max === secondValue.value
			  || currentDirection === "up" && max === firstValue.value;
	}

	function combineSectionsCausedByNoise() {
	  var noiseRatio = AE.threshold.value(AE.const.NOISE_RATIO);
	  var signalValueRange = maxValue - minValue;
	  var noiseThreshold = noiseRatio * signalValueRange;
	  var i = 1;
	  while (i < sections.length - 1) {
		if (sectionHeight(sections[i]) < noiseThreshold) {
		  combineSectionsSurroundingIndex(i);
		  // combined i-1, i, and i+1 at index i-1, so next section
		  // is now at index i -> do not increase i here
		} else {
		  i++;
		}
	  }
	}


	/*
	 * should be called when sections change
	 */
	function calculateRegressionLines() {
	  var topPeaks = [];
	  var bottomPeaks = [];
	  var statistics = calculateSectionsStatistics();
	  includeAndSortPeaks(topPeaks, statistics, shouldBeIncludedInTopPeaks, sectionMax);
	  topRegression = linearRegression(topPeaks);
	  includeAndSortPeaks(bottomPeaks, statistics, shouldBeIncludedInBottomPeaks, sectionMin);
	  bottomRegression = linearRegression(bottomPeaks);

	  includeAndSortPeaks(topPeaks, statistics, shouldBeIncludedInTopPeaks2, sectionMax);
	  includeAndSortPeaks(bottomPeaks, statistics, shouldBeIncludedInBottomPeaks2, sectionMin);

	  topRegression = linearRegression(topPeaks);
	  bottomRegression = linearRegression(bottomPeaks);
	  calculateAndSetMiddleRegression();
	}

	function calculateAndSetMiddleRegression() {
	  var x, y;
	  if (isNaN(topRegression.slope)) {
		x = 0;
		y = maxValue;
	  } else {
		x = topRegression.slope;
		y = topRegression.yIntercept;
	  }
	  if (isNaN(bottomRegression.slope)) {
		x = x / 2;
		y -= minValue;
	  } else {
		x = (x + bottomRegression.slope) / 2;
		y = (y + bottomRegression.yIntercept) / 2;
	  }
	  middleRegression.slope = x;
	  middleRegression.yIntercept = y;
	}

	function calculateSectionsStatistics() {
	  var sectionMaxAndMins = [];
	  var avgMin = 0;
	  var avgMax = 0;
	  sections.forEach(function (section) {
		var min, max;
		if (section.direction === "up") {
		  min = measurements[section.startIndex].value;
		  max = measurements[section.endIndex].value;
		} else {
		  min = measurements[section.endIndex].value;
		  max = measurements[section.startIndex].value;
		}
		sectionMaxAndMins[sectionMaxAndMins.length] = {min: min,
		  max: max};
		avgMin += min;
		avgMax += max;
	  });
	  avgMin = avgMin / sections.length;
	  avgMax = avgMax / sections.length;
	  sectionMaxAndMins.sort(function (a, b) {
		// sort in ascending order by section height
		return (a.max - a.min) - (b.max - b.min);
	  });
	  var medianHeightSection = sectionMaxAndMins[Math.floor(sectionMaxAndMins.length / 2)];
	  var medianMin = medianHeightSection.min;
	  var medianMax = medianHeightSection.max;
	  avgMin = (avgMin + medianMin) / 2;
	  avgMax = (avgMax + medianMax) / 2;
	  var avgHeight = avgMax - avgMin;
	  var smallestSection = sectionMaxAndMins[1];
	  var smallestHeight = smallestSection.max - smallestSection.min;

	  return {avgHeight: avgHeight, smallestHeight: smallestHeight};
	}

	function includeAndSortPeaks(peaks, statistics, includeCondition, includeFunction) {
	  sections.forEach(function (section) {
		if (includeCondition(section, statistics)) {
		  peaks[peaks.length] = includeFunction(section);
		}
	  });
	  peaks.sort(function (a, b) {
		// sort in ascending order by value
		return a.value - b.value;
	  });
	}

	function shouldBeIncludedInTopPeaks(section, statistics) {
	  return sectionHeight(section) > 0.6 * statistics.avgHeight
			  || sectionMax(section).value > maxValue - 0.4 * (maxValue - minValue);
	}

	function shouldBeIncludedInTopPeaks2(section) {
	  var max = sectionMax(section);
	  return max.value > topRegressionValueFor(max.time);
	}

	function shouldBeIncludedInBottomPeaks(section, statistics) {
	  return sectionHeight(section) > 0.75 * statistics.smallestHeight
			  || sectionMin(section).value < minValue + 0.2 * (maxValue - minValue);
	}

	function shouldBeIncludedInBottomPeaks2(section) {
	  var min = sectionMin(section);
	  return min.value < bottomRegressionValueFor(min.time);
	}

	/**
	 * 
	 * @param data an Array of objects containing properties
	 *        time and value sorted by value
	 * 
	 * returns an object literal containing properties
	 *         slope, and yIntercept meaning that 
	 *         the regression equation is
	 *         y = slope * x + yIntercept
	 *         eg. {slope: 2, yIntercept: 5}
	 */
	function linearRegression(data) {
	  var median = data[Math.floor(data.length / 2)];
	  var xMedian = median.time;
	  var yMedian = median.value;
	  var xxbar = 0;
	  var xybar = 0;
	  data.forEach(function (element) {
		xxbar += (element.time - xMedian) * (element.time - xMedian);
		xybar += (element.time - xMedian) * (element.value - yMedian);
	  });
	  var slope = xybar / xxbar;
	  var yIntercept = yMedian - slope * xMedian;

	  return {slope: slope, yIntercept: yIntercept};
	}



	/*
	 * Should be called when threshold values change
	 */
	this.analyzeAnomalies = function () {
	  resetAnomalies();

	  analyzeOscillation();

	  var phasingPeaks = [];
	  for (var i = 1; i < sections.length; i++) {
		var section = sections[i];
		var previousSection = sections[i - 1];
		var nextSection = sections[i + 1];

		var addPhaseForIrregularAnalysis = section.direction === "up";
		var hasMultiplePeak = false;

		if ($.inArray(i, oscillatingSections) > 0)
		  continue;

		if (lowPeak(i)) {
		  addAnomaly(AE.const.LOW_PEAK, section.startIndex, nextSection.endIndex);
		  addPhaseForIrregularAnalysis = false;
		}
		if (middlePeak(i)) {
		  if (section.direction === "up") {
			addAnomaly(AE.const.MIDDLE_PEAK, section.startIndex, nextSection.endIndex);
			addPhaseForIrregularAnalysis = false;
		  } else {
			addAnomaly(AE.const.MIDDLE_PEAK, previousSection.startIndex, section.endIndex);
		  }
		}
		if (platformAbnormality(i)) {
		  addAnomaly(AE.const.PLATFORM_ABNORMALITY, section.startIndex, section.endIndex);
		}
		if (multiplePeak(i)) {
		  addAnomaly(AE.const.MULTIPLE_PEAK, section.startIndex, nextSection.endIndex);
		  hasMultiplePeak = true;
		}
		/* removed after introducing oscillation
		if (bottomPeak(i)) {
		  addAnomaly(AE.const.BOTTOM_PEAK, section.startIndex, nextSection.endIndex);
		}
		*/
		if (addPhaseForIrregularAnalysis && !middlePeak(i + 1)) {
		  var maxIndex = section.direction === "up" ? section.endIndex : section.startIndex;
		  if (phasingPeaks.length !== 0 && hasMultiplePeak) {
			var index = Math.round((maxIndex + phasingPeaks[phasingPeaks.length - 1].value) / 2);
			var time = measurements[index].time;
			phasingPeaks[phasingPeaks.length - 1] =
					{time: time,
					  index: maxIndex};
		  } else {
			phasingPeaks[phasingPeaks.length] =
					{time: measurements[maxIndex].time,
					  index: maxIndex};
		  }
		}
	  }

	  analyzePhasingPeaksForIrregularity(phasingPeaks);
	  if (AE.anomalySelection.isSelected(AE.const.OSCILLATION))
		analyzeMultiplePeaksSequences();
	};

	function analyzePhasingPeaksForIrregularity(phasingPeaks) {
	  var distances = [];
	  for (var i = 1; i < phasingPeaks.length; i++) {
		distances[i - 1] = phasingPeaks[i].time - phasingPeaks[i - 1].time;
	  }
	  distances.sort(function (a, b) {
		// sort in ascending order
		return a - b;
	  });
	  medianPhase = distances[Math.floor(distances.length / 2)];
	  var allowedDistance = AE.threshold.value(AE.const.MIN_IRREGULAR) * medianPhase;
	  for (var i = 0; i < phasingPeaks.length - 1; i++) {
		var distance = phasingPeaks[i + 1].time - phasingPeaks[i].time;
		if (distance > medianPhase + allowedDistance
				|| distance < medianPhase - allowedDistance) {
		  addAnomaly(AE.const.IRREGULAR_PHASE, phasingPeaks[i].index, phasingPeaks[i + 1].index);
		}
	  }
	}

	/*
	 * Analyze sequences of Multiple Peaks and replace
	 * longer than two with single Oscillation
	 */
	function analyzeMultiplePeaksSequences() {
	  var multiplePeaks = anomalies[AE.const.MULTIPLE_PEAK];
	  if (!multiplePeaks.length)
		return;

	  var sequenceIndexes = [];
	  var count = 0;
	  var peak;
	  var prevPeak;
	  var firstPeak = true;
	  var i = multiplePeaks.length;
	  var startIndex, endIndex;

	  while (i--) {
		peak = multiplePeaks[i];
		prevPeak = i ? multiplePeaks[i - 1] : null;

		if (prevPeak != null && peak.start == prevPeak.end) {
		  count += 2;
		  if (firstPeak) {
			firstPeak = false;
			endIndex = peak.endIndex;
		  }
		  startIndex = prevPeak.startIndex;
		  sequenceIndexes[sequenceIndexes.length] = i;
		  sequenceIndexes[sequenceIndexes.length] = i - 1;
		} else {
		  if (count > 1) {
			// remove multiple peaks
			for(var j = 0; j < sequenceIndexes.length; j++)
			  multiplePeaks.splice(sequenceIndexes[j], 1);
			// replace with oscillation
			addAnomaly(AE.const.OSCILLATION, startIndex, endIndex);
		  }
		  firstPeak = true;
		  count = 0;
		  sequenceIndexes = [];
		}
	  }

	}

	function biggestSection() {
	  var length = 0;
	  var height = 0;

	  for (var i = 1; i < sections.length; i++) {
		var section = sections[i];
		var min = sectionMin(section);
		var max = sectionMax(section);
		var sectionHeight = max.value - min.value;
		var sectionLength;

		if (section.direction === "down") {
		  sectionLength = min.time - max.time;
		} else {
		  sectionLength = max.time - min.time;
		}
		if (sectionHeight > height)
		  height = sectionHeight;
		if (sectionLength > length)
		  length = sectionLength;
	  }

	  return {length: length, height: height};
	}

	function analyzeOscillation() {

	  var theBiggestSection = biggestSection();
	  var sizePercentage = AE.threshold.value(AE.const.OSCILLATION);
	  var oscillations = [];

	  oscillatingSections = [];

	  for (var i = 1; i < sections.length; i++) {
		var section = sections[i];
		var min = sectionMin(section);
		var max = sectionMax(section);
		var sectionHeight = max.value - min.value;
		var sectionLength;

		if (section.direction === "down") {
		  sectionLength = min.time - max.time;
		} else {
		  sectionLength = max.time - min.time;
		}

		/*
		 * Preprocess: find candidates for oscillating sections
		 */
		if (
				sectionLength < sizePercentage * theBiggestSection.length ||
				sectionHeight < sizePercentage * theBiggestSection.height)
		{
		  oscillations[oscillations.length] =
				  {startIndex: i, endIndex: i,
					start: section.startIndex, end: section.endIndex,
					span: 1};
		}
	  }

	  /*
	   * Pack each sequence of oscillating sections into one, big section
	   * 
	   */
	  var i = oscillations.length;
	  while (i--) {
		var oscillation = oscillations[i];
		var prevOscillation = i ? oscillations[i - 1] : null;

		if (prevOscillation) {
		  if (oscillation.start == prevOscillation.end) {
			prevOscillation.end = oscillation.end;
			prevOscillation.span += oscillation.span;
			prevOscillation.endIndex = oscillation.endIndex;
			oscillations.splice(i, 1);
		  }
		}
	  }

	  /*
	   * Create oscillation anomalies for sequences longer than four
	   */
	  for (var i = 0; i < oscillations.length; i++) {
		var oscillation = oscillations[i];
		if (oscillation.span > 4) {
		  addAnomaly(AE.const.OSCILLATION, oscillation.start, oscillation.end);
		  for (var j = oscillation.startIndex - 1; j <= oscillation.endIndex; j++) {
			oscillatingSections[oscillatingSections.length] = j;
		  }
		}
	  }

	}

	function resetAnomalies() {
	  anomalies[AE.const.LOW_PEAK] = [];
	  anomalies[AE.const.MIDDLE_PEAK] = [];
	  anomalies[AE.const.BOTTOM_PEAK] = [];
	  anomalies[AE.const.MULTIPLE_PEAK] = [];
	  anomalies[AE.const.IRREGULAR_PHASE] = [];
	  anomalies[AE.const.OSCILLATION] = [];
	  anomalies[AE.const.PLATFORM_ABNORMALITY] = [];

	  anomaliesPercent[AE.const.LOW_PEAK] = 0;
	  anomaliesPercent[AE.const.MIDDLE_PEAK] = 0;
	  anomaliesPercent[AE.const.BOTTOM_PEAK] = 0;
	  anomaliesPercent[AE.const.MULTIPLE_PEAK] = 0;
	  anomaliesPercent[AE.const.IRREGULAR_PHASE] = 0;
	  anomaliesPercent[AE.const.OSCILLATION] = 0;
	  anomaliesPercent[AE.const.PLATFORM_ABNORMALITY] = 0;
	}

	function addAnomaly(type, startIndex, endIndex) {
	  // add only anomalies that are active
	  if (!AE.anomalySelection.isSelected(type))
		return;
	  anomalies[type][anomalies[type].length]
			  = {start: measurements[startIndex].time, end: measurements[endIndex].time,
			  startIndex: startIndex, endIndex: endIndex};
	  anomaliesPercent[type] +=
			  (endIndex - startIndex) * 100 / measurements.length;
	}

	function bottomPeak(sectionIndex) {
	  if (sectionIndex < 0 || sectionIndex >= sections.length - 1)
		return false;
	  var section = sections[sectionIndex];
	  var min = sectionMin(section);
	  var bottomRegressionAtMin = bottomRegressionValueFor(min.time);
	  var topRegressionAtMin = topRegressionValueFor(min.time);
	  var regressionHeight = topRegressionAtMin - bottomRegressionAtMin;
	  return section.direction === "down"
			  && min.value < bottomRegressionAtMin - AE.threshold.value(AE.const.MIN_BOTTOM) * regressionHeight;
	}

	function lowPeak(sectionIndex) {
	  if (sectionIndex < 0 || sectionIndex >= sections.length - 1)
		return false;

	  var section = sections[sectionIndex];
	  var height = sectionHeight(section);
	  var min = sectionMin(section);
	  var bottomRegressionAtMin = bottomRegressionValueFor(min.time);
	  var topRegressionAtMin = topRegressionValueFor(min.time);
	  var regressionHeight = topRegressionAtMin - bottomRegressionAtMin;
	  var nextMin = sectionMin(sections[sectionIndex + 1]);

	  return section.direction === "up"
			  && min.value <= bottomRegressionAtMin + 0.15 * regressionHeight
			  && height > AE.threshold.value(AE.const.MIN_LOW) * regressionHeight
			  && height < AE.threshold.value(AE.const.MAX_LOW) * regressionHeight
			  && !multiplePeak(sectionIndex - 1)
			  && !multiplePeak(sectionIndex + 1)
			  && nextMin.value <= 1.1 * min.value
			  && nextMin.value >= 0.9 * min.value;
	}

	function multiplePeak(sectionIndex) {
	  if (sectionIndex < 0 || sectionIndex >= sections.length - 1)
		return false;
	  var section = sections[sectionIndex];
	  var min = sectionMin(section);
	  var max = sectionMax(section);
	  var height = sectionHeight(section);
	  var nextSectionHeight = sectionHeight(sections[sectionIndex]);
	  var bottomRegressionAtMin = bottomRegressionValueFor(min.time);
	  var topRegressionAtMax = topRegressionValueFor(max.time);
	  var topRegressionAtMin = topRegressionValueFor(min.time);
	  var regressionHeight = topRegressionAtMin - bottomRegressionAtMin;

	  return section.direction === "down"
			  // TODO: "The section maximum value is within 40% of section 
			  // height of the top regression line.": shouldn't this be
			  // Math.abs(max.value - topRegressionAtMax) <= 0.4 * height ??
			  && max.value >= 0.6 * topRegressionAtMax
			  // "The high percentage limit determines how deep the multiple peak can be, with a value of 100% being
			  // at the bottom regression line, and 50% at the middle regression line"
			  && min.value > bottomRegressionAtMin + regressionHeight * (1 - AE.threshold.value(AE.const.MAX_MULTIPLE))
			  && height > AE.threshold.value(AE.const.MIN_MULTIPLE) * regressionHeight
			  && height < 1.25 * nextSectionHeight
			  && height > 0.75 * nextSectionHeight;
	}

	function middlePeak(sectionIndex) {
	  if (sectionIndex < 0 || sectionIndex >= sections.length - 1)
		return false;
	  var section = sections[sectionIndex];
	  var height = sectionHeight(section);
	  var previousSectionHeight = sectionHeight(sections[sectionIndex - 1]);
	  var nextSectionHeight = sectionHeight(sections[sectionIndex + 1]);
	  var min = sectionMin(section);
	  var max = sectionMax(section);
	  var bottomRegressionAtMin = bottomRegressionValueFor(min.time);
	  var topRegressionAtMin = topRegressionValueFor(min.time);
	  var regressionHeight = topRegressionAtMin - bottomRegressionAtMin;
	  var middleRegressionAtMax = middleRegressionValueFor(max.time);
	  var middleRegressionAtMin = middleRegressionValueFor(min.time);

	  // TODO: should height be compared to sectionHeight, not regressionHeight??
	  // Also, should regressionHeight be calculated at min and at max?
	  return height > AE.threshold.value(AE.const.MIN_MIDDLE) * regressionHeight
			  && height < AE.threshold.value(AE.const.MAX_MIDDLE) * regressionHeight
			  && Math.abs(max.value - middleRegressionAtMax) < 0.6 * regressionHeight
			  && Math.abs(min.value - middleRegressionAtMin) < 0.4 * regressionHeight
			  && (
					  (section.direction === "down"
							  && height < 0.75 * nextSectionHeight
							  && !lowPeak(sectionIndex - 1))
					  || (section.direction === "up"
							  && height < 0.75 * previousSectionHeight
							  && !lowPeak(sectionIndex))
					  );
	}

	function platformAbnormality(sectionIndex) {
	  var section = sections[sectionIndex];
	  var startIndex = section.startIndex;
	  var endIndex = section.endIndex;
	  var windowSize = 3;

	  if (endIndex - startIndex < windowSize + 1) {
		return false;
	  }
	  var sumOfWindowRates = 0;
	  var count = 0;
	  var phase = 1;
	  var errorProbability = 0;
	  var windowRate;

	  for (var i = startIndex + windowSize; i <= endIndex; i++) {
		windowRate = 0;
		// this is equivalent to just calculating 
		// windowRate = measurements[i].value - measurements[i - windowSize].value
		for (var j = 0; j < windowSize; j++) {
		  windowRate += measurements[i - j].value - measurements[i - j - 1].value;
		}
		windowRate = Math.abs(windowRate / windowSize);

		if (phase === 1) {
		  count++;
		  sumOfWindowRates += windowRate;
		  // apparently this means the first phase is flat, therefore cannot be a platform abnormality
		  // but why 5?
		  if (sumOfWindowRates < 5) {
			return false;
		  }
		}
		var totalRate = sumOfWindowRates / count;
		if ((phase === 1 || phase === 2)
				&& windowRate < AE.threshold.value(AE.const.MAX_PLATFORM) * totalRate) {
		  errorProbability += (totalRate - windowRate) / totalRate;
		  phase = 2;
		}

		if (errorProbability > 1 && (phase === 2 || phase === 3)
				&& windowRate >= AE.threshold.value(AE.const.MAX_PLATFORM) * totalRate
				&& windowRate <= (1 + AE.threshold.value(AE.const.MAX_PLATFORM)) * totalRate) {
		  phase = 3;
		  count++;
		  sumOfWindowRates += windowRate;
		  totalRate = sumOfWindowRates / count;
		  errorProbability += Math.max(1, 1 - (totalRate - windowRate) / totalRate);
		}
		if (phase === 3 && errorProbability > 2) {
		  return true;
		}
	  }
	  return false;
	}


	function bottomRegressionValueFor(x) {
	  return regressionValueFor(x, bottomRegression);
	}

	function middleRegressionValueFor(x) {
	  return regressionValueFor(x, middleRegression);
	}

	function topRegressionValueFor(x) {
	  return regressionValueFor(x, topRegression);
	}

	function regressionValueFor(x, regressionEquation) {
	  return regressionEquation.slope * x + regressionEquation.yIntercept;
	}

	function sectionHeight(section) {
	  return Math.abs(measurements[section.startIndex].value -
			  measurements[section.endIndex].value);
	}

	/*
	 * 
	 * @param section, eg. {starIndex: 1, endIndex:5}
	 * @returns measurement object literal for section min value
	 *          eg. {time: 512, value: 1012}
	 */
	function sectionMin(section) {
	  if (section.direction === "down")
		return measurements[section.endIndex];
	  else
		return measurements[section.startIndex];
	}

	/*
	 * 
	 * @param section, eg. {starIndex: 1, endIndex:5}
	 * @returns measurement object literal for section max value
	 *          eg. {time: 512, value: 1012}
	 */
	function sectionMax(section) {
	  if (section.direction === "up")
		return measurements[section.endIndex];
	  else
		return measurements[section.startIndex];
	}

	function combineSectionsSurroundingIndex(i) {
	  var previousSection = sections[i - 1];
	  var nextSection = sections[i + 1];
	  previousSection.endIndex = nextSection.endIndex;
	  sections.splice(i, 2);
	}



	/*
	 * Following methods are removed after signal is built
	 * TODO: change to builder pattern or something similar?
	 */
	this.setFile = function (fileName) {
	  file = fileName;
	};
	this.addMeasurement = function (time, value) {
	  measurements[measurements.length] = {time: time, value: value};
	  if (minValue === undefined || value < minValue) {
		minValue = value;
	  }
	  if (maxValue === undefined || value > maxValue) {
		maxValue = value;
	  }
	  if (start === undefined || time < start) {
		start = time;
	  }
	  if (end === undefined || time > end) {
		end = time;
	  }
	};

  };



  return module;
}(AE || {}));