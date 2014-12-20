/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* This is a port of HoK for Firebinder. It was originally written by
 * Masafumi Oyamada <stillpedant@gmail.com>. */

(function () {
    const hokOptions = {
	"hint_keys" : 'asdfghjkl',

	// description: "When current focused hint is unique, auto fire the link or not",
	"unique_fire" : true,

	// description: "Whether display your inputs to the statusbar or not",
	"statusbar_feedback" : true,

	"actions" : null,

	"selector" : 'a[href], input:not([type="hidden"]), textarea, iframe, area, select, button, embed,' +
	    '*[onclick], *[onmouseover], *[onmousedown], *[onmouseup], *[oncommand], *[role="link"], *[role="button"], *[role="menuitem"], *[role="tab"], *[role="checkbox"]',

	"local_queries" : null,

	"hint_color_link" : 'rgba(180, 255, 81, 0.90)',

	"hint_color_form" : 'rgba(155, 174, 255, 0.90)',

	"hint_color_focused" : 'rgba(255, 0, 51, 1.0)',

	"hint_color_candidates" : 'rgba(255, 81, 116, 0.90)',

	"hide_unmatched_hint" : true,

	"hint_base_style" : {
            "position"       : 'fixed',
            "top"            : '0',
            "left"           : '0',
            "z-index"        : '2147483647',
            "color"          : '#000',
            "font-family"    : 'monospace',
            "font-size"      : '10pt',
            "font-weight"    : 'bold',
            "line-height"    : '10pt',
            "padding"        : '2px',
            "margin"         : '0px',
            "text-transform" : 'uppercase'
	},

	"user_keymap" : null,

	// description: "Make unique hints only (Free from Enter key)"
	"unique_only": true,

	"follow_link_nextpattern": "\\bnext\\b|\\bnewer\\b|\\bmore\\b|→$|>>$|≫$|»$|^>$|^次|進む|^つぎへ|続",

	"follow_link_prevpattern": "\\bback\\b|\\bprev\\b|\\bprevious\\b|\\bolder|^←|^<<|^≪|^«|^<$|戻る|^もどる|^前.*|^<前",

	"follow_link_nextrel_selector": "a[rel='next']",

	"follow_link_prevrel_selctor": "a[rel='prev']",

	"follow_link_candidate_selector": "a[href], input:not([type='hidden']), button"
    };

    // }} ======================================================================= //

    // Misc utils {{ ============================================================ //

    // Most functions are borrowed from liberator. Thanks a lot :)

    function createMouseEvent(aDocument, aType, aOptions) {
	var defaults = {
            type          : aType,
            bubbles       : true,
            cancelable    : true,
            view          : aDocument.defaultView,
            detail        : 1,
            screenX       : 0, screenY : 0,
            clientX       : 0, clientY : 0,
            ctrlKey       : false,
            altKey        : false,
            shiftKey      : false,
            metaKey       : false,
            button        : 0,
            relatedTarget : null
	};

	var event = aDocument.createEvent("MouseEvents");

	for (let prop in aOptions)
	{
            defaults[prop] = aOptions[prop];
	}

	event.initMouseEvent.apply(event, [v for each(v in defaults)]);

	return event;
    }

    const NEW_TAB            = 1;
    const NEW_BACKGROUND_TAB = 2;
    const NEW_WINDOW         = 3;
    const CURRENT_TAB        = 4;

    /**
     * Fakes a click on a link. from hint.js in liberator
     *
     * @param {Node} elem The element to click.
     * @param {number} where Where to open the link.
     */
    function followLink(elem, where) {
	let doc     = elem.ownerDocument;
	let view    = doc.defaultView;
	let offsetX = 1;
	let offsetY = 1;

	if (elem instanceof HTMLFrameElement || elem instanceof HTMLIFrameElement)
	{
            elem.contentWindow.focus();
            return;
	}
	else if (elem instanceof HTMLAreaElement) // for imagemap
	{
            let coords = elem.getAttribute("coords").split(",");
            offsetX = Number(coords[0]) + 1;
            offsetY = Number(coords[1]) + 1;
	}

	let ctrlKey = false, shiftKey = false;

	switch (where) {
	case NEW_TAB:
	case NEW_BACKGROUND_TAB:
            ctrlKey  = true;
            shiftKey = (where != NEW_BACKGROUND_TAB);
            break;
	case NEW_WINDOW:
            shiftKey = true;
            break;
	case CURRENT_TAB:
            break;
	default:
            firebinder.display.inStatusPanel("Invalid where argument for followLink()");
	}

	elem.focus();

	// ============================================================ //

	try
	{
            ["mousedown", "mouseup", "click"].forEach(
		function (event) {
                    elem.dispatchEvent(
			createMouseEvent(doc,
					 event,
					 {
                                             screenX: offsetX, screenY: offsetY,
                                             ctrlKey: ctrlKey, shiftKey: shiftKey, metaKey: ctrlKey
					 }));
		});
	}
	catch (x) {}
    }

    // Follow previous / next
    function followRel(doc, rel, pattern) {
	let target  = doc.querySelector(rel);
	if (target) {
            followLink(target, CURRENT_TAB);
            return;
	}

	let relLinkPattern   = new RegExp(pattern, "i");
	let relLinkCandidates = Array.slice(
            doc.querySelectorAll(hokOptions["follow_link_candidate_selector"])
	);

	for (let [, elem] in Iterator(relLinkCandidates.reverse())) {
            if (relLinkPattern.test(elem.textContent) /*|| regex.test(elem.value) */) {
		followLink(elem, CURRENT_TAB);
		return;
            }
	}
    }

    function openContextMenu(elem) {
	document.popupNode = elem;
	var menu = document.getElementById("contentAreaContextMenu");
	menu.showPopup(elem, -1, -1, "context", "bottomleft", "topleft");
    }

    function openURI(url, where) {
	where = where || CURRENT_TAB;
	// decide where to load the first url
	switch (where) {
	case CURRENT_TAB:
            gBrowser.loadURIWithFlags(url, null, null, null, null);
            break;
	case NEW_BACKGROUND_TAB:
	case NEW_TAB:
            gBrowser.loadOneTab(url, null, null, null, where == NEW_BACKGROUND_TAB);
            break;
	}
    }

    function saveLink(elem, skipPrompt) {
	let doc  = elem.ownerDocument;
	let url  = window.makeURLAbsolute(elem.baseURI, elem.href);
	let text = elem.textContent;

	try {
            window.urlSecurityCheck(url, doc.nodePrincipal);
            saveURL(url, text, null, true, skipPrompt, makeURI(url, doc.characterSet), doc);
	} catch (e) {}
    }

    function viewSource(url, useExternalEditor) {
	url = url || window.content.location.href;

	if (useExternalEditor)
	{
            userscript.editFile(url); // TODO
	}
	else
	{
            const PREFIX = "view-source:";
            if (url.indexOf(PREFIX) == 0)
		url = url.substr(PREFIX.length);
            else
		url = PREFIX + url;

            openURI(url);
	}
    }

    // Yank the href of an element
    function yank(elem) {
	const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
              .getService(Components.interfaces.nsIClipboardHelper);
	gClipboardHelper.copyString(elem.href);
    }

    function recoverFocus() {
	gBrowser.focus();
	content.focus();
    }

    // }} ======================================================================= //

    // HoK object {{ ============================================================ //

    var originalSuspendedStatus;

    var hok = function () {
	var hintKeys            = hokOptions["hint_keys"];
	var hintBaseStyle       = hokOptions["hint_base_style"];
	var hintColorLink       = hokOptions["hint_color_link"];
	var hintColorForm       = hokOptions["hint_color_form"];
	var hintColorFocused    = hokOptions["hint_color_focused"];
	var hintColorCandidates = hokOptions["hint_color_candidates"];
	// var elementColorFocused = hokOptions["element_color_focused"];

	var keyMap = {};
	if (hokOptions["user_keymap"])
            keyMap = hokOptions["user_keymap"];

	keyMap["<delete>"]    = 'Delete';
	keyMap["<backspace>"] = 'Backspace';
	keyMap["C-h"]         = 'Backspace';
	keyMap["RET"]         = 'Enter';
	keyMap["C-m"]         = 'Enter';

	var lastFocusedInfo;

	// misc options {{ ========================================================== //

	var useStatusBarFeedBack = hokOptions["statusbar_feedback"];

	var supressUniqueFire;

	var continuousMode;

	// }} ======================================================================= //

	var currentAction;
	var priorQuery;
	var localQuery;

	// length of the hint keys like 'asdfghjkl'
	var hintKeysLength  = null;

	var hintContainerId = 'ksHintContainer';

	var hintElements = {};
	var hintCount;

	// unique hint
	var hintSpans;

	var inputKey        = '';
	var lastMatchHint   = null;

	// foo-bar-baz -> fooBarBaz
	// -moz-foo-bar-baz -> MozFooBarBaz
	function formatPropertyName(name) {
            if (!~name.indexOf("-"))
		return name;

            let ss = name.split("-");

            return ss.shift().toLowerCase() +
		ss.reduce(function (acc, s) acc + (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s), "");
	}

	// Patches from victor.vde@gmail.com
	function createTextHints(amount) {
            var reverseHints = {};
            var numHints = 0;
            var uniqueOnly = hokOptions["unique_only"];

            function next(hint) {
		var l = hint.length;
		if (l === 0) {
                    return hintKeys.charAt(0);
		}
		var p = hint.substr(0, l - 1);
		var n = hintKeys.indexOf(hint.charAt(l - 1)) + 1;
		if (n == hintKeysLength) {
                    var np = next(p);
                    if (uniqueOnly) {
			delete reverseHints[np];
			numHints--;
                    }
                    return np + hintKeys.charAt(0);
		} else {
                    return p + hintKeys.charAt(n);
		}
            }

            var hint = '';
            while (numHints < amount) {
		hint = next(hint);
		reverseHints[hint] = true;
		numHints++;
            }

            var hints = [];
            for (let [hint] in Iterator(reverseHints)) {
		hints.push(hint);
            }

            // Note: kind of relies on insertion order
            return hints;
	}

	/**
	 * Gets the actual offset of an imagemap area. (from liberator)
	 *
	 * @param {Object} elem  The <area> element.
	 * @param {number} leftpos  The left offset of the image.
	 * @param {number} toppos  The top offset of the image.
	 * @returns [leftpos, toppos]  The updated offsets.
	 */
	function getAreaOffset(elem, leftpos, toppos)
	{
            try
            {
		// Need to add the offset to the area element.
		// Always try to find the top-left point, as per liberator default.
		let shape = elem.getAttribute("shape").toLowerCase();
		let coordstr = elem.getAttribute("coords");
		// Technically it should be only commas, but hey
		coordstr = coordstr.replace(/\s+[;,]\s+/g, ",").replace(/\s+/g, ",");
		let coords = coordstr.split(",").map(Number);

		if ((shape == "rect" || shape == "rectangle") && coords.length == 4)
		{
                    leftpos += coords[0];
                    toppos += coords[1];
		}
		else if (shape == "circle" && coords.length == 3)
		{
                    leftpos += coords[0] - coords[2] / Math.sqrt(2);
                    toppos += coords[1] - coords[2] / Math.sqrt(2);
		}
		else if ((shape == "poly" || shape == "polygon") && coords.length % 2 == 0)
		{
                    let leftbound = Infinity;
                    let topbound = Infinity;
                    var i;

                    // First find the top-left corner of the bounding rectangle (offset from image topleft can be noticably suboptimal)
                    for (i = 0; i < coords.length; i += 2)
                    {
			leftbound = Math.min(coords[i], leftbound);
			topbound = Math.min(coords[i + 1], topbound);
                    }

                    let curtop = null;
                    let curleft = null;
                    let curdist = Infinity;

                    // Then find the closest vertex. (we could generalise to nearest point on an edge, but I doubt there is a need)
                    for (i = 0; i < coords.length; i += 2)
                    {
			let leftoffset = coords[i] - leftbound;
			let topoffset = coords[i + 1] - topbound;
			let dist = Math.sqrt(leftoffset * leftoffset + topoffset * topoffset);
			if (dist < curdist)
			{
                            curdist = dist;
                            curleft = coords[i];
                            curtop = coords[i + 1];
			}
                    }

                    // If we found a satisfactory offset, let's use it.
                    if (curdist < Infinity)
			return [leftpos + curleft, toppos + curtop];
		}
            } catch (e) {} // badly formed document, or shape == "default" in which case we don't move the hint

            return [leftpos, toppos];
	}

	function getBodyOffsets(body, html, win)
	{
            // http://d.hatena.ne.jp/edvakf/20100830/1283199419
            var style = win.getComputedStyle(body, null),
		pos;
            if (style && style.position == 'relative') {
		var rect = body.getBoundingClientRect();
		pos = { x: -rect.left-parseFloat(style.borderLeftWidth), y: -rect.top-parseFloat(style.borderTopWidth) };
            } else {
		rect = html.getBoundingClientRect();
		pos = { x: -rect.left, y: -rect.top };
            }
            return [ pos.x, pos.y ];
	}

	function setHintsText() {
            var textHints = createTextHints(hintCount);

            for (let i = 0; i < hintCount; i++) {
		var span = hintSpans[i];
		var hint = textHints[i];
		span.appendChild(span.ownerDocument.createTextNode(hint));
		hintElements[hint] = span;
            }

            hintSpans = null;
	}

	function getBodyForDocument(doc) {
            return doc ? doc.body || doc.querySelector("body") || doc.documentElement : null;
	}

	function drawHints(win) {
            var isMain = false;
            if (!win) {
		isMain = true;
		hintSpans = [];
		win = window.content;
            }

            var doc = win.document;

            if (!doc)
		return;

            var html = doc.documentElement;
            var body = getBodyForDocument(doc);

            if (!body)
            {
		// process childs only
		Array.forEach(win.frames, drawHints);
		if (isMain)
                    setHintsText();
		return;
            }

            var height = win.innerHeight;
            var width  = win.innerWidth;

            var [scrollX, scrollY] = getBodyOffsets(body, html, win);

            if (hintBaseStyle.position === "fixed") {
		scrollX -= win.scrollX;
		scrollY -= win.scrollY;
            }

            // Arrange hint containers {{ =============================================== //

            var fragment      = doc.createDocumentFragment();
            var hintContainer = doc.createElement('div');
            hintContainer.style.position = 'static';

            fragment.appendChild(hintContainer);
            hintContainer.id = hintContainerId;

            // }} ======================================================================= //

            // Arrange hints seed {{ ==================================================== //

            var hintSpan = doc.createElement('span');

            let (st = hintSpan.style) {
		for (let [prop, value] in Iterator(hintBaseStyle))
                    st[formatPropertyName(prop)] = value;
		st.backgroundColor = hintColorLink;
            };

            // }} ======================================================================= //

            var result, elem;

            result = doc.querySelectorAll(priorQuery || localQuery || hokOptions["selector"]);

            var style, rect, hint, span, top, left, ss;
            var leftpos, toppos;

            for (let i = 0, len = result.length; i < len; ++i) {
		elem = result[i];

		rect = elem.getClientRects()[0];
		if (!rect)
                    continue;

		var r = elem.getBoundingClientRect();
		if (!r || r.top > height || r.bottom < 0 || r.left > width || r.right < 0)
                    continue;

		// ========================================================================== //

		style = win.getComputedStyle(elem, null);
		if (!style || style.visibility !== "visible" || style.display === "none")
                    continue;

		// ========================================================================== //

		span = hintSpan.cloneNode(false);

		// Set hint position {{ ===================================================== //

		leftpos = rect.left > 0 ? rect.left + scrollX : scrollX;
		toppos  = rect.top > 0 ? rect.top + scrollY : scrollY;

		if (elem instanceof HTMLAreaElement)
                    [leftpos, toppos] = getAreaOffset(elem, leftpos, toppos);

		ss = span.style;
		ss.left = leftpos + "px";
		ss.top  = toppos + "px";

		// }} ======================================================================= //

		if (elem.hasAttribute('href') === false)
                    ss.backgroundColor = hintColorForm;

		span.element = elem;
		hintContainer.appendChild(span);
		hintSpans.push(span);

		hintCount++;
            }

            if (doc)
		body.appendChild(fragment);

            Array.forEach(win.frames, drawHints);

            if (isMain)
		setHintsText();
	};

	function getHintColor(elem) {
            return (elem.hasAttribute('href') === true) ?
		hintColorLink : hintColorForm;
	}

	function getAliveLastMatchHint() {
            try {
		if (lastMatchHint && lastMatchHint.style)
                    return lastMatchHint;
            } catch (x) {
		lastMatchHint = null;
            }
            return null;
	}

	function blurHint() {
            if (getAliveLastMatchHint())
            {
		lastMatchHint.style.backgroundColor = getHintColor(lastMatchHint.element);
		lastMatchHint = null;
            }
	}

	function focusHint(aHint) {
            // set hint color
            aHint.style.backgroundColor = hintColorFocused;

            // aHint.element.__ks_saved_background_color__ = aHint.element.style.backgroundColor || true;
            // aHint.element.style.backgroundColor = "#ddff5e";

            // This scrolls up / down the view.
            // aHint.element.focus();
	}

	function recoverOriginalStyle(elem) {
            if (elem.__ks_saved_background_color__)
            {
		if (elem.__ks_saved_background_color__ === true)
		{
                    elem.style.backgroundColor = "";
		}
		else
		{
                    elem.style.backgroundColor = elem.__ks_saved_background_color__;
		}
            }
	}

	function updateHeaderMatchHints() {
            const hideUnmatchedHint = hokOptions["hide_unmatched_hint"];
            let foundCount = 0;

            for (let [hintStr, hintElem] in Iterator(hintElements)) {
		if (hintStr.indexOf(inputKey) === 0) {
                    if (hintStr != inputKey)
			hintElem.style.backgroundColor = hintColorCandidates;
                    foundCount++;
		} else {
                    if (hideUnmatchedHint)
			hintElem.style.display = "none";
                    hintElem.style.backgroundColor = getHintColor(hintElem.element);
		}
            }

            return foundCount;
	}

	function resetHintsColor() {
            for (let [, span] in Iterator(hintElements)) {
		span.style.backgroundColor = getHintColor(span.element);
		span.style.display = "inline";
            }
	}

	function removeHints(win) {
            if (!win)
		win = window.content;

            var doc = win.document;
            var body = getBodyForDocument(doc);

            var hintContainer = doc.getElementById(hintContainerId);
            if (body && hintContainer)
            {
		try {
                    body.removeChild(hintContainer);
		} catch (x) { console.log(x); }
            }

            Array.forEach(win.frames, removeHints);
	}

	function destruction(aForce) {
            inputKey = '';

            if (continuousMode && !aForce)
            {
		// not remove the hints
		lastMatchHint = null;
		resetHintsColor();
            }
            else
            {
		// key.suspended = originalSuspendedStatus;

		try {
                    removeHints();
		} catch (x) {
                    console.log(x);
		}

		document.removeEventListener('keydown', stopEventPropagation, true);
		document.removeEventListener('keypress', onKeyPress, true);
		document.removeEventListener('keyup', stopEventPropagation, true);

		firebinder.keyPressHandler.start();
            }

            firebinder.display.inStatusPanel("");
	}

	function fire(elem) {
            // recoverOriginalStyle(elem);

            try {
		currentAction(elem);
            } catch (x) {
		return x;
            }

            return null;
	}

	function feedBackInputKey() {
            if (useStatusBarFeedBack)
		firebinder.display.inStatusPanel("HoK : [ " + inputKey.split("").join(" ") + " ]");
	}

	function onKeyPress(event) {
	    var keyPress = firebinder.Key();
	    keyPress.convertFromEvent(event);

            preventEvent(event);

            var role = keyPress.key;

	    if (keyPress.key == "g" && keyPress.ctrl) {
		destruction(true);
		return;
	    }

            switch (role) {
            case 'Backspace':
		if (! inputKey)
		{
                    destruction(true);
                    return;
		}

		inputKey = inputKey.slice(0, inputKey.length - 1);

		feedBackInputKey();

		// reset but not exit
		blurHint();
		resetHintsColor();

		if (inputKey.length != 0)
                    updateHeaderMatchHints();
		return;
            case 'Enter':
		if (getAliveLastMatchHint()) {
                    let elem = lastMatchHint.element;
                    destruction();
                    fire(elem);
		} else {
                    destruction();
		}
		return;
            default :
		inputKey += role;
            };

            blurHint();
            feedBackInputKey();

            if (hintElements.hasOwnProperty(inputKey)) {
		lastMatchHint = hintElements[inputKey];
		focusHint(lastMatchHint);
            } else {
		lastMatchHint = null;
            }

            let foundCount = updateHeaderMatchHints();

            // fire if hint is unique
            if (hokOptions["unique_fire"] && !supressUniqueFire) {
		if (foundCount == 1 && getAliveLastMatchHint()) {
                    var targetElem = lastMatchHint.element;
                    destruction();

                    fire(targetElem);
		}
            }
	}

	function stopEventPropagation(event) {
            event.stopPropagation();
	}

	function preventEvent(event) {
            event.preventDefault();
            event.stopPropagation();
	}

	function setLocalQuery() {
            let currentPageURL = content.location.href;
            if (hokOptions["local_queries"] && currentPageURL)
            {
		for (let [, [targetURLPattern, localSelector, toOverride]]
                     in Iterator(hokOptions["local_queries"]))
		{
                    if (currentPageURL.match(targetURLPattern))
                    {
			localQuery = toOverride ? localSelector
                            : hokOptions["selector"] + ", " + localSelector;
			return;
                    }
		}
            }

            localQuery = undefined;
	}

	function init() {
            hintKeysLength = hintKeys.length;
            hintElements   = {};
            hintCount      = 0;

            hintKeys.split('').forEach(
		function (l) {
                    keyMap[l] = l;
		});
	}

	var self = {
            start: function (aAction, aContext) {
		if (!window.content)
                    return;

		supressUniqueFire = aContext.supressUniqueFire;
		continuousMode  = aContext.continuous;

		currentAction = aAction;
		priorQuery    = aContext.query;

		init();
		setLocalQuery();
		drawHints();

		if (hintCount > 1)
		{
                    document.addEventListener('keydown', stopEventPropagation, true);
                    document.addEventListener('keypress', onKeyPress, true);
                    document.addEventListener('keyup', stopEventPropagation, true);

		    firebinder.keyPressHandler.stop();
		}
		else
		{
                    // remove hints, recover keysnail's keyhandler, ...
                    destruction(true);

                    if (hintCount == 1)
                    {
			// only one hint found, immediatly fire
			try
			{
                            // TODO: Is there a good way to do this?
                            for (let [, hintElem] in Iterator(hintElements))
                            {
				if (supressUniqueFire)
                                    hintElem.element.focus();
				else
                                    fire(hintElem.element);

				break;
                            }
			}
			catch (x)
			{
                            console.log(x);
			}
                    }
                    else
                    {
			firebinder.display.inStatusPanel("No hints found");
			recoverFocus();
                    }
		}
            },

            startForeground: function (supressUniqueFire) {
		self.start(function (elem) followLink(elem, CURRENT_TAB),
			   {
                               supressUniqueFire: supressUniqueFire
			   });
            },

            yankForeground: function (supressUniqueFire) {
		self.start(yank,
			   {
                               supressUniqueFire: supressUniqueFire
			   });
            },


            startBackground: function (supressUniqueFire) {
		hok.start(function (elem) followLink(elem, NEW_BACKGROUND_TAB),
			  {
                              supressUniqueFire: supressUniqueFire
			  });
            },

            startContinuous: function () {
		hok.start(function (elem) followLink(elem, NEW_BACKGROUND_TAB),
			  {
                              supressUniqueFire: false,
                              continuous: true
			  });
            }
	};

	return self;
    }();

    // }} ======================================================================= //

    // Actions {{ =============================================================== //

    var query = {
	images : "img",
	frames : "body"
    };

    // ['Key', 'Description', function (elem) { /* process hint elem */ }, supressUniqueFire, continuousMode, 'Query query']
    var actions = [
	[';', "Focus hint", function (elem) elem.focus()],
	['s', "Save hint", function (elem) saveLink(elem, true)],
	['a', "Save hint with prompt", function (elem) saveLink(elem, false)],
	['f', "Focus frame", function (elem) elem.ownerDocument.defaultView.focus(), false, false, query.frames],
	['o', "Follow hint", function (elem) followLink(elem, CURRENT_TAB)],
	['t', "Follow hint in a new tab", function (elem) followLink(elem, NEW_TAB)],
	['b', "Follow hint in a background tab", function (elem) followLink(elem, NEW_BACKGROUND_TAB)],
	['w', "Follow hint in a new window", function (elem) followLink(elem, NEW_WINDOW)],
	['F', "Open multiple hints in tabs", function (elem) followLink(elem, NEW_BACKGROUND_TAB), false, true],
	['v', "View hint source", function (elem) viewSource(elem.href, false)],
	['y', "Yank hint location", yank],
	['c', "Open context menu", function (elem) openContextMenu(elem)],
	['i', "Show image", function (elem) openURI(elem.src), false, false, query.images],
	['I', "Show image in a new tab", function (elem) openURI(elem.src, NEW_TAB), false, false, query.images]
    ];

    function doAction(aStr) {
	for (var i = 0; i < actions.length; ++i)
	{
            if (actions[i][0] === aStr)
            {
		var func = actions[i][2];
		var desc = actions[i][1];

		hok.start(func,
			  {
                              supressUniqueFire : actions[i].length > 3 ? actions[i][3] : false,
                              continuous        : actions[i].length > 4 ? actions[i][4] : false,
                              query             : actions[i].length > 5 ? actions[i][5] : null
			  });
		return;
            }
	}
    }

    // }} ======================================================================= //

    // Bindings
    let firebinderStartHokForeground = firebinder.KeyboardShortcut(["C-h"], function () {
	hok.startForeground();
    });
    firebinder.keyboardShortcutMap.add(firebinderStartHokForeground);

    let firebinderHokExtended = firebinder.KeyboardShortcut(["C-c", "h", "e"], function () {
	var firebinderHokExtendedInteractive = firebinder.Interactive("extendedHok", "action:",
								      function () {
									  let completions = actions.map(function (action) {
									      return firebinder.Completion(action[0]);
									  });

									  return completions;
								      },
								      function (arg) {
									  doAction(arg.displayValue);
								      });

	firebinderHokExtendedInteractive.execute();
    });
    firebinder.keyboardShortcutMap.add(firebinderHokExtended);

    let firebinderStartHokContinuous = firebinder.KeyboardShortcut(["C-c", "h", "c"], function () {
	hok.startContinuous();
    });
    firebinder.keyboardShortcutMap.add(firebinderStartHokContinuous);

    let firebinderStartHokBackground = firebinder.KeyboardShortcut(["C-u", "C-h"], function () {
	hok.startBackground();
    });
    firebinder.keyboardShortcutMap.add(firebinderStartHokBackground);

    let firebinderStartHokYank = firebinder.KeyboardShortcut(["C-c", "h", "y"], function () {
	hok.yankForeground();
    });
    firebinder.keyboardShortcutMap.add(firebinderStartHokYank);
})();
