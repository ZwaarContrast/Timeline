/*
* Script for a zoomable timeline slider
*
* Based on Codrop's DraggableDualViewSlideshow
* Link: http://tympanus.net/codrops/2014/06/26/draggable-dual-view-slideshow/
*
* Version: 1.0
*
* Author: Zwaar Contrast
*
* Contact: postduif@zwaarcontrast.nl
*
* Dependencies: jQuery (1.11.x)
* 
* If jQuery touchswipe is found, will support swipes and pinches
*
* Events exposed for external communication: 
* Supported: 'disableTimeline', 'enableTimeline', 'nextSlide'(instant), 'previousSlide'(instant), 'setStep'(index,instant), 'setSlide'(element,instant)
* 
* Usage:
* For example: $("#slideshow").trigger('setStep', [3, true]);
*
*/
(function($, window, document, undefined) {
	"use strict";

	var docElem = window.document.documentElement;
	/*
	* 	In the constructor we wrap the element on which the plugin is called on in a jQuery object 
	*	and expose the passed on options for usage in the init function
	*/
	var Timeline = function(elem, options) {
		this.el = elem;
		this.element = $(elem);
		this.options = options;
	};

	Timeline.prototype = {
		/*
		 * 	Keycodes
		 */
		keycodes: {
			'left':37,
			'right':39,
			'up':38,
			'down':40
		},
		/*
		 * 	Names of event after transition ends
		 */
		transitionEndEventNames : {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd',
			'msTransition': 'MSTransitionEnd',
			'transition': 'transitionend'
		},
		/*
		*	Default values, which can be overwritten by merging with config on initialisation
		*/
		defaults:{
			resizeDebounce:300,
			propagateEventsElements:'',
			//Options for zooming out the timeline
			perspective : '1200',
			slideshowRatio : 0.3,
			//Classnames
			timelineClassMax:'timeline-max',
			timelineClassMin:'timeline-min',
			draggerClass:'timeline-dragger',
			draggerClassMax:'timeline-dragger-max',
			draggerClassMin:'timeline-dragger-min',
			handleClass:'timeline-handle',
			handleClassAnimating:'is-timeline-handle-animating',
			slideClass:'timeline-slide',
		},

		/*
		 *	Initialisation function, read passed config and call necessary functions to launch our plugin like binding events and setting status variables
		 */
		init: function() {
			//Get the options and merge with defaults
			this.config = $.extend({}, this.defaults, this.options);

			//Status, like animating, initialised or loaded
			this.current = 0;
			this.isFullscreen = true;
			this.isAnimating = false;
			this.isDisabled = false;

			//Variables, plugin wide variables
			this.slideshowRatio = this.config.slideshowRatio;
			this.windowWidth = this.getViewport('x');

			//Call functions for initialisation
			this.getElements();
			this.getData();
			this.setStyles();
			this.reflow();

			//Bind events
			this.bindResize();
			this.bindKeyboard();
			this.bindClick();
			this.bindTouch();
			this.bindCustomEvents();

			return this;
		},
		/*
		 *	Function to get necessary elements for interactions
		 */
		getElements: function(){
			//Get the window
			this.window = $(window);

			//Get slider elements
			this.dragger = this.element.find('.'+this.config.draggerClass)[0];
			this.handle = this.element.find('.'+this.config.handleClass)[0];
			this.slides = this.element.find('.'+this.config.slideClass);	

			//Get control elements
			this.next = $("#next");
			this.prev = $("#prev");
			this.toggle = $("#toggle");
			this.disable = $("#disable");
		},
		/*
		 * 	Function to get data like prefixed styles ans slide amounts
		 */
		getData: function(){
			this.propagateEvents = this.config.propagateEventsElements.length>0;
			this.slidesCount = this.slides.length;
			this.transformStyle = this.getPrefixedStyle('transform');
			this.transformStyleStyle = this.getPrefixedStyle('transform-style');
			this.transitionStyle = this.getPrefixedStyle('transition');	
			this.perspectiveStyle = this.getPrefixedStyle('perspective');
			this.transitionEndEventName = this.transitionEndEventNames[this.transitionStyle];
		},
		/*
		 * Set initial styling for elements
		 */
		setStyles:function(){
			var _self = this;

			//Set class on the handle
			this.dragger.classList.add(this.config.draggerClassMax);

			//Set width of the sliding handle
			this.handle.style.width = (this.slidesCount * 100 + '%');

			//Set the width of each slide
			for (var i = 0; i < this.slides.length; i++) {
				this.slides[i].style.width = 100 / _self.slidesCount + '%';
			}

			//Set perspective
			this.el.style[this.perspectiveStyle] = this.config.perspective + 'px';
		},
		/*
		 * 	(Debounced) resize handling
		 */
		bindResize:function(){
			//Variables and reference to self
			var TO = false, _self = this;

			//We make this construct to debounce the resize event,
			//so it doesn't call our functions a bazillion times
			this.window.resize(function() {
				if (TO !== false){
					clearTimeout(TO);
				}
				_self.reflow();
				_self.setStep(_self.current,true);
				_self.windowWidth = _self.getViewport('x');
				TO = setTimeout(function(){
					//Do stuff here
					_self.reflow();
					_self.setStep(_self.current,true);
				}, _self.config.resizeDebounce);
			});
		},
		/*
		 * 	Keyboard handling
		 */
		bindKeyboard:function(){
			var _self = this;
			//Keyboard navigation events
			document.addEventListener( 'keydown', function( ev ) {
				//Get key pressed
				var keyCode = ev.keyCode || ev.which;

				switch (keyCode) {
					// right and left keys
					case _self.keycodes['left']:
					_self.setStep( _self.current - 1 );
					break;
					case _self.keycodes['right']:
					_self.setStep( _self.current + 1 );
					break;
					case _self.keycodes['down']:
					ev.preventDefault();
					_self.toggleView();
					break;

				}
			});
		},
		/*
		 * 	Click handling
		 */
		bindClick:function(){
			var _self = this;

			//Bind clicks on slides when zoomed out
			this.slides.click(function(ev){
				ev.preventDefault();

				//Check for fullscreen and set slide to the one clicked on
				if(!_self.isFullscreen) {
					_self.setSlide(this);
				}
				
				return false;
			});

			//Bind controls
			this.next.click(function(ev){
				ev.preventDefault();
				_self.setStep( _self.current + 1 );
				return false;
			});
			this.prev.click(function(ev){
				ev.preventDefault();
				_self.setStep( _self.current + -1 );
				return false;
			});
			this.toggle.click(function(ev){
				ev.preventDefault();
				_self.toggleView();
				return false;
			});
			this.disable.click(function(ev){
				ev.preventDefault();
				_self.toggleTimeline();
				return false;
			});
		},
		/*
		 * 	Touch/swipe handling
		 */
		bindTouch:function(){
			var _self = this;

			//Check for touchswipe
			if($.fn.swipe){

				//Both the pinches and swipes are on two separate elements because of a bug in jquery.touchswipe
				//https://github.com/mattbryson/TouchSwipe-Jquery-Plugin/issues/192
				this.element.swipe({
					//pinchIn:function(event, direction, distance, duration, fingerCount, pinchZoom) {
					pinchIn:function() {
						if(!_self.isFullscreen){
							_self.toggleView();
						}
					},
					pinchOut:function() {
						if(_self.isFullscreen){
							_self.toggleView();
						}
					},
					fingers:2
				});
				$(this.handle).swipe( {
			        swipeLeft:function() {
			        	_self.setStep(_self.current+1);
			        },
			        swipeRight:function() {
			        	_self.setStep(_self.current-1);
			        },
			        fingers:1
			    });
			}
		},
		/*
		 *	In this function we expose functions of this plugin to be used outside of the plugin using events
		 *	which can be triggered on the element on which the plugin is called on.
		 */
		bindCustomEvents:function(){
			var _self = this;

			//Bind on the disableTimeline event disable interactions
			$(this.element).on('onSetStepStart',function(){
				_self.isDisabled = true;
			});
			//Bind on the enableTimeline event enable interactions
			$(this.element).on('enableTimeline',function(){
				_self.isDisabled = false;
			});
			//Bind on the nextSlide event to go to the next slide
			$(this.element).on('nextSlide',function(ev,instant){
				_self.setStep(_self.current+1,instant);
			});
			//Bind on the previousSlide event to go to the previous slide
			$(this.element).on('previousSlide',function(ev,instant){
				_self.setStep(_self.current+1,instant);
			});
			//Bind on the setStep event to go to a specific index
			$(this.element).on('setStep',function(ev, index,instant){
				if(index){
					_self.setStep(index,instant);
				}
			});
			//Bind on the setSlide event to go to the specific
			$(this.element).on('setSlide',function(ev, element, instant){
				if(element){
					_self.setSlide(element,instant);
				}
			});
		},
		/*
		 *	Get the viewport dimension of a specific axis
		 */
		getViewport:function(axis){
			var client, inner;
			//Check x or y axis
			if( axis === 'x' ) {
				client = docElem['clientWidth'];
				inner = window['innerWidth'];
			}else if( axis === 'y' ) {
				client = docElem['clientHeight'];
				inner = window['innerHeight'];
			}
			return client < inner ? inner : client;
		},
		/*
		 *	Toggle between normal and zoomed-out view of the timeline
		 */
		toggleView:function(){
			var _self = this;

			//Check and set animating state
			if( this.isAnimating || this.isDisabled ) {return false;}
			this.isAnimating = true;

			//Fire event
			this.dispatchEvent('onToggleViewStart',this.isFullscreen);

			//Add preserve-3d to the slides (seems to fix a rendering problem in firefox)
			this.preserve3dSlides( true );

			//Set classes to allow for transitions
			this.removeClass(this.el,this.isFullscreen ? this.config.timelineClassMax : this.config.timelineClassMin );
			this.el.classList.add(this.isFullscreen ? this.config.timelineClassMin : this.config.timelineClassMax );

			//Calculate perspective
			var p = this.config.perspective,
			r = this.config.slideshowRatio,
			zAxisVal = this.isFullscreen ? p - ( p / r ) : 0;

			//Set transform

			this.dragger.style[_self.transformStyle] =_self.isFullscreen ?  'translate3d( -50%, -100%, ' + zAxisVal + 'px )': 'translate3d( -50%, -50%, ' + zAxisVal + 'px )';

			//Declare transition Callback
			var onEndTransitionFn = function( ev ) {
				//Check transition
				if(ev && ev.propertyName.indexOf( 'transform' ) === -1 ) return;
				
				//Remove event listener
				this.removeEventListener( _self.transitionEndEventName, onEndTransitionFn );

				if( !_self.isFullscreen ) {
					//Remove preserve-3d to the slides (seems to fix a rendering problem in firefox)
					_self.preserve3dSlides();
				}

				//Set classes to allow for transitions
				_self.removeClass(_self.dragger,_self.isFullscreen ? _self.config.draggerClassMax : _self.config.draggerClassMin );
				_self.dragger.classList.add(_self.isFullscreen ? _self.config.draggerClassMin : _self.config.draggerClassMax );

				//Set styling
				// this.style[_self.transformStyle] = _self.isFullscreen ? 'translate3d( -50%, -100%, 0px )':'translate3d( -50%, -50%, 0px )';
				// this.style.width = _self.isFullscreen ? _self.config.slideshowRatio * 100 + '%' : '100%';
				// this.style.height = _self.isFullscreen ? _self.config.slideshowRatio * 100 + '%' : '100%';

				//Calculate values after resizing
				_self.isFullscreen = !_self.isFullscreen;
				_self.reflow();

				//Set slide instantly
				_self.setStep(_self.current,true,true);

				_self.dispatchEvent('onToggleViewEnd',this.isFullscreen?true:false);

				//Change status
				_self.isAnimating = false; 
			};

			if(_self.transitionStyle) {
				this.dragger.addEventListener( _self.transitionEndEventName, onEndTransitionFn );
			}else{
				onEndTransitionFn();
			}
		},
		/*
		 * This function is used to set the slider to a specific slide
		 */
		setStep:function (index, instant,dontevent){
			var _self = this;
			//Check animating state
			if(this.isDisabled || (this.isAnimating && !instant)) return false;

			//Check valid destination index
			if(index>=0 && index<=this.slidesCount-1){
				//Fire event
				if(!dontevent)
				this.dispatchEvent('onSetStepStart',[index,instant]);

				//Check for instant, remove transition if needed
				if(instant){
					this.removeClass(this.handle,this.config.handleClassAnimating);
				}else{
					this.handle.classList.add(this.config.handleClassAnimating);
					this.isAnimating = true;
				}
				//Declare transition Callback
				var onEndStep = function( ev ) {
					//Check transition 
					if(ev && ev.propertyName.indexOf( 'transform' ) === -1 ) return;

					// //Remove event listener
					if(ev) this.removeEventListener( _self.transitionEndEventName, onEndStep );

					//Change status
					_self.isAnimating = false; 

					//Fire event
				 	_self.dispatchEvent('onSetStepFinish',[index,instant]);
				};

				//Set correct translate 
				this.handle.style[this.transformStyle] = 'translate3d('+index*-1*this.sliderWidth+'px,0,0)';

				//Set current state
				this.current = index;
				if(this.transitionStyle&&!instant){
					this.handle.addEventListener(this.transitionEndEventName, onEndStep );
				}else {
					onEndStep();
				}
			}
		},
		/*
		 * This function is used to set the slider to a specific slide with the element given (.slide element)
		 */
		setSlide:function (el, instant){
			//Get the index
			var index = this.slides.get().indexOf(el);

			if(index==this.current && !this.isFullscreen){
				this.toggleView();
			}else{
				this.setStep(index,instant);
			}
		},
		/*
		 *	Toggle between enabled and disabled timeline
		 */
		toggleTimeline:function(){
			this.isDisabled = this.isDisabled ? false : true;	
		},
		/*
		 * Our own custom function to get (un)prefixed) styles for css3 properties to set with javascript
		 */
		getPrefixedStyle:function(propName){
			var domPrefixes = 'Webkit Moz ms O'.split(' '),
			elStyle = document.documentElement.style;

			//Check unprefixed style
			if (elStyle[propName] !== undefined) return propName;

			//Check prefixed style
			propName = propName.charAt(0).toUpperCase() + propName.substr(1);
			for (var i = 0; i < domPrefixes.length; i++) {
				if (elStyle[domPrefixes[i] + propName] !== undefined) {
				return domPrefixes[i] + propName;
				}
			}

			//Return false if not supported
			return false;
		},
		/*
		 * Recalculate values (probably after resize)
		 */
		reflow:function(){
			this.sliderWidth = this.windowWidth;
		},
		/*
		 * Function to set and unset preserve 3d styling
		 */
		preserve3dSlides:function( add ) {
			var _self = this;
			for (var i = 0; i < this.slides.length; i++) {
				//this.slides[i].style[_self.transformStyleStyle] = add ? 'preserve-3d' : '';
			}
		},
		/*
		 * Our own removeclass function, faster than jquery (10x)
		 */
		removeClass:function(element, className) {
			var classArray = element.className.split(' '),
				index = classArray.indexOf(className);
			if (index >= 0) {
				delete classArray[index];
				element.className = classArray.join(' ');
			}
		},
		/*
		 * Function to dispatch events to elements passed in the config
		 */
		 dispatchEvent:function(ev,params){
		 	var el;
		 	if(this.propagateEvents){
		 		for (var i = 0; i < this.config.propagateEventsElements.length; i++) {
		 			$(this.config.propagateEventsElements[i]).trigger(ev,params);
		 		}
		 	}
		 }
	};

	//Extend Jquery with the Statistic function/object
	$.fn.Timeline = function(options) {
		//Do for each of the passed elements
		return this.each(function() {
			//Construct new Statistic object and call initialisation function
			new Timeline(this, options).init();
		});
	};
})(jQuery, window, document);