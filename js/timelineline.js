/*
* Script for a zoomable timeline line
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
	var TimelineLine = function(elem, options) {
		this.el = elem;
		this.element = $(elem);
		this.options = options;
	};

	TimelineLine.prototype = {
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
			slideshowRatio:0.3,
			timelineClassMax:'timelineline-max',
			timelineClassMin:'timelineline-min',
			handleClass:'timelineline-handle',
			handleClassNotAnimating:'not-timelineline-handle-animating',
			slideClass:'timelineline-slide',
			slideFontSize: 70,
			slideFontSizeOverview: 24,
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
			this.slideshowRatio = 0.3
			this.windowWidth = this.getViewport('x');

			//Call functions for initialisation
			this.getElements();
			this.getData();
			this.setStyles();
			this.reflow();

			//Bind events
			this.bindResize();
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
			this.handle = this.element.find('.'+this.config.handleClass)[0];
			this.slides = this.element.find('.'+this.config.slideClass);
			this.slideTitles = this.slides.find('h2');
		},
		/*
		 * 	Function to get data like prefixed styles ans slide amounts
		 */
		getData: function(){
			this.slidesCount = this.slides.length;
			this.transformStyle = this.getPrefixedStyle('transform');
			this.transformStyleStyle = this.getPrefixedStyle('transform-style');
			this.transitionStyle = this.getPrefixedStyle('transition');	
			this.transitionEndEventName = this.transitionEndEventNames[this.transitionStyle];
		},
		/*
		 * Set initial styling for elements
		 */
		setStyles:function(){
			var _self = this;

			//Set width of the sliding handle
			this.handle.style.width = (this.slidesCount * 100 + '%');

			//Set the width of each slide
			for (var i = 0; i < this.slides.length; i++) {
				this.slides[i].style.width = 100 / _self.slidesCount + '%';
			}
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
		 *	In this function we expose functions of this plugin to be used outside of the plugin using events
		 *	which can be triggered on the element on which the plugin is called on.
		 */
		bindCustomEvents:function(){
			var _self = this;

			$(this.element).on('onSetStepStart',function(ev,index){
				_self.setStep(index,false);
			});
			$(this.element).on('onToggleViewStart',function(ev,fullscreen){
				_self.toggleView();
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

			//Set styling
			this.removeClass(this.handle,this.config.handleClassNotAnimating);
			//_self.handle.style.width = _self.isFullscreen ? _self.config.slideshowRatio * 100*_self.slidesCount + '%' : _self.slidesCount * 100 + '%';

			var handleWidth = _self.isFullscreen ? _self.config.slideshowRatio * 100*_self.slidesCount + '%' : _self.slidesCount * 100 + '%';
			TweenLite.to(_self.handle, 0, {width:handleWidth,ease:Power2.easeInOut});
			

			//Calculate distance for translate
			var distance;

			if(!this.isFullscreen){
				distance = this.current*-1*this.sliderWidth;
				this.removeClass(this.el,'timelineline-min');

				TweenLite.to(_self.slideTitles, 0.2, {'font-size': this.config.slideFontSize+'px'});

			}else{
				//First part before the plus sign is the amount calculated to the middle of the screen
				distance = (((1-this.config.slideshowRatio)/2)*this.sliderWidth ) + (this.current*-1*this.sliderWidth*this.config.slideshowRatio);
				this.el.classList.add('timelineline-min');

				TweenLite.to(_self.slideTitles, 0.2, {'font-size':this.config.slideFontSizeOverview+'px'});
			}

			//Set distance
			TweenLite.to(this.handle,0.4,{x:distance,y:0,z:0.1});

			_self.isFullscreen = !_self.isFullscreen;
	
		},
		/*
		 * This function is used to set the slider to a specific slide
		 */
		setStep:function (index, instant){
			//Check animating state
			if(this.isDisabled) return false;
			this.reflow();
			//Check valid destination index
			if(index>=0 && index<=this.slidesCount-1){

				//Check for instant, remove transition if needed
				if(instant){
					this.handle.classList.add(this.config.handleClassNotAnimating);
				}else{
					this.removeClass(this.handle,this.config.handleClassNotAnimating);
				}

				//Set correct translate 
				var distance;
				if(this.isFullscreen){
					distance = index*-1*this.sliderWidth;
					//alert(this.sliderWidth);
				}else{
					distance = (((1-this.config.slideshowRatio)/2)*this.sliderWidth ) + (index*-1*this.sliderWidth*this.config.slideshowRatio);
				}
				//this.handle.style[this.transformStyle] = 'translate3d('+distance+'px,0,0)';

				TweenLite.to(this.handle,(instant ? 0 : 0.4),{x:distance,y:0,z:0.1});

				//Set current state
				this.current = index;
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
			if(this.isFullscreen){
				this.sliderWidth = this.windowWidth;
			}else{
				this.sliderWidth = this.windowWidth;
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
		}
	};

	//Extend Jquery with the Statistic function/object
	$.fn.TimelineLine = function(options) {
		//Do for each of the passed elements
		return this.each(function() {
			//Construct new Statistic object and call initialisation function
			new TimelineLine(this, options).init();
		});
	};
})(jQuery, window, document);