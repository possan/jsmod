<?php
	$f = fopen( $argv[1], "r" );
	fseek( $f, 0, SEEK_END );
	$l = ftell( $f );
	fseek( $f, 0, SEEK_SET );
	$b = fread( $f, $l );
	fclose( $f );
	echo base64_encode( $b );
?>
