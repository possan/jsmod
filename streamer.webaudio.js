var WebAudioStreamer = function() {
	this.playing = false;
	this.audioCallback = null;
	this.sampleRate = 44100;
	return this;
};

WebAudioStreamer.prototype.supported = function() {
	// return false;
	return ('webkitAudioContext' in window)
}

WebAudioStreamer.prototype.init = function(samplerate) {

	this.sampleRate = samplerate;

	this.context = new webkitAudioContext();

	var self = this;

	this.dummynode = this.context.createOscillator();

	this.scriptnode = this.context.createScriptProcessor(512,1,2);
	this.scriptnode.onaudioprocess = function (e) {
        var inputBuffer = e.inputBuffer.getChannelData(0);
		var outputl = e.outputBuffer.getChannelData(0);
		var outputr = e.outputBuffer.getChannelData(1);

		for (var i = 0; i < outputl.length; i++) {
		    outputl[i] = 0;
		    outputr[i] = 0;
		}

		if (self.playing) {
			buf = self.audioCallback(outputl.length);
			if( buf.length == outputl.length * 2 )
				for (var i = 0; i < outputl.length; i++) {
				    outputl[i] = buf[i*2+0];
				    outputr[i] = buf[i*2+1];
				}
		}
	}

	this.dummynode.connect(this.scriptnode);
	this.scriptnode.connect(this.context.destination);
}

WebAudioStreamer.prototype.stream = function(callback) {
	this.audioCallback = callback;
}

WebAudioStreamer.prototype.play = function() {
	this.playing = true;
}

WebAudioStreamer.prototype.stop = function() {
	this.playing = false;
}

WebAudioStreamer.prototype.isPlaying = function() {
	return this.playing;
}
