(function($){ // Open closure

// Local vars
var Scroller, ajaxurl, stats, type, text, totop;

/**
 * Loads new posts when users scroll near the bottom of the page.
 */
Scroller = function( settings ) {
	var self = this;

	// Initialize our variables
	this.id               = settings.id;
	this.body             = $( document.body );
	this.window           = $( window );
	this.element          = $( '#' + settings.id );
	this.wrapperClass     = settings.wrapper_class;
	this.ready            = true;
	this.disabled         = false;
	this.page             = 1;
	this.order            = settings.order;
	this.throttle         = false;
	this.handle           = '<div id="infinite-handle"><span>' + text.replace( '\\', '' ) + '</span></div>';
	this.google_analytics = settings.google_analytics;
	this.history          = settings.history;

	// Footer settings
	this.footer      = $( '#infinite-footer' );
	this.footer.wrap = settings.footer;

	// We have two type of infinite scroll
	// cases 'scroll' and 'click'

	if ( type == 'scroll' ) {
		// Bind refresh to the scroll event
		// Throttle to check for such case every 300ms

		// On event the case becomes a fact
		this.window.bind( 'scroll.infinity', function() {
			this.throttle = true;
		});

		// Go back top method
		self.gotop();

		setInterval( function() {
			if ( this.throttle ) {
				// Once the case is the case, the action occurs and the fact is no more
				this.throttle = false;
				// Reveal or hide footer
				self.thefooter();
				// Fire the refresh
				self.refresh();
			}
		}, 300 );

		// Ensure that enough posts are loaded to fill the initial viewport, to compensate for short posts and large displays.
		self.ensureFilledViewport();
		this.body.bind( 'post-load', { self: self }, self.checkViewportOnLoad );
	} else if ( type == 'click' ) {
		this.element.append( self.handle );
		this.element.live( 'click.infinity', '#infinite-handle', function() {
			// Handle the handle
			$( '#infinite-handle' ).remove();
			// Fire the refresh
			self.refresh();
		});
	}
};

/**
 * Check whether we should fetch any additional posts.
 *
 * By default, checks whether the bottom of the viewport is within one
 * viewport-height of the bottom of the content.
 */
Scroller.prototype.check = function() {
	var bottom = this.window.scrollTop() + this.window.height(),
		threshold = this.element.offset().top + this.element.outerHeight() - this.window.height();

	return bottom > threshold;
};

/**
 * Renders the results from a successful response.
 */
Scroller.prototype.render = function( response ) {
	this.body.addClass( 'infinity-success' );

	// Check if we can wrap the html
	this.element.append( response.html );

	this.body.trigger( 'post-load' );
	this.ready = true;
};

/**
 * Returns the object used to query for new posts.
 */
Scroller.prototype.query = function() {
	return {
		page:  this.page,
		order: this.order,
		scripts: window.infiniteScroll.settings.scripts,
		styles: window.infiniteScroll.settings.styles
	};
};

/**
 * Scroll back to top.
 */
Scroller.prototype.gotop = function() {
	var blog = $( '#infinity-blog-title' );

	blog.attr( 'title', totop );

	// Scroll to top on blog title
	blog.live( 'click', function( e ) {
		$( 'html, body' ).animate( { scrollTop: 0 }, 'fast' );
		e.preventDefault();
	});
};


/**
 * The infinite footer.
 */
Scroller.prototype.thefooter = function() {
	var self = this;
	var self  = this,
		width;

	// Check if we have an id for the page wrapper
	if ( $.type( this.footer.wrap ) === "string" ) {
		width = $( 'body #' + this.footer.wrap ).outerWidth();

		// Make the footer match the width of the page
		if ( width > 479 )
			this.footer.find( '.container' ).css( 'width', width );
	}

	// Reveal footer
	if ( this.window.scrollTop() >= 350 )
		self.footer.animate( { 'bottom': 0 }, 'fast' );
	else if ( this.window.scrollTop() < 350 )
		self.footer.animate( { 'bottom': '-50px' }, 'fast' );
};


/**
 * Controls the flow of the refresh. Don't mess.
 */
Scroller.prototype.refresh = function() {
	var	self   = this,
		query, jqxhr, load, loader, color;

	// If we're disabled, ready, or don't pass the check, bail.
	if ( this.disabled || ! this.ready || ! this.check() )
		return;

	// Let's get going -- set ready to false to prevent
	// multiple refreshes from occurring at once.
	this.ready = false;

	// Create a loader element to show it's working.
	loader = '<span class="infinite-loader"></span>';
	this.element.append( loader );

	loader = this.element.find( '.infinite-loader' );
	color = loader.css( 'color' );

	try {
		loader.spin( 'medium-left', color );
	} catch ( error ) { }

	// Generate our query vars.
	query = $.extend({
		action: 'infinite_scroll'
	}, this.query() );

	// Fire the ajax request.
	jqxhr = $.get( infiniteScroll.settings.ajaxurl, query );

	// Allow refreshes to occur again if an error is triggered.
	jqxhr.fail( function() {
		loader.hide();
		self.ready = true;
	});

	// Success handler
	jqxhr.done( function( response ) {

			// On success, let's hide the loader circle.
			loader.hide();

			// Check for and parse our response.
			if ( ! response )
				return;

			response = $.parseJSON( response );

			if ( ! response || ! response.type )
				return;

			// If there are no remaining posts...
			if ( response.type == 'empty' ) {
				// Disable the scroller.
				self.disabled = true;
				// Update body classes, allowing the footer to return to static positioning
				self.body.addClass( 'infinity-end' ).removeClass( 'infinity-success' );

			// If we've succeeded...
			} else if ( response.type == 'success' ) {
				// If additional scripts are required by the incoming set of posts, parse them
				if ( response.scripts ) {
					$( response.scripts ).each( function() {
						// Add script handle to list of those already parsed
						window.infiniteScroll.settings.scripts.push( this.handle );

						// Output extra data, if present
						if ( this.extra_data ) {
							var data = document.createElement('script'),
								dataContent = document.createTextNode( "//<![CDATA[ \n" + this.extra_data + "\n//]]>" );

							data.type = 'text/javascript';
							data.appendChild( dataContent );

							document.getElementsByTagName( this.footer ? 'body' : 'head' )[0].appendChild(data);
						}

						// Build script tag and append to DOM in requested location
						var script = document.createElement('script');
						script.type = 'text/javascript';
						script.src = this.src;
						script.id = this.handle;
						document.getElementsByTagName( this.footer ? 'body' : 'head' )[0].appendChild(script);
					} );
				}

				// If additional stylesheets are required by the incoming set of posts, parse them
				if ( response.styles ) {
					// IE requires special handling due to WP's support for conditional comments when styles are registered or enqueued.
					var isIE = ( -1 != navigator.userAgent.search( 'MSIE' ) );
					if ( isIE ) {
						var browserVersion = navigator.userAgent.match(/MSIE\s?(\d+)\.?\d*;/);
						var browserVersion = parseInt( browserVersion[1] );
					}

					$( response.styles ).each( function() {
						// Add stylesheet handle to list of those already parsed
						window.infiniteScroll.settings.styles.push( this.handle );

						// Build link tag
						var style = document.createElement('link');
						style.rel = 'stylesheet';
						style.href = this.src;
						style.id = this.handle + '-css';

						// Destroy link tag if a conditional statement is present and either the browser isn't IE, or the conditional doesn't evaluate true
						if ( this.conditional && ( ! isIE || ! eval( this.conditional.replace( /%ver/g, browserVersion ) ) ) )
							var style = false;

						// Append link tag if necessary
						if ( style )
							document.getElementsByTagName('head')[0].appendChild(style);
					} );
				}

				// Increment the page number
				self.page++;

				if ( stats ) {
					if ( type == 'scroll' ) {
						// Record stats in pagetype[infinite], and bump general views
						new Image().src = document.location.protocol + '//stats.wordpress.com/g.gif?' + stats + '&x_pagetype=infinite&post=0&baba=' + Math.random();
					} else if ( type == 'click' ) {
						// Record stats in pagetype[infinite-click], and bump general views
						new Image().src = document.location.protocol + '//stats.wordpress.com/g.gif?' + stats + '&x_pagetype=infinite-click&post=0&baba=' + Math.random();
					}
				}

				// Render the results
				self.render.apply( self, arguments );

				// With each IS load, update address bar to reflect archive page URL
				var pageSlug = window.location.protocol + '//' + self.history.host + self.history.path.replace( /%d/, self.page );
				history.pushState( null, null, pageSlug );

				// If 'click' type, add back the handle
				if ( type == 'click' )
					self.element.append( self.handle );

				// Fire Google Analytics pageview
				if ( self.google_analytics && 'object' == typeof _gaq )
					_gaq.push(['_trackPageview', self.history.path.replace( /%d/, self.page ) ]);
			}
		});

	return jqxhr;
};

/**
 * Trigger IS to load additional posts if the initial posts don't fill the window.
 * On large displays, or when posts are very short, the viewport may not be filled with posts, so we overcome this by loading additional posts when IS initializes.
 */
Scroller.prototype.ensureFilledViewport = function() {
	var	self = this,
	   	windowHeight = self.window.height(),
	   	postsHeight = self.element.height()
	   	aveSetHeight = 0,
	   	wrapperQty = 0;

	// Account for situations where postsHeight is 0 because child list elements are floated
	if ( postsHeight === 0 ) {
		$( self.element.selector + ' > li' ).each( function() {
			postsHeight += $( this ).height();
		} );

		if ( postsHeight === 0 ) {
			self.body.unbind( 'post-load', self.checkViewportOnLoad );
			return;
		}
	}

	// Calculate average height of a set of posts to prevent more posts than needed from being loaded.
	$( '.' + self.wrapperClass ).each( function() {
		aveSetHeight += $( this ).height();
		wrapperQty++;
	} );

	if ( wrapperQty > 0 )
		aveSetHeight = aveSetHeight / wrapperQty;
	else
		aveSetHeight = 0;

	// Load more posts if space permits, otherwise stop checking for a full viewport
	if ( postsHeight < windowHeight && ( postsHeight + aveSetHeight < windowHeight ) ) {
		self.ready = true;
		self.refresh();
	}
	else {
		self.body.unbind( 'post-load', self.checkViewportOnLoad );
	}
}

/**
 * Event handler for ensureFilledViewport(), tied to the post-load trigger.
 * Necessary to ensure that the variable `this` contains the scroller when used in ensureFilledViewport(). Since this function is tied to an event, `this` becomes the DOM element related the event is tied to.
 */
Scroller.prototype.checkViewportOnLoad = function( ev ) {
	ev.data.self.ensureFilledViewport();
}

/**
 * Ready, set, go!
 */
$( document ).ready( function() {
	// Check for our variables
	if ( ! infiniteScroll )
		return;

	// Set ajaxurl (for brevity)
	ajaxurl = infiniteScroll.settings.ajaxurl;

	// Set stats, used for tracking stats
	stats = infiniteScroll.settings.stats;

	// Define what type of infinity we have, grab text for click-handle
	type  = infiniteScroll.settings.type;
	text  = infiniteScroll.settings.text;
	totop = infiniteScroll.settings.totop;

	// Initialize the scroller (with the ID of the element from the theme)
	infiniteScroll.scroller = new Scroller( infiniteScroll.settings );
});


})(jQuery); // Close closure