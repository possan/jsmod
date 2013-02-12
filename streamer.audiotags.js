var AudioTagStreamer = function() {

	//
	// Play N audio tags back to back (only uses 8bit mono output.)
	//

	this.audioCallback = null;

	this.streamer_queued = [];
	this.streamer_bufferindex = 0;
	this.streamer_buffers = [];
	this.streamer_buffersize = 4000;
	this.streamer_samplerate = 44100;
	this.streamer_playing = false;

	var self = this;

	var getWaveData = function(data) {
		var n = data.length/2;
		var integer = 0, i = 0;
		var header = "RIFF<##>WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00<##><##>\x01\x00\x08\x00data<##>";
		function insertLong(value) {
			var bytes = "";
			for (i = 0; i < 4; i++) {
				bytes += String.fromCharCode(value % 256);
				value = value >> 8;
			}
			header = header.replace('<##>', bytes);
		}
		insertLong(36 + n);
		insertLong(self.streamer_samplerate);
		insertLong(self.streamer_samplerate);
		insertLong(n);
		for ( var i = 0; i < n; ++i) {
			header += String.fromCharCode(Math.round(Math.min(1, Math.max(-1,
					(data[i*2+0] + data[i*2+1]) / 2)) * 126 + 128));
		}
		return 'data:audio/wav;base64,' + btoa(header);
	}

	this.step = function() {
		if (!self.streamer_playing)
			return;

		if (typeof(self.audioCallback) === 'undefined')
			return;

		if (self.audioCallback === null)
			return;

		var at = self.streamer_buffers[self.streamer_bufferindex];
		// console.log('streamer: step.', at);
		self.streamer_bufferindex++;
		if (self.streamer_bufferindex >= self.streamer_buffers.length)
			self.streamer_bufferindex = 0;
		// at.stop();
		// at.pause();
		// at.setAttribute('src', '');
		at.setAttribute('src', getWaveData(self.streamer_queued));
		at.load();
		at.play();
		self.streamer_queued = self.audioCallback(self.streamer_buffersize);
	}

	return this;
};

AudioTagStreamer.prototype.supported = function() {
	return true;
}

AudioTagStreamer.prototype.init = function(samplerate) {

	var buffers = [];

	for (var i=0; i<10; i++) {
		var a1 = document.createElement('audio');
		document.body.appendChild(a1);
		buffers.push(a1);
	}

	this.streamer_buffers = buffers;
	this.streamer_bufferindex = 0;
	this.streamer_samplerate = samplerate;
	this.streamer_buffersize = Math.floor(samplerate / 8);
	this.streamer_queued = [];

	setInterval(this.step, (this.streamer_buffersize * 1000 / this.streamer_samplerate) - 5);
}

AudioTagStreamer.prototype.stream = function(callback) {
	this.audioCallback = callback;
}

AudioTagStreamer.prototype.play = function() {
	this.streamer_playing = true;
}

AudioTagStreamer.prototype.stop = function() {
	this.streamer_playing = false;
}

AudioTagStreamer.prototype.isPlaying = function() {
	return this.streamer_playing;
}
