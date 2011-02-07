MMP = function(module, samplerate) {

	var SF_LOOPED = 1;

	var ptPeriods = [ 1712, 1616, 1524, 1440, 1356, 1280, 1208, 1140, 1076,
			1016, 960, 907, 856, 808, 762, 720, 678, 640, 604, 570, 538, 508,
			480, 453, 428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240,
			226, 214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113,
			107, 101, 95, 90, 85, 80, 75, 71, 67, 63, 60, 56, 53, 50, 47, 45,
			42, 40, 37, 35, 33, 31, 30, 28 ];

	var mmp_module = {
		iPosition : 0,
		iRow : 0,
		iSubTick : 0,
		nRowSamples : 0,
		nSampleRate : 44100,
		iTempo : 0,
		iSpeed : 0,
		nTracks : 0,
		pTrack : [],
		nLength : 0,
		nSongRepeat : 0,
		pOrder : [],
		nSamples : 0,
		pSample : [],
		nPatterns : 0,
		pPattern : []
	};

	function mmp_calcdeltavalue(noteindex) {
		return Math.round(82.0 * (1024.0 / ptPeriods[noteindex])
				* (44100.0 / mmp_module.nSampleRate));
	}

	function mmp_calcrowcounter() {
		var bpm = mmp_module.iTempo;
		var speed = mmp_module.iSpeed;
		bpm *= 25;
		bpm /= speed;
		var spb = 60.0 / bpm;
		mmp_module.nRowSamples = mmp_module.nSampleRate * spb;
		// console.log("speed " + speed + ", tempo " + mmp_module.iTempo
		// + " => bpm " + bpm + " => seconds per beat " + spb
		// + ", samples per row " + mmp_module.nRowSamples);
	}

	var leftamount = [ 1.0, 0.75, 0.60, 0.50 ];
	var rightamount = [ 0.50, 0.60, 0.75, 1.0 ];

	function SWAP16(x) {
		return (((x << 8) & 0xFF00) | ((x >> 8) & 0x00FF));
	}

	function mmp_convertpattern(buf) {
		var dstPatt = {
			nRows : 64,
			pNote : []
		};
		for ( var row = 0; row < 64; row++) {
			// console.log('row ' + row);
			for ( var chan = 0; chan < mmp_module.nTracks; chan++) {
				var note = {
					note : -1,
					sample : -1,
					volume : 0,
					effect : 0,
					effect_data : 0
				};
				var src0 = buf.readByte();
				var src1 = buf.readByte();
				var src2 = buf.readByte();
				var src3 = buf.readByte();
				var period = ((src0 & 0x0F) << 8) | (src1);
				var inst = (src0 & 0xF0) | (src2 >> 4);
				var command = src2 & 0x0F;
				var infobyte = src3;
				note.sample = inst - 1;
				note.volume = 255;
				note.effect = command;
				note.effect_data = infobyte;
				if (period != 0) {
					for ( var i = 0; i < 6 * 12; i++) {
						if (period >= ptPeriods[i]) {
							note.note = i;
							break;
						}
					}
				}
				dstPatt.pNote.push(note);
			}
		}
		return dstPatt;
	}

	function mmp_generate(samples) {
		// console.log("generating " + samples + " samples");
		var output = [];
		for ( var i = 0; i < samples; i++) {
			mmp_module.iSubTick--;
			if (mmp_module.iSubTick < 0) {
				// console.log("at row #" + mmp_module.iRow);
				var pat = mmp_module.pPattern[mmp_module.pOrder[mmp_module.iPosition]];
				for ( var ch = 0; ch < mmp_module.nTracks; ch++) {
					var track = mmp_module.pTrack[ch];
					var note = pat.pNote[(mmp_module.iRow * mmp_module.nTracks + ch)];
					if (note.sample >= 0 && note.note > 0) {
						// console.log('new note on channel ' + ch + ':', note);
						if (note.effect == 0x3) {
							track.sample_finaldelta = mmp_calcdeltavalue(note.note);
							track.sample_deltadelta = 16;
						} else {
							track.sample_index = note.sample;
							track.sample_position = 0;
							track.sample_delta = mmp_calcdeltavalue(note.note);
							track.sample_finaldelta = track.sample_delta;
							track.sample_deltadelta = 0;
						}
						// track.sample_index = 1;
						// track.sample_delta = 1024;
						// track.sample_finaldelta = track.sample_delta;
						// track.sample_deltadelta = 0;

						track.sample_volume = mmp_module.pSample[note.sample].volume;
						track.sample_pan = 128; // note->pan;
						// console.log('track', track);
					}
					switch (note.effect) {
					case 0xA: {
						if ((note.effect_data & 0x0F) != 0)
							track.sample_volume += note.effect_data >> 4;
						else
							track.sample_volume -= note.effect_data & 15;
						if (track.sample_volume < 0)
							track.sample_volume = 0;
						break;
					}
					case 0x1:
						// track->sample_delta -= note->effect_data;
						break;
					case 0x2:
						// track->sample_delta += note->effect_data;
						break;
					case 0xC:
						track.sample_volume = note.effect_data;
						break;
					case 0xF:
						if (note.effect_data < 32)
							mmp_module.iSpeed = note.effect_data;
						else
							mmp_module.iTempo = note.effect_data;
						mmp_calcrowcounter();
						break;
					case 0x9:
						track.sample_position = note.effect_data * 256 * 1024;
						break;
					}
				}
				// avancera nerŒt.
				mmp_module.iRow++;
				if (mmp_module.iRow >= pat.nRows) {
					mmp_module.iPosition++;
					if (mmp_module.iPosition >= mmp_module.nLength)
						mmp_module.iPosition = mmp_module.nSongRepeat;
					mmp_module.iRow = 0;
				}
				// resetta räknarn ...
				mmp_module.iSubTick = mmp_module.nRowSamples;
			}

			var left = 0;
			// var right = 0;
			for ( var ch = 0; ch < mmp_module.nTracks; ch++) {
				var track = mmp_module.pTrack[ch];
				var ch4 = ch % 4;
				if (track.sample_index < 0)
					continue;
				var sample = mmp_module.pSample[track.sample_index];
				var sp10 = track.sample_position >> 10;
				if (sp10 >= 0 && sp10 < sample.length) {
					// var s10 = track.sample_position >> 10;
					// var sfrac = track.sample_position % 1024;
					// var sfrac2 = 1024 - sfrac;
					var v = sample.data[sp10];
					v *= track.sample_volume;
					v /= 128;
					left += v;// * leftamount[ch4];
					// right += v * rightamount[ch4];
				}
			}
			left /= 2.0;
			// left /= 32768.0;
			if (left < -1)
				left = -1;
			if (left > 1)
				left = 1;

			output.push(left);
			// output.push(left / 32767.0);
			// output.push(right / 32767.0);

			// move the samplepointers... get interpolated sample values.
			for ( var ch = 0; ch < mmp_module.nTracks; ch++) {
				var track = mmp_module.pTrack[ch];
				if (track.sample_index < 0)
					continue;
				var sample = mmp_module.pSample[track.sample_index];
				track.sample_position += track.sample_delta;
				// om samplingen loopar och vi har gått förbi loopend - gå
				// till loopstart
				if ((sample.flags & SF_LOOPED)
						&& (track.sample_position >= sample.loop_end * 1024)) {
					track.sample_position = sample.loop_start * 1024;
				}
				if (track.sample_delta < track.sample_finaldelta)
					track.sample_delta += track.sample_deltadelta;
				else if (track.sample_delta > track.sample_finaldelta)
					track.sample_delta -= track.sample_deltadelta;

				// vi har gått utanför slutet på samplingen, stoppa.
				if (!(sample.flags & SF_LOOPED)
						&& (track.sample_position >= sample.length * 1024)) {
					// we went past end of sample ... STOP.
					track.sample_index = -1;
				}
			}
		}
		return output;
	}
	mmp_module.iPosition = 0;
	mmp_module.iRow = 0;
	mmp_module.iSubTick = 1;
	mmp_module.nRowSamples = 65536;

	var bb = new ByteBuffer(module);

	var mh = {
		songName : '',
		instruments : [],
		songLength : 0,
		restart : 0,
		songData : [],
		sign : ''
	};

	mh.songName = bb.readString(20);

	for ( var k = 0; k < 31; k++) {
		var ins = {
			iname : '',
			slength : 0,
			finetune : 0,
			volume : 0,
			loopStart : 0,
			loopLength : 0
		};
		ins.iname = bb.readString(22);
		ins.slength = SWAP16(bb.readShort());
		ins.finetune = bb.readByte();
		ins.volume = bb.readByte();
		ins.loopStart = SWAP16(bb.readShort());
		ins.loopLength = SWAP16(bb.readShort());
		// console.log("loaded instrument:", ins);
		mh.instruments.push(ins);
	}

	mh.songLength = bb.readByte();
	mh.restart = bb.readByte();
	for ( var k = 0; k < 128; k++)
		mh.songData[k] = bb.readByte();
	mh.sign = bb.readString(4);

	// console.log('songname:', mh.songName);
	// console.log('sign:', mh.sign);

	switch (mh.sign) {
	case 'M.K.':
	case 'M!K!':
	case 'FLT4!':
		mmp_module.nTracks = 4;
		break;
	case 'OCTA':
		mmp_module.nTracks = 8;
		break;
	// case 'CHN1':
	// mmp_module.nTracks = 1;
	// break;
	// if (mmp_memcmp(mh.sign + 1, "CHN", 3) == 0)
	// mmp_module.nTracks = mh.sign[0] - '0';
	// if (mmp_memcmp(mh.sign + 2, "CH", 2) == 0)
	// mmp_module.nTracks = (mh.sign[0] - '0') * 10 + (mh.sign[1] - '0');
	}

	// console.log('tracks:', mmp_module.nTracks);
	for ( var i = 0; i < mmp_module.nTracks; i++) {
		var t = {
			sample_index : -1,
			sample_position : 0,
			sample_delta : 0,
			sample_finaldelta : 0,
			sample_deltadelta : 0,
			sample_pan : 0,
			sample_volume : 0
		};
		mmp_module.pTrack.push(t);
	}

	var lastPat = 0;
	for ( var i = 0; i < 128; i++)
		lastPat = Math.max(lastPat, mh.songData[i]);

	mmp_module.nPatterns = lastPat + 1;

	for ( var i = 0; i < mmp_module.nPatterns; i++) {
		// console.log('converting pattern #' + i);
		var tbb = bb.readBuffer(256 * mmp_module.nTracks);
		var pat = mmp_convertpattern(tbb);
		mmp_module.pPattern.push(pat);
	}

	mmp_module.iSpeed = 6;
	mmp_module.iTempo = 125;
	mmp_calcrowcounter();

	mmp_module.nSamples = 32;
	for ( var i = 0; i < 31; i++) {
		var modi = mh.instruments[i];
		if (modi.slength == 0)
			continue;
		var s = {
			flags : 0,
			finetune : 0,
			volume : 0,
			length : 0,
			loop_start : 0,
			loop_end : 0,
			data : []
		};
		s.length = 2 * modi.slength;
		s.loop_start = 2 * modi.loopStart;
		s.loop_end = 2 * modi.loopStart + 2 * modi.loopLength;
		s.flags = 0;
		if (modi.loopLength > 1 && (modi.loopLength != modi.loopStart))
			s.flags |= SF_LOOPED;
		s.volume = modi.volume;
		s.finetune = 0;
		// s->panning = 128;
		var start = bb.position();
		for ( var j = 0; j < s.length; j++) {
			var cs = bb.readByte();
			if (cs > 127)
				cs = -127 + (cs - 127);
			// cs = 128 - (cs - 128);
			cs /= 128.0;
			// cs -= 16384;
			// cs = 32768 * (s.length - j) / s.length;
			// cs *= Math.sin( j / 6.0 );
			s.data[j] = cs;
		}
		// console.log('parsed sample #' + i + ' from ' + start + ':', s);
		mmp_module.pSample[i] = s;
	}

	mmp_module.nSongRepeat = mh.restart;
	mmp_module.nLength = mh.songLength;
	for ( var i = 0; i < mmp_module.nLength; i++)
		mmp_module.pOrder[i] = mh.songData[i];

	// console.log('mh data:', mh);
	// console.log('parsed module:', mmp_module);

	return {
		init : function(len, sr) {
			mmp_module.nSampleRate = sr;
		},
		getsamples : function(len) {
			return mmp_generate(len);
		}
	};
}
