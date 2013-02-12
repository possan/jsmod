var NullStreamer = function() {
	this.playing = false;
	this.audioCallback = null;
	this.sampleRate = 44100;
	return this;
};

NullStreamer.prototype.supported = function() {
	return true;
}

NullStreamer.prototype.init = function(samplerate) {
	this.sampleRate = samplerate;
}

NullStreamer.prototype.stream = function(callback) {
	this.audioCallback = callback;
}

NullStreamer.prototype.play = function() {
	this.playing = true;
}

NullStreamer.prototype.stop = function() {
	this.playing = false;
}

NullStreamer.prototype.isPlaying = function() {
	return this.playing;
}
