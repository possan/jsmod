ByteBuffer = function(data) {

	var locals = {
		_bytes : data,
		_position : 0
	};

	return {
		position : function() {
			return locals._position;
		},
		length : function() {
			return locals._bytes.length;
		},
		seek : function(b) {
			locals._position = b;
		},
		readByte : function() {
			var r = locals._bytes[locals._position];
			locals._position++;
			return r;
		},
		readShort : function() {
			var b0 = this.readByte();
			var b1 = this.readByte();
			return b1 * 256 + b0;
		},
		readString : function(l) {
			var r = "";
			for ( var k = 0; k < l; k++) {
				r += String.fromCharCode(this.readByte());
			}
			return r;
		},
		readBuffer : function(l) {
			var bb = locals._bytes
					.slice(locals._position, locals._position + l);
			// console.log("readBuffer from " + locals._position + ", " + l
			// + " bytes forward, got " + bb.length );
			locals._position += l;
			return new ByteBuffer(bb);
		}
	};
}
