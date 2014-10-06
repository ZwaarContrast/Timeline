$(window).load(function(){
	$('#timeline').Timeline({propagateEventsElements:$('#timelineline')});
	$('#timelineline').TimelineLine();

	//$('#timeline-content').clipthru({ autoUpdate: true, autoUpdateInterval: true });


	// keyboard navigation events
	document.addEventListener( 'keydown', function( ev ) {
		var keyCode = ev.keyCode || ev.which;

		switch (keyCode) {
			//up
			case 38:
				$("#slideshow").trigger('setStep', [4,true]);
				break;
			//shift
			case 16:
				$("#slideshow").trigger('enableTimeline');
				break;
		}
	});
});