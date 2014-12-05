/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var Stream = require('../Stream');
var Sink = require('../sink/Sink');
var CompoundDisposable = require('../disposable/CompoundDisposable');
var base = require('../base');

var map = base.map;
var tail = base.tail;

exports.combineArray = combineArray;
exports.combine = combine;

function combineArray(f, streams) {
	return new Stream(new Combine(f, map(getSource, streams)));
}

function combine(f /*, ...streams */) {
	return new Stream(new Combine(f, map(getSource, tail(arguments))));
}

function getSource(stream) {
	return stream.source;
}

function Combine(f, sources) {
	this.f = f;
	this.sources = sources;
}

Combine.prototype.run = function(sink) {
	var l = this.sources.length;
	var disposables = new Array(l);
	var sinks = new Array(l);

	var combineSink = new CombineSink(this.f, sinks, sink);

	for(var indexSink, i=0; i<l; ++i) {
		indexSink = sinks[i] = new IndexSink(i, combineSink);
		disposables[i] = this.sources[i].run(indexSink);
	}

	return new CompoundDisposable(disposables);
};

function CombineSink(f, sinks, sink) {
	this.f = f;
	this.sinks = sinks;
	this.sink = sink;
	this.ready = false;
}

CombineSink.prototype.event = function(t /*, indexSink */) {
	if(!this.ready) {
		this.ready = this.sinks.every(hasValue);
	}

	if(this.ready) {
		// TODO: Maybe cache values in their own array once this.ready
		this.sink.event(t, this.f.apply(void 0, map(getValue, this.sinks)));
	}
};

CombineSink.prototype.end = function(t, indexSink) {
	this.sink.end(t, indexSink.value);
};

CombineSink.prototype.error = Sink.prototype.error;

function IndexSink(i, sink) {
	this.index = i;
	this.sink = sink;
	this.hasValue = false;
	this.value = void 0;
}

IndexSink.prototype.event = function(t, x) {
	this.value = x;
	this.hasValue = true;
	this.sink.event(t, this);
};

IndexSink.prototype.end = function(t, x) {
	this.sink.end(t, this);
};

IndexSink.prototype.error = Sink.prototype.error;

function hasValue(indexSink) {
	return indexSink.hasValue;
}

function getValue(indexSink) {
	return indexSink.value;
}