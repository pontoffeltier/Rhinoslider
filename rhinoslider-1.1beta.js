/**
 * Rhinoslider 1.1 beta
 * rhinoslider.com/rhinoslider
 *
 * Copyright 2012: Sebastian Pontow, René Maas <renemaas.de>
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * rhinoslider.com/license
 */
(function ($, window, undefined) {

	$.extend($.easing, {
		def:     'out',
		out:     function (none, currentTime, startValue, endValue, totalTime) {
			return -endValue * (currentTime /= totalTime) * (currentTime - 2) + startValue;
		},
		kick:    function (none, currentTime, startValue, endValue, totalTime) {
			if ((currentTime /= totalTime / 2) < 1) {
				return endValue / 2 * Math.pow(2, 10 * (currentTime - 1)) + startValue;
			}
			return endValue / 2 * (-Math.pow(2, -10 * --currentTime) + 2) + startValue;
		},
		shuffle: function (none, currentTime, startValue, endValue, totalTime) {
			if ((currentTime /= totalTime / 2) < 1) {
				return endValue / 2 * currentTime * currentTime * currentTime * currentTime * currentTime + startValue;
			}
			return endValue / 2 * ((currentTime -= 2) * currentTime * currentTime * currentTime * currentTime + 2) + startValue;
		}
	});

	var rhinoSlider = function (element, opts) {
		var
			settings = $.extend({}, $.fn.rhinoslider.defaults, opts),
			$slider = $(element),
			effects = $.fn.rhinoslider.effects,
			preparations = $.fn.rhinoslider.preparations,
			features = $.fn.rhinoslider.features,
			resets = $.fn.rhinoslider.resets

		//internal variables
			vars = {
				isPlaying:        false,
				hash:             false,
				durationAutoPlay: 0,
				bulletWidth:      0,
				active:           '',
				next:             '',
				container:        '',
				items:            '',
				hoverImages:      '',
				buttons:          [],
				prefix:           'rhino-',
				playedArray:      [],
				playedCounter:    0,
				original:         element,
				orgCSS:           [],
				aspectRatio:      1,
				version:          1.1
			}
		;

		//store original settings for reload
		$slider.data('rhinoslider:settings', opts);

		settings.callBeforeInit($slider, settings, vars);

		var
			setUpSettings = function ($slider, settings) {
				//bool
				var tmpValues = ['controlsPrevNext', 'globalControlsKeyboard', 'controlsPlayPause', 'pauseOnHover', 'forceTransition', 'animateActive', 'autoPlay', 'cycled', 'consoleLog', 'pauseOnControlUsage'];
				$.each(tmpValues, function (i, key) {
					settings[key] = String(settings[key]) === 'true' ? true : false;
				});

				//int
				tmpValues = ['showTime', 'controlFadeTime', 'effectTime', 'captionsFadeTime', 'slideToStart', 'maxBullets'];
				$.each(tmpValues, function (i, key) {
					settings[key] = ((key === 'effectTime' && settings.effect === 'none') || (key === 'captionsFadeTime' && settings['showCaptions'] === 'never')) ? 0 : parseInt(settings[key], 10);
				});

				//comma-separated
				tmpValues = ['effect', 'slidePrevDirection', 'slideNextDirection'];
				$.each(tmpValues, function (i, key) {
					var tmp = typeof settings[key] == 'string' ? settings[key].split(',') : settings[key];
					settings[key] = [];
					$.each(tmp, function (i, value) {
						settings[key].push($.trim(value));
					});
				});

				//comma-separated {x, y}
				tmpValues = ['shiftValue', 'parts'];
				$.each(tmpValues, function (i, key) {
					var tmp, type = typeof settings[key];
					tmp = type == 'string' || type == 'number' ? settings[key].toString().split(',') : settings[key];
					settings[key] = [];
					settings[key].x = parseInt(tmp[0], 10);
					settings[key].y = typeof tmp[1] == 'undefined' ? parseInt(tmp[0], 10) : parseInt(tmp[1], 10);
				});

				//other
				if (null != settings.features) {
					if(settings.features != 'none'){
						tmpFeature = typeof settings.features == 'string' ? settings.features.split(',') : settings.features;
						settings.features = {};
						$.each(tmpFeature, function (i, featureName) {
							var feature = $.trim(featureName);
							settings.features[feature] = features[feature];
						});
					}else{
						settings.features = {};
					}
				}
				if (null != settings.resets) {
					tmpReset = typeof settings.resets == 'string' ? settings.resets.split(',') : settings.resets;
					settings.resets = {};
					$.each(tmpReset, function (i, resetName) {
						var reset = $.trim(resetName);
						settings.resets[reset] = resets[reset];
					});
				}
				settings.features = null === settings.features ? features : settings.features;
				settings.resets = null === settings.resets ? resets : settings.resets;
				settings.width = null == settings.width ? $slider.width() : parseInt(settings.width, 10);
				settings.height = null == settings.height ? $slider.height() : parseInt(settings.height, 10);

				return settings;
			},

		//init function
			init = function ($slider, settings, vars) {
				settings = setUpSettings($slider, settings);

				vars.aspectRatio = settings.width / settings.height;
				vars.durationAutoPlay = settings.showTime + settings.captionsFadeTime;

				$slider.wrap('<div class="' + vars.prefix + 'container">');
				vars.container = $slider.parent('.' + vars.prefix + 'container');
				// @todo check if var is unused and remove it then
				var dataKey = 'data-' + vars.prefix + 'id', sliderID = empty($slider.attr('id')) ? $slider.data('rhinoslider:id') : $slider.attr('id');
				vars.container
					.attr({
						dataKey: $slider.data('rhinoslider:id'),
						id:      vars.prefix + 'container-' + sliderID
					})
					.mouseenter(function () {
						vars.container.addClass(vars.prefix + 'mouseover');
					})
					.mouseleave(function () {
						vars.container.removeClass(vars.prefix + 'mouseover');
					})
				;
				vars.isPlaying = settings.autoPlay;

				//the string, which will contain the button-html-code
				var buttons = '';

				//add prev/next-buttons
				if (settings.controlsPrevNext) {
					vars.container.addClass(vars.prefix + 'controls-prev-next');
					buttons = '<a class="' + vars.prefix + 'prev ' + vars.prefix + 'btn">' + settings.prevText + '</a><a class="' + vars.prefix + 'next ' + vars.prefix + 'btn">' + settings.nextText + '</a>';
					vars.container.append(buttons);

					vars.buttons.prev = vars.container.find('.' + vars.prefix + 'prev');
					vars.buttons.next = vars.container.find('.' + vars.prefix + 'next');

					//add functionality to the "prev"-button
					vars.buttons.prev.click(function () {
						transition($slider, settings, 'prev');

						if (vars.isPlaying) {
							if(settings.pauseOnControlUsage){
								//stop autoplay, if set
								pause();
							}else{
								resetAutoPlay($slider, settings);
							}
						}
					});

					//add functionality to the "next"-button
					vars.buttons.next.click(function () {
						transition($slider, settings, 'next');

						if (vars.isPlaying) {
							if(settings.pauseOnControlUsage){
								//stop autoplay, if set
								pause();
							}else{
								resetAutoPlay($slider, settings);
							}
						}
					});
				}

				//add play/pause-button
				if (settings.controlsPlayPause) {
					vars.container.addClass(vars.prefix + 'controls-play-pause');
					buttons = settings.autoPlay ? '<a class="' + vars.prefix + 'toggle ' + vars.prefix + 'pause ' + vars.prefix + 'btn">' + settings.pauseText + '</a>' : '<a class="' + vars.prefix + 'toggle ' + vars.prefix + 'play ' + vars.prefix + 'btn">' + settings.playText + '</a>';
					vars.container.append(buttons);

					vars.buttons.play = vars.container.find('.' + vars.prefix + 'toggle');

					//add functionality
					vars.buttons.play.click(function () {
						//self-explaining
						if (vars.isPlaying === false) {
							play();
						} else {
							pause();
						}
					});
				}

				//style buttons
				vars.container.find('.' + vars.prefix + 'btn').css({
					position: 'absolute',
					display:  'block',
					cursor:   'pointer'
				});

				//hide/show controls on hover or never
				if (settings.showControls !== 'always') {
					var allControls = vars.container.find('.' + vars.prefix + 'btn');
					allControls.stop(true, true).fadeOut(0);
					if (settings.showControls === 'hover') {
						vars.container
							.mouseenter(function () {
								allControls.stop(true, true).fadeIn(settings.controlFadeTime);
							})
							.mouseleave(function () {
								setTimeout(function () {
									allControls.fadeOut(settings.controlFadeTime);
								}, 200);
							});
					}
				}
				if (settings.showControls !== 'never') {
					vars.container.addClass(vars.prefix + 'show-controls');
				}

				//get content-elements and set css-reset for positioning
				$slider.children().wrap('<div>');
				vars.items = $slider.children();
				vars.items.addClass(vars.prefix + 'item');

				//give slider style to container
				var sliderStyles = settings.styles.split(','), style;
				$.each(sliderStyles, function (i, cssAttribute) {
					var resetStyle = 0;
					style = $.trim(cssAttribute);
					vars.container.css(style, $slider.css(style));
					switch (style) {
						case 'width':
						case 'height':
						case 'min-width':
						case 'min-height':
						case 'max-width':
						case 'max-height':
							resetStyle = '100%';
							break;
						case 'position':
							resetStyle = 'relative';
							break;
					}
					$slider.css(style, resetStyle);
				});
				if (vars.container.css('position') == 'static') {
					vars.container.css('position', 'relative');
				}

				$slider.css({
					top:      'auto',
					left:     'auto',
					position: 'relative'
				});

				//style items
				vars.items.css({
					margin:   0,
					width:    '100%',
					height:   '100%',
					position: 'absolute',
					top:      0,
					left:     0,
					zIndex:   0,
					opacity:  0,
					overflow: 'hidden'
				});

				vars.items.each(function (i, element) {
					$(element).attr('data-' + vars.prefix + 'item', vars.prefix + 'item' + i);
				});

				//add vars to data for use in features.hash
				$slider.data('rhinoslider:vars', vars);
				//set active element
				vars.active = getActive(vars, settings);

				//generate navigation
				if (settings.showBullets !== 'never') {
					vars.container.addClass(vars.prefix + 'show-bullets bullets-' + settings.bulletType);
					var
						navi = {prefix: '<div class="' + vars.prefix + 'bullets">', listStart: '<div><ol>', listEnd: '</ol></div>', suffix: '</div>', items: [], prevButtons: '', nextButtons: ''},
						arrows = {prev: '&lt;', next: '&gt;', first: '&laquo;', last: '&raquo;'},
						thumbWidth = parseInt(vars.container.width() / settings.maxBullets, 10),
						thumbHeight = maxThumbHeight = tmpWidth = 0, imageHoverOpacity = 0.5,
						itemIndex = ['first', 'prev', 'next', 'last'],
						visibleBullets = settings.maxBullets > vars.items.length ? vars.items.length : settings.maxBullets;
					;
					
					//add arrows for too many items
					if(settings.bulletType != 'image' && vars.items.length > settings.maxBullets){
						navi.prevButtons = navi.nextButtons = '';
						for(key in itemIndex){
							var naviKey = key < 2 ? 'prevButtons' : 'nextButtons';
							navi[naviKey] += '<a data-' + vars.prefix + 'rel="' + vars.prefix + 'item-' + itemIndex[key] + '" class="' + vars.prefix + 'bullet ' + vars.prefix + 'bullet-' + itemIndex[key] + ' ' + vars.prefix + 'bullet-control">' + arrows[itemIndex[key]]+ '</a>';
						}
					}
					
					
					if (settings.bulletType == 'hoverImage') {
						var hoverImagesIsOpen = false, hoverImagesTimeout, activeClass = vars.prefix + 'active-image';
	
						//add container for images
						vars.container.append('<div class="' + vars.prefix + 'hover-images"></div>');
						vars.hoverImages = vars.container.find('.' + vars.prefix + 'hover-images');
						thumbWidth = vars.hoverImages.width();
					}
					
					vars.items.each(function (i, element) {
						var $item = $(element), rel = vars.prefix + 'item' + i, index = parseInt(i + 1, 10), bulletContent;
						bulletContent = index;
						
						//when images are used, append them
						if (settings.bulletType != 'number') {
							var $img = $item.find('img:first'), src;
							src = $img.attr('src') != undefined ? $img.attr('src') : settings.noImage;

							thumbHeight = parseInt(thumbWidth / vars.aspectRatio, 10);
							maxThumbHeight = thumbHeight > maxThumbHeight ? thumbHeight : maxThumbHeight;
							bulletContent = '<img src="' + src + '" width="' + thumbWidth + '" height="' + thumbHeight + '" data-' + vars.prefix + 'rel="' + rel + '" />';
							bulletContent = settings.bulletType == 'hoverImage' ? index + ' ' + bulletContent : bulletContent;
						}
						navi.items.push('<li><a data-' + vars.prefix + 'rel="' + rel + '" class="' + vars.prefix + 'bullet">' + bulletContent + '</a></li>');
					});
					
					vars.container.append(navi.prefix+navi.prevButtons+navi.listStart+navi.items.join('')+navi.listEnd+navi.nextButtons+navi.suffix);
					vars.navigationContainer = vars.container.find('.' + vars.prefix + 'bullets');
					vars.navigation = vars.navigationContainer.find('ol');
					vars.buttons.bullets = vars.navigation.find('.' + vars.prefix + 'bullet');
					vars.buttons.bulletControls = vars.navigationContainer.find('.' + vars.prefix + 'bullet-control');
					
					vars.bulletWidth = vars.buttons.bullets.last().outerWidth();
					
					
					if(settings.bulletType != 'image'){
						//center bullets
						vars.navigation.css('width', vars.buttons.bullets.length * vars.bulletWidth);
						tmpWidth = visibleBullets * vars.bulletWidth;
						vars.navigation.parent().css({
							width: tmpWidth,
							marginLeft: -tmpWidth / 2
						});
						tmpWidth = (visibleBullets + vars.buttons.bulletControls.length) * vars.bulletWidth;
						vars.navigationContainer.css({
							width: tmpWidth,
							marginLeft: -tmpWidth / 2
						});
					}
					
					if (settings.bulletType == 'hoverImage') {
						thumbWidth = vars.hoverImages.width();

						vars.hoverImages.css('height', maxThumbHeight);
						vars.buttons.bullets
							.each(function (i, element) {
								$(element).find('img:first').appendTo(vars.hoverImages);
							})
							.mouseenter(function () {
								clearTimeout(hoverImagesTimeout);
								var $this = $(this);
								var
									$img = vars.hoverImages.find('[data-' + vars.prefix + 'rel=' + $this.attr('data-' + vars.prefix + 'rel') + ']'),
									$active = vars.hoverImages.find('.' + activeClass),
									left,
									containerLeft =  vars.navigationContainer.position().left + parseInt(vars.navigationContainer.css('margin-left'), 10)
									// - (vars.hoverImages.outerWidth(true) / 2);
									//vars.navigationContainer.outerWidth(true) - (vars.hoverImages.outerWidth(true) * 0.5) + 
								;
								//left pos of container - half its own size to center
								left = containerLeft - (vars.hoverImages.outerWidth(true) / 2);
								//find position of bullet
								left += ($this.parent('li').index() + 0.5) * $this.outerWidth(true);
								//add margin of ul 
								left += parseInt(vars.navigation.css('margin-left'), 10);
								//don't forget the controlbuttons
								left += (vars.buttons.bulletControls.length / 2) * vars.bulletWidth;
								vars.hoverImages.css('top', vars.navigationContainer.position().top - vars.hoverImages.height() - 10).find('img').not($img).css('z-index', 0);
								$active.css('z-index', 1).stop(true, true).removeClass(activeClass);
								$img.addClass(activeClass).css({zIndex: 2}).stop(true, true).fadeIn((hoverImagesIsOpen ? settings.controlFadeTime : 0), function () {
									if($img.attr('data-' + vars.prefix + 'rel') != $active.attr('data-' + vars.prefix + 'rel')){
										$active.css({display: 'none', zIndex: 0});
										$img.css('z-index', 1);
									}								
								});
								vars.hoverImages.stop(true, false).animate({opacity: 1, left: left}, settings.controlFadeTime / 2);
							})
						;
						vars.navigation
							.mouseenter(function () {
								vars.hoverImages.css('left', vars.navigationContainer.position().left + parseInt(vars.navigationContainer.css('margin-left'), 10) - (vars.hoverImages.outerWidth(true) * 0.5)).stop(true, true).fadeIn(settings.controlFadeTime / 2);
								hoverImagesIsOpen = true;
							})
							.mouseleave(function () {
								hoverImagesTimeout = setTimeout(function () {
									clearTimeout(hoverImagesTimeout);
									hoverImagesIsOpen = false;
									vars.hoverImages.stop(true, true).fadeOut(settings.controlFadeTime / 2);
								}, settings.controlFadeTime);
							})
						;
					} else if (settings.bulletType == 'image') {
						vars.navigation.css('width', vars.buttons.bullets.length * vars.bulletWidth);

						vars.navigation.parent().css('height', maxThumbHeight);
						vars.navigationContainer.css('height', maxThumbHeight);
						
						if(settings.controlsPrevNext){
							vars.buttons.prev.css('bottom', -vars.navigationContainer.height());
							vars.buttons.next.css('bottom', -vars.navigationContainer.height());
						}
						
						//on resize
						vars.container.on('setSize', '.' + vars.prefix + 'bullets', function () {
							var thumbWidth = parseInt(vars.container.width() / visibleBullets, 10), thumbHeight, navWidth;
							thumbHeight = thumbWidth / vars.aspectRatio;
							navWidth = vars.buttons.bullets.length * thumbWidth;
							vars.navigation.css('width', navWidth);
							
							vars.navigation.parent().css('height', thumbHeight);
							vars.navigationContainer.css('height', thumbHeight);
							
							vars.buttons.bullets.each(function (i, element) {
								$(element).find('img').attr({width: thumbWidth, height: thumbHeight});
							});
							if(settings.controlsPrevNext){
								vars.buttons.prev.css('bottom', -vars.navigationContainer.height());
								vars.buttons.next.css('bottom', -vars.navigationContainer.height());
							}
							vars.bulletWidth = thumbWidth;
							
							//animate
							marginLeft = -Math.abs(vars.active.attr('data-' + vars.prefix + 'item').replace(vars.prefix + 'item', '') * vars.bulletWidth) + (parseInt(settings.maxBullets / 2, 10) * vars.bulletWidth);
							marginLeft = marginLeft >= 0 ? 0 : Math.abs(marginLeft) >= navWidth ?  -navWidth : marginLeft;
							vars.navigation.stop(true, true).animate({marginLeft: marginLeft}, settings.controlsFadeTime);
							
							$slider.data('rhinoslider:vars', vars);
						});
						
						vars.buttons.bullets
							.fadeTo(0, imageHoverOpacity)
							.mouseenter(function () {
								$(this).stop(true, true).fadeTo(settings.controlFadeTime / 2, 1);
							})
							.mouseleave(function () {
								$(this).stop(true, true).fadeTo(settings.controlFadeTime / 2, imageHoverOpacity);
							})
						;
					}
					
					//set classes and variables
					vars.container.find('[data-' + vars.prefix + 'rel=' + vars.active.attr('data-' + vars.prefix + 'item') + ']').addClass(vars.prefix + 'active-bullet');
					vars.buttons.bullets.first().addClass(vars.prefix + 'first-bullet');
					vars.buttons.bullets.last().addClass(vars.prefix + 'last-bullet');
					
					//add functionality
					vars.buttons.bullets.click(function () {
						var itemID = $(this).attr('data-' + vars.prefix + 'rel');
						var
							$next = vars.container.find('[data-' + vars.prefix + 'item=' + itemID + ']'),
							curID = parseInt(vars.navigation.find('.' + vars.prefix + 'active-bullet').attr('data-' + vars.prefix + 'rel').replace(vars.prefix + 'item', ''), 10),
							nextID = parseInt(itemID.replace(vars.prefix + 'item', ''), 10),
							type;
						;
						type = curID < nextID ? 'next' : curID > nextID ? 'prev' : false;
						if(!type){
							return false;
						}
						transition($slider, settings, type, $next);

						if (vars.isPlaying) {
							if(settings.pauseOnControlUsage){
								//stop autoplay, if set
								pause();
							}else{
								resetAutoPlay($slider, settings);
							}
						}
					});
					
					vars.buttons.bulletControls.click(function(){
						var itemID = $(this).attr('data-' + vars.prefix + 'rel');
						
						type = (itemID == vars.prefix + 'item-first' || itemID == vars.prefix + 'item-prev') ? 'prev' : 'next';						
						$next = itemID == vars.prefix + 'item-first' ? vars.items.first() : (itemID == vars.prefix + 'item-last' ? vars.items.last() : false);

						transition($slider, settings, type, $next);
						
						if (vars.isPlaying) {
							if(settings.pauseOnControlUsage){
								//stop autoplay, if set
								pause();
							}else{
								resetAutoPlay($slider, settings);
							}
						}
					});
				}
				//hide/show bullets on hover or never
				if (settings.showBullets === 'hover') {
					vars.navigationContainer.hide();
					vars.container.mouseenter(
						function () {
							vars.navigationContainer.stop(true, true).fadeIn(settings.controlFadeTime);
						}).mouseleave(function () {
							setTimeout(function () {
								vars.navigationContainer.fadeOut(settings.controlFadeTime);
							}, 200);
						});
				}

				//add captions
				if (settings.showCaptions !== 'never') {
					vars.container.addClass(vars.prefix + 'show-captions');
					vars.items.each(function (i, element) {
						var $item = $(element);
						if (!$item.find('.' + vars.prefix + 'caption').length && $item.children('img').length) {
							var title = $.trim($item.children('img:first').attr('title')), alt = $.trim($item.children('img:first').attr('alt')), captionText;
							captionText = settings.captionSource == 'auto' ? (empty(title) ? alt : title) : $.trim($item.children('img:first').attr(settings.captionSource));
							if (!empty(captionText)) {
								$item.append('<div class="' + vars.prefix + 'caption">' + captionText + '</div>');
								$item.find('.' + vars.prefix + 'caption:empty').remove();
							}
						}
					});

					vars.container.find('.' + vars.prefix + 'caption').hide();
					if (settings.showCaptions === 'hover') {
						vars.container.mouseenter(
							function () {
								vars.active.find('.' + vars.prefix + 'caption').stop(true, true).fadeTo(settings.captionsFadeTime, settings.captionsOpacity);
							}).mouseleave(function () {
								setTimeout(function () {
									vars.active.find('.' + vars.prefix + 'caption').fadeOut(settings.captionsFadeTime);
								}, 200);
							});
					}
					vars.active.find('.' + vars.prefix + 'caption').fadeTo(0, settings.captionsOpacity);
				}
				//remove titles
				vars.items.each(function (i, element) {
					$(element).children('img').removeAttr('title');
				});

				//if pause on hover
				if (settings.pauseOnHover) {
					vars.container.addClass(vars.prefix + 'pause-on-hover');
					//play/pause function cannot be used for they trigger the isPlaying variable
					$slider
						.mouseenter(function () {
							if(vars.isPlaying){
								vars.container.addClass(vars.prefix + 'paused');
								pause();
							}
						})
						.mouseleave(function () {
							if (vars.container.hasClass(vars.prefix + 'paused')) {
								play();
								vars.container.removeClass(vars.prefix + 'paused');
							}
						});
				}

				vars.active = $slider.find('.' + vars.prefix + 'active');
				vars.active.css({
					zIndex:  1,
					opacity: 1
				});

				//check if slider is non-cycled
				if (!settings.cycled) {
					consoleLog('Slider is not cycled');
					vars.items.each(function (i, element) {
						var $item = $(element);
						if ($item.is(':first-child')) {
							$item.addClass(vars.prefix + 'firstItem');
						}
						if ($item.is(':last-child')) {
							$item.addClass(vars.prefix + 'lastItem');
						}
					});

					if (vars.active.is(':first-child') && settings.controlsPrevNext) {
						vars.buttons.prev.addClass('disabled');
					}
					if (vars.active.is(':last-child')) {
						if (settings.controlsPrevNext) {
							vars.buttons.next.addClass('disabled');
							pause();
						}
						if (settings.autoPlay) {
							vars.buttons.play.addClass('disabled');
						}
					}
				}

				//return the init-data to the slide for further use
				$slider.data('rhinoslider:vars', vars);

				//run features
				$.each(settings.features, function (key, feature) {
					consoleLog('Using ' + key);
					feature($slider, settings);
				});

				//start autoplay if set
				if (settings.autoPlay) {
					play();
				}

				settings.callBackInit($slider, settings, vars);
			},

		//get active item on init
			getActive = function (vars, settings) {
				if(features.hash != null){
					vars.hash = features.hash($slider, settings);
				}else{
					vars.items.each(function (key, element) {
						if (key == settings.slideToStart) {
							$(element).addClass(vars.prefix + 'active');
						}
					});
				}
				var $active = $slider.find('.' + vars.prefix + 'active');
				$active.stop(true, true).css({
					zIndex:  1,
					opacity: 1
				});
				consoleLog($active.attr('data-' + vars.prefix + 'item') + ' is the initial item');

				return $active;
			},

			consoleLog = function (msg) {
				if (settings.consoleLog && typeof (console) !== 'undefined' && console != null) {
					console.log('Rhinoslider: ' + msg);
				} else {
					return false;
				}
			},

		//check if item element is first-child
			isFirst = function ($item) {
				return $item.is(':first-child');
			},

		//check if item element is last-child
			isLast = function ($item) {
				return $item.is(':last-child');
			},

		//pause the autoplay and change the bg-image of the button to "play"
			pause = function () {
				var vars = $slider.data('rhinoslider:vars');
				clearInterval($slider.data('rhinoslider:interval'));
				$slider.data('rhinoslider:interval', null);
				vars.isPlaying = false;
				if (settings.controlsPlayPause) {
					vars.buttons.play.text(settings.playText).removeClass(vars.prefix + 'pause').addClass(vars.prefix + 'play');
				}
				//stop progressbar, if is included
				if (features['progressbar'] != undefined) {
					vars.container.find('.' + vars.prefix + 'progressbar').trigger('stop');
				}

				settings.callBackPause($slider, settings, vars);
			},

		//start/resume the autoplay and change the bg-image of the button to "pause"
			play = function () {
				var vars = $slider.data('rhinoslider:vars');
				if($slider.data('rhinoslider:interval') !== null){
					clearInterval($slider.data('rhinoslider:interval'));
				}
				intervalAutoPlay = setInterval(function () {
					if(vars.isPlaying && !vars.container.hasClass(vars.prefix + 'paused')){
						transition($slider, settings, 'next');
					}else{
						pause();
					}
				}, vars.durationAutoPlay);
				$slider.data('rhinoslider:interval', intervalAutoPlay);
				vars.isPlaying = true;
				if (settings.controlsPlayPause) {
					vars.buttons.play.text(settings.pauseText).removeClass(vars.prefix + 'play').addClass(vars.prefix + 'pause');
				}

				//start progressbar, if is included
				if (features['progressbar'] != undefined) {
					vars.container.find('.' + vars.prefix + 'progressbar').trigger('start', [vars.durationAutoPlay]);
				}

				settings.callBackPlay($slider, settings, vars);
			},
			
		//reset interval for autoplay
			resetAutoPlay = function ($slider, settings) {
				pause();
				setTimeout(function(){
					play();
				}, settings.effectTime + settings.progressbarFadeTime);
			},

		//prev/next function
			transition = function ($slider, settings, type, $next) {
				var vars = $slider.data('rhinoslider:vars'), effect = getRandom(settings.effect), inProgress = vars.container.hasClass('inProgress');
				if ((vars.container.hasClass('inProgress') && !settings.forceTransition) || (!settings.cycled && (type == 'prev' && isFirst(vars.active) || type == 'next' && isLast(vars.active))) || (type != 'prev' && type != 'next')) {
					return false;
				}
				
				if(type == 'prev'){
					settings.callBeforePrev($slider, settings, vars);
				}else{
					settings.callBeforeNext($slider, settings, vars);
				}
				
				vars.container.addClass('inProgress');
				
				//check, if the active element is the first/last, so we can set the last/first element to be the "next"-element
				if (!$next) {
					if (settings.randomOrder) {
						var nextID = getRandomItem(vars);
						vars.next = vars.container.find('[data-' + vars.prefix + 'item]' + nextID);
					} else {
						vars.next = type == 'prev' ? (vars.items.first().attr('data-' + vars.prefix + 'item') == vars.active.attr('data-' + vars.prefix + 'item') ? vars.items.last() : vars.active.prev()) : (vars.items.last().attr('data-' + vars.prefix + 'item') == vars.active.attr('data-' + vars.prefix + 'item') ? vars.items.first() : vars.active.next());
					}
				} else {
					vars.next = $next;
				}
				
				if (vars.next.hasClass(vars.prefix + 'active')) {
					return false;
				}

				if (inProgress && settings.forceTransition){
					//clear animation
					stopTransition($slider, settings, type, vars.active, vars.next);
				}else{
					vars.next.addClass(vars.prefix + 'next-item');
				
					//check for random effect
					if (preparations[effect] == undefined) {
						consoleLog('Preparations for ' + effect + ' not found.');
					} else {
						preparations[effect]($slider, settings, vars);
					}
				
					//hide captions
					if (settings.showCaptions !== 'never') {
						vars.active.find('.' + vars.prefix + 'caption').stop(true, true).fadeOut(settings.captionsFadeTime);
					}
				
					//change navigation, checks for change-before/-after itself
					changeNavigation($slider, settings, type, vars.next.attr('data-' + vars.prefix + 'item'));
					
					setTimeout(function () {
						var params = [];
						params.settings = settings;
						params.animateActive = settings.animateActive;
				
						//getDirection
						params.direction = getRandom(settings[type == 'prev' ? 'slidePrevDirection' : 'slideNextDirection']);
				
						//run effect
						if (effects[effect] == undefined) {
							consoleLog('Effect ' + effect + ' not found.');
						} else {
							consoleLog('Start transition['+type+']() with ' + effect + ' and element ' + vars.next.attr('data-' + vars.prefix + 'item'));
							effects[effect]($slider, params);
						}
						
						if (type == 'prev' && features['progressbar'] != undefined) {
							vars.container.find('.progressbar').trigger('start');
						}
						
						setTimeout(function () {
							settings[type == 'prev' ? 'callBackPrev' : 'callBackNext']($slider, settings, vars);
							vars.container.removeClass('inProgress');
							//start progressbar, if is included
							if (vars.isPlaying && features['progressbar'] != undefined) {
								vars.container.find('.' + vars.prefix + 'progressbar').trigger('start', [vars.durationAutoPlay - settings.effectTime]);
							}
						}, settings.effectTime);
					}, settings.captionsFadeTime);
				}
			},
			
		//change navigation before/after transition
			changeNavigation = function ($slider, settings, type, nextItemID) {
				if (settings.showBullets === 'never') {return false;}
				var
					vars = $slider.data('rhinoslider:vars'),
					time = settings.changeBullets == 'after' ? settings.effectTime + settings.captionsFadeTime : 0,
					curLeft = parseInt(vars.navigation.css('margin-left'), 10),
					navWidth = vars.navigation.width() - vars.navigation.parent().outerWidth(),
					nextItemIndex = nextItemID.replace(vars.prefix + 'item', '');
				;
				setTimeout(function(){
					vars.navigation.find('.' + vars.prefix + 'active-bullet').removeClass(vars.prefix + 'active-bullet');
					vars.navigation.find('[data-' + vars.prefix + 'rel=' + vars.next.attr('data-' + vars.prefix + 'item') + ']').addClass(vars.prefix + 'active-bullet');
					
					//animate
					marginLeft = -Math.abs(nextItemIndex * vars.bulletWidth) + (parseInt(settings.maxBullets / 2, 10) * vars.bulletWidth);

					marginLeft = marginLeft >= 0 ? 0 : Math.abs(marginLeft) >= navWidth ?  -navWidth : marginLeft;
					vars.navigation.stop(true, true).animate({marginLeft: marginLeft}, settings.controlsFadeTime, 'linear');
				}, time);
			},

		//get random itemID
			getRandomItem = function (vars) {
				var curID = vars.active.attr('data-' + vars.prefix + 'item');
				var itemCount = vars.items.length;
				var nextID = vars.prefix + 'item' + parseInt((Math.random() * itemCount), 10);
				var nextKey = nextID.replace(vars.prefix + 'item', '');
				if (vars.playedCounter >= itemCount) {
					vars.playedCounter = 0;
					vars.playedArray = [];
				}
				if (curID == nextID || vars.playedArray[nextKey] === true) {
					return getRandomItem(vars);
				} else {
					vars.playedArray[nextKey] = true;
					vars.playedCounter++;
					return nextID;
				}
			},

		//get random item
			getRandom = function (array) {
				return array[parseInt((Math.random() * array.length), 10)];
			},

		//helper function
			empty = function (string) {
				return $.trim(string.toString()) == '';
			}
			
		//stop current transition
			stopTransition = function($slider, settings, type, $active, $next){
				var vars = $slider.data('rhinoslider:vars'), i = 1, resetQuantity = 0;
				vars.active = $active.stop(true, true);
				vars.next = $next.stop(true, true);
				$slider.data('rhinoslider:vars', vars);
				$.each($.rhinoslider.resets, function () {
					resetQuantity++;
				});
				$.each(resets, function (key, resetFunction) {
					resetFunction($slider, settings);
					if(i === resetQuantity){
						vars.container.removeClass('inProgress');
						transition($slider, settings, type);
					}
					i++;
				});
			}
		;

		this.pause = this.stop = function () {
			pause();
		};
		this.play = this.start = function () {
			play();
		};
		this.toggle = function () {
			toggle();
		};
		this.prev = function ($next) {
			transition($slider, settings, 'prev', $next);
		};
		this.next = function ($next) {
			transition($slider, settings, 'next', $next);
		};
		this.debug = function () {
			console.log('Rhinoslider v' + vars.version);
			console.log('Using jQuery v' + $().jquery);
			console.log('Settings:');
			console.log(settings);
			console.log(vars.items.length + ' items');
			console.log('Current active item: ' + vars.container.find('.' + vars.prefix + 'active').attr('data-' + vars.prefix + 'item'));
			console.log('For further help, contact us at http://rhinoslider.com/contact');
			return vars.version;
		};
		this.uninit = this.kill = this.destroy = this.remove = function () {
			var vars = $(element).data('rhinoslider:vars');
			pause();
			$newSlider = $($(element).data('rhinoslider:original'));
			vars.container.before($newSlider);
			$.each(['vars', 'settings', 'id', 'original'], function (i, value) {
				$(element).data('rhinoslider:' + value, null);
			});
			vars.container.remove();
			return $newSlider;
		};
		this.reset = this.refresh = this.reload = function (opts) {
			var settings, $newSlider;
			settings = $.extend({}, $.fn.rhinoslider.defaults, $(element).data('rhinoslider:settings'), opts);
			$newSlider = this.uninit();
			$newSlider.rhinoslider(settings);
		};
		this.consoleLog = function(msg){
			consoleLog(msg);
		}

		init($slider, settings, vars);
	};

	var rhinosliderID = 0;
	$.rhinoslider = $.fn.rhinoslider = function (opts) {
		return this.each(function (i, element) {
			var $element = $(element);
			if ($element.data('rhinoslider')) {
				return $element.data('rhinoslider');
			}
			$element.data({
				'rhinoslider:id':       rhinosliderID++,
				'rhinoslider:original': element.outerHTML
			});
			var rhinoslider = new rhinoSlider(this, opts);
			$element.data('rhinoslider', rhinoslider);
		});
	};

	var externalCallers = ['next', 'prev', 'play', 'pause', 'debug', 'uninit', 'kill', 'destroy', 'remove', 'reset', 'refresh', 'reload', 'stop', 'start', 'consoleLog'];
	$.each(externalCallers, function (i, functionName) {
		$.rhinoslider[functionName] = function (selector, variable) {
			$(selector).data('rhinoslider')[functionName](variable);
		};
	});

	$.rhinoslider.defaults = {
		//which effect to blend content
		effect:                 'slide',
		//easing for animations of the slides
		easing:                 'swing',
		//linear or shuffled order for items
		randomOrder:            false,
		//show/hide prev/next-controls
		controlsPrevNext:       false,
		//show/hide play/pause-controls
		controlsPlayPause:      false,
		//pause on mouse-over
		pauseOnHover:           false,
		//pause when controls are used
		pauseOnControlUsage:    true,
		//if true, transitions will be stopped, when clicking next/prev
		forceTransition:        false,
		//if the active content should be animated too - depending on effect slide
		animateActive:          true,
		//start slideshow automatically on init
		autoPlay:               true,
		//begin from start if end has reached
		cycled:                 true,
		//sets if actions should be logged
		consoleLog:             false,
		//width to calculate aspecRatio
		width:                  null,
		//width to calculate aspecRatio
		height:                 null,
		//features that should be used: null triggers all
		features:               'none',
		//time, the content is visible before next content will be blend in - depends on autoPlay
		showTime:               3000,
		//time, the effect will last
		effectTime:             1000,
		//duration for fading controls
		controlFadeTime:        650,
		//duration for fading captions
		captionsFadeTime:       250,
		//opacity for captions
		captionsOpacity:        0.7,
		//source, where the default caption text is from: auto (title has prio over alt), alt or title
		captionSource:          'auto',
		//opacity for progressbar
		progressbarOpacity:     0.7,
		//delay for parts in "chewyBars" effect
		partDelay:              100,
		//item which is used as initial element
		slideToStart:           0,
		//time, progressbar fades out
		progressbarFadeTime:    300,
		//maximum of bullets visible at a time
		maxBullets:             5,
		//width, the animation for moving the content needs, can be comma-seperated string (x,y) or int if both are the same
		shiftValue:             '150',
		//amount of parts per line for shuffle effect
		parts:                  '5,3',
		//show image-title: hover, always, never
		showCaptions:           'never',
		//show navigation: hover, always, never
		showBullets:            'never',
		//change bullets before or after the animation
		changeBullets:          'after',
		//type of bullet content
		bulletType:             'number',
		//show controls: hover, always, never
		showControls:           'never',
		//the direction, the prev-button triggers - depending on effect slide
		slidePrevDirection:     'toLeft',
		//the direction, the next-button triggers - depending on effect slide
		slideNextDirection:     'toRight',
		//direction, where the progressbar  goes
		progressbarDirection:   'toRight',
		//check if controlsKeyboard is global or on slider only
		globalControlsKeyboard: false,
		//text for the prev-button
		prevText:               'prev',
		//text for the next-button
		nextText:               'next',
		//text for the play-button
		playText:               'play',
		//text for the pause-button
		pauseText:              'pause',
		//action done when swipeGesture "up" is triggered: prev, next
		swipeUp:                'prev',
		//action done when swipeGesture "right" is triggered: prev, next
		swipeRight:             'next',
		//action done when swipeGesture "down" is triggered: prev, next
		swipeDown:              'next',
		//action done when swipeGesture "left" is triggered: prev, next
		swipeLeft:              'prev',
		//style which will be transfered to the containerelement
		styles:                 'position,top,right,bottom,left,margin-top,margin-right,margin-bottom,margin-left,width,height,min-width,min-height,max-width,max-height,float',
		//if bulletType is image or imageHover, this is the source if no image is found
		noImage:                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAAyCAMAAACgee/qAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkI4QzQ3QjM0QTcxODExRTFBQTdBOEU1NzA0NjNGNDkyIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkI4QzQ3QjM1QTcxODExRTFBQTdBOEU1NzA0NjNGNDkyIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QjhDNDdCMzJBNzE4MTFFMUFBN0E4RTU3MDQ2M0Y0OTIiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QjhDNDdCMzNBNzE4MTFFMUFBN0E4RTU3MDQ2M0Y0OTIiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz57VK4hAAAAMFBMVEWgoKBpaWnJycmFhYV3d3fx8fGSkpKtra3W1tbk5OS7u7tOTk5BQUFcXFwzMzP///+xgpaDAAABwklEQVR42uyW4XLDIAiAUVDRdPP933aCmqS9XHerTXvrmR9GiOETJBDIb7pggid4gid4gv81mMOJe7tn1X6z3MytHk8He3JH4PM9Bus7mBGIm16UPiFCDohJraAH5jZJMrEIGB8HZ0gVHI3LzjRLojAl3uGrvC0roCSD/bJtcrHClfXucXAuMOHo7qPfgWWyVMmRxsE2rUxUw34AHGnj9NNeFW2waiTYNoECvhi5YACcA6jHErWIx2CH3VG88ngguWSkRXNL6HwMVhQvZfDljFnOOJUou7vZ9TvY6UkmY8g2PXUm9cGTwSSPwRDKNnIgs34FryqZ9z+jk8DRZfDvaBKMFD64Le59C3ykPQEMfP0u2D9ahCdF69ngSIDyPwB9rS0KF2po9zIk8Bj6qlCalBsBS4NxiPXblHpiUTdTPbySpXABVItyZxoBe1Z6bUxSr7VgpQ28ydBrKLSKBmkAbNZfHXLaIlQRb8Bd7lq7aG8aAfvYPM4hSB5XX3Yeb7KerwQFWrcaSq4olrD2gpXhzAbe5KXsK/hq0Sdt5CNZzVRCVlO6FgbtOht4k1NZ6btF6VbuA0vmBE/wBE/wBL/m+hFgAMzATBHD/2PjAAAAAElFTkSuQmCC',
		//callbacks
		//the function, which is started bofore anything is done by this script
		callBeforeInit:         function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started when the slider is ready (only once)
		callBackInit:           function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started before the blending-effect
		callBeforeNext:         function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started before the blending-effect
		callBeforePrev:         function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started after the blending-effect
		callBackNext:           function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started after the blending-effect
		callBackPrev:           function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started if the autoplay intervall starts
		callBackPlay:           function ($slider, settings, vars) {
			return false;
		},
		//the function, which is started if the autoplay intervall ends
		callBackPause:          function ($slider, settings, vars) {
			return false;
		}
	};

	$.rhinoslider.effects = {
		none:      function ($slider, params) {
			var vars = $slider.data('rhinoslider:vars');
			var settings = params.settings;
			//set next on top of the others and hide it
			vars.next.css({
				zIndex:  2,
				display: 'block'
			});
			vars.active.hide(0, function () {
				//run resets
				$.each($.rhinoslider.resets, function (key, resetFunction) {
					resetFunction($slider, settings);
				});
			});
		},
		//options: easing, animateActive
		fade:      function ($slider, params) {
			var vars = $slider.data('rhinoslider:vars');
			var settings = params.settings;
			if (settings.animateActive) {
				vars.active.animate({
					opacity: 0
				}, settings.effectTime);
			}
			//set next on top of the others and hide it
			vars.next.css({
				zIndex: 2
			})
				//then fade it in - fade with animate-> fade didnt do it...
				.animate({
					opacity: 1
				}, settings.effectTime, settings.easing, function () {
					//and reset the rest
					//run resets
					$.each($.rhinoslider.resets, function (key, resetFunction) {
						resetFunction($slider, settings);
					});
				});
		},
		//options: direction, animateActive, easing
		slide:     function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				direction = params.direction,
				values = [],
				activeCSS,
				nextCSS
				;
			values.width = vars.container.width();
			values.height = vars.container.height();
			//if showtime is 0, content is sliding permanently so linear is the way to go
			values.easing = settings.showTime === 0 ? 'linear' : settings.easing;
			values.nextEasing = settings.showTime === 0 ? 'linear' : settings.easing;
			$slider.css('overflow', 'hidden');

			//check, in which direction the content will be moved
			switch (direction) {
				case 'toTop':
					activeCSS = {top: -values.height, left: 0};
					nextCSS = {top: values.height, left: 0};
					break;
				case 'toBottom':
					activeCSS = {top: values.height, left: 0};
					nextCSS = {top: -values.height, left: 0};
					break;
				case 'toRight':
					activeCSS = {top: 0, left: values.width};
					nextCSS = {top: 0, left: -values.width};
					break;
				case 'toLeft':
					activeCSS = {top: 0, left: -values.width};
					nextCSS = {top: 0, left: values.width};
					break;
			}
			activeCSS.opacity = 1;

			//put the "next"-element on top of the others and show/hide it, depending on the effect
			vars.next.css({
				zIndex:  2,
				opacity: 1
			});

			//if animateActive is false, the active-element will not move
			if (settings.animateActive) {
				vars.active.css({
					top:  0,
					left: 0
				}).animate(activeCSS, settings.effectTime, values.easing);
			}
			vars.next
				//position "next"-element depending on the direction
				.css(nextCSS).animate({
					top:     0,
					left:    0,
					opacity: 1
				}, settings.effectTime, values.nextEasing, function () {
					//reset element-positions
					//run resets
					$.each($.rhinoslider.resets, function (key, resetFunction) {
						resetFunction($slider, settings);
					});
				});
		},
		//options: direction, animateActive, shiftValue
		kick:      function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				direction = params.direction,
				valuesActive, valuesNext,
				animateNext = {
					top:     0,
					left:    0,
					opacity: 1
				},
				delay = settings.effectTime / 2;

			//check, in which direction the content will be moved
			switch (direction) {
				case 'toTop':
					valuesActive = {top: -settings.shiftValue.y, left: 0};
					valuesNext = {top: settings.shiftValue.y, left: 0};
					break;
				case 'toBottom':
					valuesActive = {top: settings.shiftValue.y, left: 0};
					valuesNext = {top: -settings.shiftValue.y, left: 0};
					break;
				case 'toRight':
					valuesActive = {top: 0, left: settings.shiftValue.x};
					valuesNext = {top: 0, left: -settings.shiftValue.x};
					break;
				case 'toLeft':
					valuesActive = {top: 0, left: -settings.shiftValue.x};
					valuesNext = {top: 0, left: settings.shiftValue.x};
					break;
			}
			valuesActive.opacity = 0;

			//put the "next"-element on top of the others and show/hide it, depending on the effect
			vars.next.css({zIndex: 2, opacity: 0});

			vars.active.css({top: 0, left: 0});
			if (settings.animateActive) {
				//timeout is for kick, so it seems as if the "next"-element kicks the active-element away
				setTimeout(function () {
					vars.active.animate(valuesActive, delay, 'out'); //easing is variable because kick seems more "realistic" if it's not too linear
				}, delay);
			}

			vars.next
				//position "next"-element depending on the direction
				.css(valuesNext).animate(animateNext, settings.effectTime, 'kick', function () {
					//run resets
					$.each($.rhinoslider.resets, function (key, resetFunction) {
						resetFunction($slider, settings);
					});
				});
		},
		//options: direction, animateActive, easing, shiftValue
		transfer:  function ($slider, params) {
			var
				settings = params.settings,
				direction = params.direction,
				vars = $slider.data('rhinoslider:vars'),
				values = [],
				css = {
					container: {},
					active:    {},
					next:      {}
				}
				;
			values.width = $slider.width();
			values.height = $slider.height();
			css.container = {
				width:    values.width,
				height:   values.height,
				position: 'absolute',
				top:      '50%',
				left:     '50%',
				margin:   '-' + parseInt(values.height * 0.5, 10) + 'px 0 0 -' + parseInt(values.width * 0.5, 10) + 'px'
			};

			//set values for effect
			switch (direction) {
				case 'toTop':
					css.active = {top: -settings.shiftValue.y, left: values.width / 2};
					css.next = {top: values.height + settings.shiftValue.y, left: values.width / 2};
					break;
				case 'toBottom':
					css.active = {top: values.height + settings.shiftValue.y, left: values.width / 2};
					css.next = {top: -settings.shiftValue.y, left: values.width / 2};
					break;
				case 'toRight':
					css.active = {top: values.height / 2, left: values.width + settings.shiftValue.x};
					css.next = {top: values.height / 2, left: -settings.shiftValue.x};
					break;
				case 'toLeft':
					css.active = {top: values.height / 2, left: -settings.shiftValue.x};
					css.next = {top: values.height / 2, left: values.width + settings.shiftValue.x};
					break;
			}
			css.active.width = css.next.width = 0;
			css.active.height = css.next.height = 0;
			css.active.opacity = css.next.opacity = 0;
			css.next.zIndex = 2;

			vars.next.children().wrapAll('<div data-' + vars.prefix + 'id="' + vars.prefix + 'nextContainer" class="' + vars.prefix + 'tmpContainer"></div>');
			vars.active.children().wrapAll('<div data-' + vars.prefix + 'id="' + vars.prefix + 'activeContainer" class="' + vars.prefix + 'tmpContainer"></div>');
			var
				$nextContainer = vars.next.find('[data-' + vars.prefix + 'id=' + vars.prefix + 'nextContainer]'),
				$activeContainer = vars.active.find('[data-' + vars.prefix + 'id=' + vars.prefix + 'activeContainer]'),
				$tmpContainer = vars.container.find('.' + vars.prefix + 'tmpContainer');

			$activeContainer.css(css.container);
			$nextContainer.css(css.container);

			if (settings.animateActive) {
				vars.active.css({
					width:  '100%',
					height: '100%',
					top:    0,
					left:   0
				}).animate(css.active, settings.effectTime);
			}

			vars.next.css(css.next).animate({
				width:   '100%',
				height:  '100%',
				top:     0,
				left:    0,
				opacity: 1
			}, settings.effectTime, settings.easing, function () {
				$tmpContainer.children().unwrap();
				//run resets
				$.each($.rhinoslider.resets, function (key, resetFunction) {
					resetFunction($slider, settings);
				});
			});

		},
		//options: animateActive, easing, shiftValue, parts
		shuffle:   function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				values = [], // @todo check if is unsused
				preShuffle = function ($slider, settings, $li) {
					var vars = $slider.data('rhinoslider:vars');
					$li.html('<div class="' + vars.prefix + 'partContainer">' + $li.html() + '</div>');
					var part = $li.html();
					var width = $slider.width();
					var height = $slider.height();
					for (i = 1; i < (settings.parts.x * settings.parts.y); i++) {
						$li.html($li.html() + part);
					}
					var $parts = $li.children('.' + vars.prefix + 'partContainer');
					var partValues = [];
					partValues.width = $li.width() / settings.parts.x;
					partValues.height = $li.height() / settings.parts.y;
					$parts.each(function (i, element) {
						var $element = $(element);
						partValues.top = ((i - (i % settings.parts.x)) / settings.parts.x) * partValues.height;
						partValues.left = (i % settings.parts.x) * partValues.width;
						partValues.marginTop = -partValues.top;
						partValues.marginLeft = -partValues.left;
						$element.css({
							top:      partValues.top,
							left:     partValues.left,
							width:    partValues.width,
							height:   partValues.height,
							position: 'absolute',
							overflow: 'hidden'
						}).html('<div class="' + vars.prefix + 'part">' + $element.html() + '</div>');
						$element.children('.' + vars.prefix + 'part').css({
							marginTop:  partValues.marginTop,
							marginLeft: partValues.marginLeft,
							width:      width,
							height:     height,
							background: $li.css('background-image') + ' ' + $li.parent().css('background-color')
						});
					});
					return $parts;
				},
			//calc amount of parts
				calcParts = function (parts, c) {
					if (parts.x * parts.y > 36) {
						if (c) {
							if (parts.x > 1) {
								parts.x--;
							} else {
								parts.y--;
							}
							c = false;
						} else {
							if (parts.y > 1) {
								parts.y--;
							} else {
								parts.x--;
							}
							c = true;
						}
						return calcParts(parts, c);
					}
					return parts;
				},
			//effect "shuffle"
				shuffle = function ($slider, settings) {
					var vars = $slider.data('rhinoslider:vars');
					settings.parts.x = settings.parts.x < 1 ? 1 : settings.parts.x;
					settings.parts.y = settings.parts.y < 1 ? 1 : settings.parts.y;
					settings.parts = calcParts(settings.parts, true);
					var
						activeContent = vars.active.html(),
						nextContent = vars.next.html(),
						width = $slider.width(),
						height = $slider.height(),
						$nextParts = preShuffle($slider, settings, vars.next),
						$activeParts, activeBackgroundImage = vars.active.css('background-image'),
						activeBackgroundColor = vars.active.css('background-color'),
						nextBackgroundImage = vars.next.css('background-image'),
						nextBackgroundColor = vars.next.css('background-color');

					if (settings.animateActive) {
						$activeParts = preShuffle($slider, settings, vars.active);
					}

					vars.active.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1
					});
					vars.next.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1,
						zIndex:          2
					});
					var partValues = [];
					partValues.width = vars.next.width() / settings.parts.x;
					partValues.height = vars.next.height() / settings.parts.y;
					if (settings.animateActive) {
						$activeParts.each(function (i, element) {
							$element = $(element);
							var newLeft, newTop;
							newLeft = (Math.random() * (settings.shiftValue.x * 2) - settings.shiftValue.x);
							newTop = (Math.random() * (settings.shiftValue.y * 2) - settings.shiftValue.y);
							$element.animate({
								opacity: 0,
								top:     '+=' + newTop,
								left:    '+=' + newLeft
							}, settings.effectTime, settings.easing);
						});
					}
					$nextParts.each(function (i, element) {
						$element = $(element);
						partValues.top = ((i - (i % settings.parts.x)) / settings.parts.x) * partValues.height;
						partValues.left = (i % settings.parts.x) * partValues.width;
						var newLeft, newTop;
						newLeft = partValues.left + (Math.random() * (settings.shiftValue.x * 2) - settings.shiftValue.x);
						newTop = partValues.top + (Math.random() * (settings.shiftValue.y * 2) - settings.shiftValue.y);

						$element.css({
							top:     newTop,
							left:    newLeft,
							opacity: 0
						}).animate({
								top:     partValues.top,
								left:    partValues.left,
								opacity: 1
							}, settings.effectTime, settings.easing, function () {
								if (i == $nextParts.length - 1) {
									if (settings.animateActive) {
										vars.active.html(activeContent);
									}
									vars.next.html(nextContent);
									vars.active.css({
										backgroundImage: activeBackgroundImage,
										backgroundColor: activeBackgroundColor,
										opacity:         0
									});
									vars.next.css({
										backgroundImage: nextBackgroundImage,
										backgroundColor: nextBackgroundColor,
										opacity:         1
									});
									//run resets
									$.each($.rhinoslider.resets, function (key, resetFunction) {
										resetFunction($slider, settings);
									});
								}
							});
					});
				}

			shuffle($slider, settings);
		},
		//options: animateActive, easing, shiftValue, parts
		explode:   function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				values = [],
				preShuffle = function ($slider, settings, $item) {
					var vars = $slider.data('rhinoslider:vars');
					$item.html('<div class="' + vars.prefix + 'partContainer">' + $item.html() + '</div>');
					var part = $item.html();
					var width = $slider.width();
					var height = $slider.height();
					for (i = 1; i < (settings.parts.x * settings.parts.y); i++) {
						$item.html($item.html() + part);
					}
					var $parts = $item.children('.' + vars.prefix + 'partContainer');
					var partValues = [];
					partValues.width = $item.width() / settings.parts.x;
					partValues.height = $item.height() / settings.parts.y;
					$parts.each(function (i, element) {
						var $element = $(element);
						partValues.top = ((i - (i % settings.parts.x)) / settings.parts.x) * partValues.height;
						partValues.left = (i % settings.parts.x) * partValues.width;
						partValues.marginTop = -partValues.top;
						partValues.marginLeft = -partValues.left;
						$element.css({
							top:      partValues.top,
							left:     partValues.left,
							width:    partValues.width,
							height:   partValues.height,
							position: 'absolute',
							overflow: 'hidden'
						}).html('<div class="' + vars.prefix + 'part">' + $element.html() + '</div>');
						$element.children('.' + vars.prefix + 'part').css({
							marginTop:  partValues.marginTop,
							marginLeft: partValues.marginLeft,
							width:      width,
							height:     height,
							background: $item.css('background-image') + ' ' + $item.parent().css('background-color')
						});
					});
					return $parts;
				},
			//calc amount of parts
				calcParts = function (parts, c) {
					if (parts.x * parts.y > 36) {
						if (c) {
							if (parts.x > 1) {
								parts.x--;
							} else {
								parts.y--;
							}
							c = false;
						} else {
							if (parts.y > 1) {
								parts.y--;
							} else {
								parts.x--;
							}
							c = true;
						}
						return calcParts(parts, c);
					}
					return parts;
				},
			//effect "shuffle"
				explode = function ($slider, settings) {
					var vars = $slider.data('rhinoslider:vars');
					settings.parts.x = settings.parts.x < 1 ? 1 : settings.parts.x;
					settings.parts.y = settings.parts.y < 1 ? 1 : settings.parts.y;
					settings.parts = calcParts(settings.parts, true);
					settings.shiftValue.x = Math.abs(settings.shiftValue.x);
					settings.shiftValue.y = Math.abs(settings.shiftValue.y);
					var
						activeContent = vars.active.html(),
						nextContent = vars.next.html(),
						width = $slider.width(),
						height = $slider.height(),
						$nextParts = preShuffle($slider, settings, vars.next),
						$activeParts, activeBackgroundImage = vars.active.css('background-image'),
						activeBackgroundColor = vars.active.css('background-color'),
						nextBackgroundImage = vars.next.css('background-image'),
						nextBackgroundColor = vars.next.css('background-color');

					if (settings.animateActive) {
						$activeParts = preShuffle($slider, settings, vars.active);
					}

					vars.active.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1
					});
					vars.next.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1,
						zIndex:          2
					});
					var partValues = [];
					partValues.width = vars.next.width() / settings.parts.x;
					partValues.height = vars.next.height() / settings.parts.y;
					if (settings.animateActive) {
						$activeParts.each(function (i, element) {
							$element = $(element);
							var newLeft, newTop;
							var position = [];
							position.top = $element.position().top;
							position.bottom = $element.parent().height() - $element.position().top - $element.height();
							position.left = $element.position().left;
							position.right = $element.parent().width() - $element.position().left - $element.width();

							var rndX = parseInt(Math.random() * settings.shiftValue.x, 10);
							var rndY = parseInt(Math.random() * settings.shiftValue.y, 10);
							newLeft = position.right <= position.left ? (position.right == position.left ? rndX / 2 : rndX) : -rndX;
							newTop = position.bottom <= position.top ? (position.top == (position.bottom - 1) ? rndY / 2 : rndY) : -rndY;
							$element.animate({
								top:     '+=' + newTop,
								left:    '+=' + newLeft,
								opacity: 0
							}, settings.effectTime, settings.easing);
						});
					}
					$nextParts.each(function (i, element) {
						var $element = $(element);
						partValues.top = ((i - (i % settings.parts.x)) / settings.parts.x) * partValues.height;
						partValues.left = (i % settings.parts.x) * partValues.width;
						var newLeft, newTop, position = [];

						position.top = $element.position().top;
						position.bottom = $element.parent().height() - $element.position().top - $element.height();
						position.left = $element.position().left;
						position.right = $element.parent().width() - $element.position().left - $element.width();

						var rndX = parseInt(Math.random() * settings.shiftValue.x, 10);
						var rndY = parseInt(Math.random() * settings.shiftValue.y, 10);
						newLeft = position.right <= position.left ? (position.right == position.left ? rndX / 2 : rndX) : -rndX;
						newTop = position.bottom <= position.top ? (position.top == (position.bottom - 1) ? rndY / 2 : rndY) : -rndY;
						newLeft = partValues.left + newLeft;
						newTop = partValues.top + newTop;

						$element.css({
							top:     newTop,
							left:    newLeft,
							opacity: 0
						}).animate({
								top:     partValues.top,
								left:    partValues.left,
								opacity: 1
							}, settings.effectTime, settings.easing, function () {
								if (i == $nextParts.length - 1) {
									if (settings.animateActive) {
										vars.active.html(activeContent);
									}
									vars.next.html(nextContent);
									vars.active.css({
										backgroundImage: activeBackgroundImage,
										backgroundColor: activeBackgroundColor,
										opacity:         0
									});
									vars.next.css({
										backgroundImage: nextBackgroundImage,
										backgroundColor: nextBackgroundColor,
										opacity:         1
									});
									//run resets
									$.each($.rhinoslider.resets, function (key, resetFunction) {
										resetFunction($slider, settings);
									});
								}
							});
					});
				};

			explode($slider, settings);
		},
		//options: direction, animateActive, easing
		turnOver:  function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				direction = params.direction,
				values = [];
			values.width = vars.container.width();
			values.height = vars.container.height();

			//check, in which direction the content will be moved
			switch (direction) {
				case 'toTop':
					values.top = -values.height;
					values.left = 0;
					break;
				case 'toBottom':
					values.top = values.height;
					values.left = 0;
					break;
				case 'toRight':
					values.top = 0;
					values.left = values.width;
					break;
				case 'toLeft':
					values.top = 0;
					values.left = -values.width;
					break;
			}
			//secure that out and in animation don't play simultaneously
			values.timeOut = settings.animateActive ? settings.effectTime : 0;
			values.effectTime = settings.animateActive ? settings.effectTime / 2 : settings.effectTime;

			//put the "next"-element on top of the others and show/hide it, depending on the effect
			vars.next.css({
				zIndex:  2,
				opacity: 1
			});

			//position "next"-element depending on the direction
			vars.next.css({
				top:  values.top,
				left: values.left
			});
			//if animateActive is false, the active-element will not move
			if (settings.animateActive) {
				vars.active.css({
					top:  0,
					left: 0
				}).animate({
						top:     values.top,
						left:    values.left,
						opacity: 1
					}, values.effectTime, settings.easing);
			}

			setTimeout(function () {
				vars.next.animate({
					top:     0,
					left:    0,
					opacity: 1
				}, values.effectTime, settings.easing, function () {
					vars.active.css('opacity', 0);
					//reset element-positions
					//run resets
					$.each($.rhinoslider.resets, function (key, resetFunction) {
						resetFunction($slider, settings);
					});
				});
			}, values.timeOut);
		},
		//options: direction, animateActive, easing, shiftValue, parts, partDelay
		//animationtime for each part is effectTime - (2 * ((settings.parts - 1) * partDelay))
		chewyBars: function ($slider, params) {
			var
				vars = $slider.data('rhinoslider:vars'),
				settings = params.settings,
				direction = params.direction,
				values = [],
				preSlide = function ($slider, settings, $item) {
					var vars = $slider.data('rhinoslider:vars'), parts = settings.parts.x < 1 ? 1 : settings.parts.x;
					parts = settings.parts.x < 1 ? 1 : settings.parts.x;
					$item.html('<div class="' + vars.prefix + 'partContainer">' + $item.html() + '</div>');
					var
						part = $item.html(),
						width = $slider.width(),
						height = $slider.height();
					for (i = 1; i < parts; i++) {
						$item.html($item.html() + part);
					}
					var
						$parts = $item.children('.' + vars.prefix + 'partContainer'),
						partValues = [];
					switch (direction) {
						case 'toLeft':
							partValues.width = $item.width() / parts;
							partValues.height = height;
							break;
						case 'toTop':
							partValues.width = width;
							partValues.height = $item.height() / parts;
							break;
					}

					$parts.each(function (i, element) {
						var $element = $(element),
							liWidth = $item.width(),
							liHeight = $item.height();
						partValues.left = 'auto';
						partValues.marginLeft = 'auto';
						partValues.top = 'auto';
						partValues.marginTop = 'auto';
						partValues.right = 'auto';
						partValues.bottom = 'auto';

						switch (direction) {
							case 'toLeft':
								partValues.width = liWidth / parts;
								partValues.height = height;
								partValues.left = (i % parts) * partValues.width;
								partValues.marginLeft = -partValues.left;
								partValues.top = 0;
								partValues.marginTop = 0;
								break;
							case 'toRight':
								partValues.width = liWidth / parts;
								partValues.height = height;
								partValues.right = (i % parts) * partValues.width;
								partValues.marginLeft = -(liWidth - partValues.right - partValues.width);
								partValues.top = 0;
								partValues.marginTop = 0;
								break;
							case 'toTop':
								partValues.width = width;
								partValues.height = liHeight / parts;
								partValues.left = 0;
								partValues.marginLeft = 0;
								partValues.top = (i % parts) * partValues.height;
								partValues.marginTop = -partValues.top;
								break;
							case 'toBottom':
								partValues.width = width;
								partValues.height = liHeight / parts;
								partValues.left = 0;
								partValues.marginLeft = 0;
								partValues.bottom = (i % parts) * partValues.height;
								partValues.marginTop = -(liHeight - partValues.bottom - partValues.height);
								break;
						}
						$element.css({
							top:      partValues.top,
							left:     partValues.left,
							bottom:   partValues.bottom,
							right:    partValues.right,
							width:    partValues.width,
							height:   partValues.height,
							position: 'absolute',
							overflow: 'hidden'
						}).html('<div class="' + vars.prefix + 'part">' + $element.html() + '</div>');
						$element.children('.' + vars.prefix + 'part').css({
							marginLeft: partValues.marginLeft,
							marginTop:  partValues.marginTop,
							width:      width,
							height:     height,
							background: $item.css('background-image') + ' ' + $item.parent().css('background-color')
						});
					});
					return $parts;
				},
			//effect "slideBars"
				slideBars = function ($slider, settings) {
					parts = settings.parts.x < 1 ? 1 : settings.parts.x;
					var vars = $slider.data('rhinoslider:vars');
					var
						partDuration, partDelay = settings.partDelay,
						minPartDuration = 300,
						activeContent = vars.active.html(),
						nextContent = vars.next.html(),
						width = $slider.width(),
						height = $slider.height(),
						$activeParts, $nextParts = preSlide($slider, settings, vars.next),
						activeBackgroundImage = vars.active.css('background-image'),
						activeBackgroundColor = vars.active.css('background-color'),
						nextBackgroundImage = vars.next.css('background-image'),
						nextBackgroundColor = vars.next.css('background-color'),
						delay = 0
						;

					if (settings.animateActive) {
						$activeParts = preSlide($slider, settings, vars.active);
					}

					partDuration = settings.effectTime - (2 * ((parts - 1) * partDelay));
					console.log('partDuration', partDuration);
					if(partDuration < minPartDuration){
						settings.effectTime = Math.abs(partDuration) + settings.effectTime + minPartDuration;
						partDuration = settings.effectTime - (2 * ((parts - 1) * partDelay));
					}
					

					vars.active.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1
					});
					vars.next.css({
						backgroundImage: 'none',
						backgroundColor: 'none',
						opacity:         1,
						zIndex:          2
					});
					var
						values = [],
						aniMap = {opacity: 0},
						cssMapNext = {opacity: 0}
						;

					switch (direction) {
						case 'toTop':
							aniMap.left = -settings.shiftValue.x;
							aniMap.top = -settings.shiftValue.y;
							cssMapNext.left = settings.shiftValue.x;
							cssMapNext.top = height + settings.shiftValue.y;
							values.width = width;
							values.height = vars.next.height() / parts;
							break;
						case 'toBottom':
							values.width = width;
							values.height = vars.next.height() / parts;
							aniMap.left = -settings.shiftValue.x;
							aniMap.bottom = -settings.shiftValue.y;
							cssMapNext.left = settings.shiftValue.x;
							cssMapNext.bottom = height + settings.shiftValue.y;
							break;
						case 'toRight':
							values.width = vars.next.width() / parts;
							values.height = height;
							aniMap.top = -settings.shiftValue.y;
							aniMap.right = -settings.shiftValue.x;
							cssMapNext.top = settings.shiftValue.y;
							cssMapNext.right = width + settings.shiftValue.x;
							break;
						case 'toLeft':
							values.width = vars.next.width() / parts;
							values.height = height;
							aniMap.top = -settings.shiftValue.y;
							aniMap.left = -settings.shiftValue.x;
							cssMapNext.top = settings.shiftValue.y;
							cssMapNext.left = width + settings.shiftValue.x;
							break;
					}
					if (settings.animateActive) {
						$activeParts.each(function (i, element) {
							var $element = $(element);
							setTimeout(function () {
								$element.animate(aniMap, partDuration, settings.easing);
							}, partDelay * i);
						});
						delay = parts * partDelay;
					}

					$nextParts.each(function (i, element) {
						var $element = $(element),
							newValues = [],
							aniMap = {
								opacity: 1
							};
						switch (direction) {
							case 'toTop':
								aniMap.left = 0;
								aniMap.top = values.height * i;
								break;
							case 'toBottom':
								aniMap.left = 0;
								aniMap.bottom = values.height * i;
								break;
							case 'toRight':
								aniMap.top = 0;
								aniMap.right = values.width * i;
								break;
							case 'toLeft':
								aniMap.top = 0;
								aniMap.left = values.width * i;
								break;
						}
						$element.css(cssMapNext);

						setTimeout(function () {
							setTimeout(function () {
								$element.animate(aniMap, partDuration, settings.easing, function () {
									if (i == $nextParts.length - 1) {
										if (settings.animateActive) {
											vars.active.html(activeContent);
										}
										vars.next.html(nextContent);
										vars.active.css({
											backgroundImage: activeBackgroundImage,
											backgroundColor: activeBackgroundColor,
											opacity:         0
										});
										vars.next.css({
											backgroundImage: nextBackgroundImage,
											backgroundColor: nextBackgroundColor,
											opacity:         1
										});
										//run resets
										$.each($.rhinoslider.resets, function (key, resetFunction) {
											resetFunction($slider, settings);
										});
									}
								});
							}, i * partDelay)
						}, delay);
					});
				}
				;

			slideBars($slider, settings);
		}
	};

	$.rhinoslider.preparations = {
		none:      function ($slider, settings, vars) {
		},
		fade:      function ($slider, settings, vars) {
		},
		slide:     function ($slider, settings, vars) {
			vars.items.css('overflow', 'hidden');
			$slider.css('overflow', 'hidden');
		},
		kick:      function ($slider, settings, vars) {
			vars.items.css('overflow', 'hidden');
			$slider.css('overflow', 'visible');
		},
		transfer:  function ($slider, settings, vars) {
			vars.items.css('overflow', 'hidden');
			$slider.css('overflow', 'visible');
		},
		shuffle:   function ($slider, settings, vars) {
			vars.items.css('overflow', 'visible');
			$slider.css('overflow', 'visible');
		},
		explode:   function ($slider, settings, vars) {
			vars.items.css('overflow', 'visible');
			$slider.css('overflow', 'visible');
		},
		turnOver:  function ($slider, settings, vars) {
			vars.items.css('overflow', 'hidden');
			$slider.css('overflow', 'hidden');
		},
		chewyBars: function ($slider, settings, vars) {
			vars.items.css('overflow', 'visible');
			$slider.css('overflow', 'visible');
		}
	};

	$.rhinoslider.features = {
		controlsKeyboard:   function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			//catch keyup event and trigger functions if the right key is pressed
			vars.container.addClass(vars.prefix + 'controls-keyboard');
			var
				mousePos,
				offset = vars.container.offset(),
				horizontal,
				vertical
				;
			if (!settings.globalControlsKeyboard) {
				mousePos = {top: 0, left: 0};
				$(window).mousemove(function (e) {
					mousePos.top = e.pageY;
					mousePos.left = e.pageX;
				});
			}
			$(document).keyup(function (e) {
				if (!settings.globalControlsKeyboard) {
					horizontal = offset.left <= mousePos.left && offset.left + vars.container.outerWidth() >= mousePos.left ? true : false;
					vertical = offset.top <= mousePos.top && offset.top + vars.container.outerHeight() >= mousePos.top ? true : false;
					if (!horizontal || !vertical) {
						return false;
					}
				}
				switch (e.keyCode) {
					case 37:
						$slider.data('rhinoslider').pause();
						$slider.data('rhinoslider').prev();
						break;
					case 39:
						$slider.data('rhinoslider').pause();
						$slider.data('rhinoslider').next();
						break;
					case 80:
						//self-explaining
						if (vars.isPlaying === false) {
							$slider.data('rhinoslider').play();
						} else {
							$slider.data('rhinoslider').pause();
						}
						break;
				}
			});
		},
		controlsMousewheel: function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			//catch mousewheel event and trigger prev or next
			vars.container.addClass(vars.prefix + 'controls-mousewheel');
			if (!$.isFunction($.fn.mousewheel) && console) {
				console.log('$.fn.mousewheel is not a function. Please check that you have the mousewheel-plugin installed properly.');
			} else {
				$slider.mousewheel(function (e, delta) {
					e.preventDefault();
					if (vars.container.hasClass('inProgress')) {
						return false;
					}
					var dir = delta > 0 ? 'up' : 'down';
					if (dir === 'up') {
						$slider.data('rhinoslider').pause();
						$slider.data('rhinoslider').prev();
					} else {
						$slider.data('rhinoslider').pause();
						$slider.data('rhinoslider').next();
					}
				});
			}
		},
		controlsTouch:      function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			var
				startCoords = [],
				actions = {
					next:  function () {
						$slider.data('rhinoslider').next();
					},
					prev:  function () {
						$slider.data('rhinoslider').prev();
					},
					play:  function () {
						$slider.data('rhinoslider').play();
					},
					pause: function () {
						$slider.data('rhinoslider').pause();
					}
				},
				isMoving = false,
				start = function (e) {
					e.preventDefault();
					if (vars.container.hasClass('inProgress')) {
						return false;
					}
					isMoving = true;
					startCoords.x = e.touches ? e.touches[0].pageX : e.pageX;
					startCoords.y = e.touches ? e.touches[0].pageY : e.pageY;
				},
				move = function (e) {
					e.preventDefault();
					if (vars.container.hasClass('inProgress') || !isMoving) {
						return false;
					}
					var
						dx = e.touches ? e.touches[0].pageX - startCoords.x : e.pageX - startCoords.x,
						dy = e.touches ? e.touches[0].pageY - startCoords.y : e.pageY - startCoords.y,
						minPx = 30,
						swipeDir = ''
						;
					if (Math.abs(dx) > minPx || Math.abs(dy) > minPx) {
						clearTouch();
						swipeDir = Math.abs(dx) > minPx ? (dx > 0 ? settings.swipeRight : settings.swipeLeft) : (dy > 0 ? settings.swipeDown : settings.swipeUp);
						actions[swipeDir]();
					}
				},
				clearTouch = function () {
					isMoving = false;
					startCoords = [];
					$slider.data('rhinoslider').pause();
				}
			;
		
			$slider.get(0).addEventListener('touchstart', start, false);		
			$slider.get(0).addEventListener('touchmove', move, false);
			//if links are in content, this disables them
			/*$slider.get(0).addEventListener('mousedown', start, false);		
			$slider.get(0).addEventListener('mousemove', move, false);*/
		},
		resize:             function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			var
				resizeTimeout,
				resizeFunction = function () {
					var
						width = vars.container.width(),
						height = vars.container.height()
						;
					if (vars.aspectRatio >= 1) {
						vars.container.height(width / vars.aspectRatio);
					} else {
						vars.container.width(height * vars.aspectRatio);
					}
					if (settings.bulletType == 'image') {
						vars.navigation.trigger('setSize');
					}
				}
				;
			$(window).resize(function () {
				clearTimeout(resizeTimeout);
				resizeTimeout = setTimeout(resizeFunction, 20);
			});
			resizeFunction();
		},
		progressbar:        function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			var
				resetCSS,
				animateCSS,
				$pBar,
				dir = settings.progressbarDirection,
				id = vars.container.attr('data-' + vars.prefix + 'id')
				;
			vars.container.append('<div class="' + vars.prefix + 'progressbar-container"><div class="' + vars.prefix + 'progressbar"></div></div>');
			$pBar = vars.container.find('.' + vars.prefix + 'progressbar');
			resetCSS = (dir == 'toTop' || dir == 'toBottom') ? {width: $pBar.width(), height: 0} : {width: 0, height: $pBar.height()};
			resetCSS.opacity = settings.progressbarOpacity;
			resetCSS.display = 'block';

			vars.container
				.on('start', '.' + vars.prefix + 'progressbar', function (e, duration) {
					animateCSS = (dir == 'toTop' || dir == 'toBottom') ? {height: $slider.height()} : {width: $slider.width()};
					$pBar.stop(true, true).css(resetCSS).animate(animateCSS, (duration - settings.progressbarFadeTime), 'linear', function () {
						$pBar.stop(true, true).fadeOut(settings.progressbarFadeTime, function () {
							$pBar.css(resetCSS);
						});
					});
				})
				.on('stop', '.' + vars.prefix + 'progressbar', function (e) {
					$pBar.stop(true, false).fadeOut(settings.progressbarFadeTime, function () {
						$pBar.css(resetCSS);
					});
				})
			;
		},
		hash:               function ($slider, settings) {
			var
				vars = $slider.data('rhinoslider:vars'),
				hash = location.hash.replace('#', ''),
				$active,
				index
			;
			//prevent feature to run again at the end of init()
			if(vars.hash){
				return true;
			}
			
			if(hash.indexOf('/') > -1){
				hash = hash.split('/');
				hash = hash[hash.length - 1];
			}
			
			if($.trim(hash) != '' && vars.container.find('#' + hash).length > 0){
				$active = vars.container.find('#' + hash).parents('.' + vars.prefix + 'item');
			}else{
				index = vars.items.length > parseInt(hash, 10) ? hash : settings.slideToStart;
				vars.items.each(function (key, element) {
					if (key == index) {
						$active = $(element);
					}
				});
			}
			
			$active.addClass(vars.prefix + 'active');
			return true;
		}
	};

	$.rhinoslider.resets = {
		activeElement: function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			if(!vars){return false;}
			
			//set the active-element on the same z-index as the rest and reset css
			vars.container.find('.' + vars.prefix + 'active').stop(true, true).css({
				zIndex:  0,
				top:     0,
				left:    0,
				margin:  0,
				opacity: 0
			})
			//and remove its active class
			.removeClass(vars.prefix + 'active');
		},
		nextElement:   function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			if(!vars){return false;}
			//set the active-element on the same z-index as the rest and reset css
			vars.container.find('.' + vars.prefix + 'next-item')
				//remove the next-class
				.removeClass(vars.prefix + 'next-item')
				//add the active-class
				.addClass(vars.prefix + 'active')
				.stop(true, true)
				//and put  it above the others
				.css({
					zIndex:  1,
					top:     0,
					left:    0,
					margin:  0,
					opacity: 1
				});
		},
		cycled:        function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			if(!vars){return false;}
			//check if cycled is false and start or end is reached
			if (!settings.cycled) {
				if (settings.controlsPrevNext) {
					if (isFirst(vars.next)) {
						vars.buttons.prev.addClass('disabled');
					} else {
						vars.buttons.prev.removeClass('disabled');
					}
					if (isLast(vars.next)) {
						vars.buttons.next.addClass('disabled');
						pause();
					} else {
						vars.buttons.next.removeClass('disabled');
					}
				}
				if (settings.controlsPlayPause) {
					if (isLast(vars.next)) {
						vars.buttons.play.addClass('disabled');
						pause();
					} else {
						vars.buttons.play.removeClass('disabled');
					}
				}
			}
		},
		misc:          function ($slider, settings) {
			var vars = $slider.data('rhinoslider:vars');
			if(!vars){return false;}

			//make the "next"-element the new active-element
			vars.active = vars.next;

			//show captions
			if (settings.showCaptions === 'always') {
				vars.active.find('.' + vars.prefix + 'caption').stop(true, true).fadeTo(settings.captionsFadeTime, settings.captionsOpacity);
			}

			$slider.data('rhinoslider:vars', vars);
		}
	}

})(jQuery, window);