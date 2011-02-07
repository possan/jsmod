Streamer = function(obj, buffers, sr) {

	var streamer_queued = [];
	var streamer_data = null;
	var streamer_bufferindex = 0;
	var streamer_buffers = [];
	var streamer_buffersize = 4410;
	var streamer_samplerate = 44100;
	var streamer_playing = false;

	function getWaveData(data) {
		var n = data.length;
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
		insertLong(streamer_samplerate);
		insertLong(streamer_samplerate);
		insertLong(n);
		for ( var i = 0; i < n; ++i) {
			header += String.fromCharCode(Math.round(Math.min(1, Math.max(-1,
					data[i])) * 126 + 128));
		}
		return 'data:audio/wav;base64,' + btoa(header);
	}
	function step() {
		if (streamer_playing) {
			var at = streamer_buffers[streamer_bufferindex];
			// console.log('streamer: step.', at);
			streamer_bufferindex++;
			if (streamer_bufferindex >= streamer_buffers.length)
				streamer_bufferindex = 0;
			// at.stop();
			// at.pause();
			// at.setAttribute('src', '');
			at.setAttribute('src', getWaveData(streamer_queued));
			at.load();
			at.play();
			streamer_queued = streamer_data.getsamples(streamer_buffersize);
		}
	}

	// console.log('streamer: init.');
	streamer_buffers = buffers;
	streamer_bufferindex = 0;
	streamer_samplerate = sr;
	streamer_buffersize = Math.floor(sr / 4);
	streamer_queued = [];
	streamer_data = obj;
	streamer_data.init(streamer_buffersize, streamer_samplerate);
	streamer_queued = streamer_data.getsamples(streamer_buffersize);
	// step();
	setInterval(step, (streamer_buffersize * 1000 / streamer_samplerate) - 5);

	return {
		isPlaying : function() {
			return streamer_playing;
		},
		play : function() {
			streamer_playing = true;
		},
		stop : function() {
			streamer_playing = false;
		}
	}
}
