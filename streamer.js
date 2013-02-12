var Streamer = function() {};

Streamer.create = function() {

	var webaudio = new WebAudioStreamer();
	if (webaudio.supported())
		return webaudio;
	delete webaudio;

	var audiotags = new AudioTagStreamer();
	if (audiotags.supported())
		return audiotags;
	delete audiotags;

	var nulls = new NullStreamer();
	return nulls;
}
