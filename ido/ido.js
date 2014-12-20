/* Copyright (C) 2014 Joren Van Onder */

/* This program is free software; you can redistribute it and/or modify */
/* it under the terms of the GNU General Public License as published by */
/* the Free Software Foundation; either version 3 of the License, or */
/* (at your option) any later version. */

/* This program is distributed in the hope that it will be useful, */
/* but WITHOUT ANY WARRANTY; without even the implied warranty of */
/* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the */
/* GNU General Public License for more details. */

/* You should have received a copy of the GNU General Public License */
/* along with this program; if not, write to the Free Software Foundation, */
/* Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA */

(function () {
    var ido = {
	onInput: function () {
	    firebinder.minibuffer.resetMinibufferExtra();

	    var minibufferExtraBox = document.getElementById("minibuffer-extra");

	    minibufferExtraBox.appendChild(firebinder.utils.createLabel("{", ""));
	    firebinder.minibuffer.possibleCompletions.forEach(function (element, index, array) {
		var label = null;

		if (index === 0) {
		    label = firebinder.utils.createLabel(element.displayValue, "font-weight:bold");
		} else {
		    label = firebinder.utils.createLabel("| " + element.displayValue, "");
		}

		minibufferExtraBox.appendChild(label);
	    });
	    minibufferExtraBox.appendChild(firebinder.utils.createLabel("}", ""));
	},

	onEnter: function () {
	    if (firebinder.minibuffer.possibleCompletions.length >= 1) {
		firebinder.minibuffer.currentInteractive.onComplete(firebinder.minibuffer.possibleCompletions[0]);
		firebinder.minibuffer.reset();
	    }
	},

	onTab: function () {
	    if (firebinder.minibuffer.possibleCompletions.length === 1) {
		firebinder.minibuffer.currentInteractive.onComplete(firebinder.minibuffer.possibleCompletions[0]);
		firebinder.minibuffer.reset();
	    }
	},

	// remove ido hooks. this keeps the minibuffer nice and clean and
	// allows for ido and non-ido minibuffer interactions to take
	// place in the same session.
	onReset: function () {
	    firebinder.hooks.remove("minibuffer.onReset", ido.onReset); // remove self
	    firebinder.hooks.remove("minibuffer.inputCharacterTab", ido.onTab);
	    firebinder.hooks.remove("minibuffer.inputCharacterEnter", ido.onEnter);
	    firebinder.hooks.remove("minibuffer.afterInput", ido.onInput);

	    firebinder.keyboardShortcutMap.removeOverrides();
	},

	init: function () {
	    firebinder.minibuffer.match = function (str, userInput) {
		return str.toLowerCase().contains(userInput.toLowerCase());
	    };

	    firebinder.hooks.add("minibuffer.afterInput", ido.onInput);
	    firebinder.hooks.add("minibuffer.inputCharacterEnter", ido.onEnter);
	    firebinder.hooks.add("minibuffer.inputCharacterTab", ido.onTab);
	    firebinder.hooks.add("minibuffer.onReset", ido.onReset);

	    firebinder.keyboardShortcutMap.addOverride(firebinder.KeyboardShortcut(["C-s"], function () {
		firebinder.minibuffer.possibleCompletions.push(firebinder.minibuffer.possibleCompletions.shift());
		ido.onInput();
	    }));


	    firebinder.keyboardShortcutMap.addOverride(firebinder.KeyboardShortcut(["C-r"], function () {
		firebinder.minibuffer.possibleCompletions.unshift(firebinder.minibuffer.possibleCompletions.pop());
		ido.onInput();
	    }));

	    firebinder.keyboardShortcutMap.addOverride(firebinder.KeyboardShortcut(["C- "], function () {
		firebinder.minibuffer.allCompletions = firebinder.minibuffer.possibleCompletions;
		document.getElementById("minibuffer-input").value = "";

		firebinder.minibuffer.handleInput();
	    }));
	},

	switchBuffer: function () {
	    ido.init();

	    var idoSwitchTabInteractive = firebinder.Interactive("idoSwitchTab", "Tab:",
								 firebinder.utils.getCurrentTabCompletions(true), firebinder.utils.switchTab);
	    idoSwitchTabInteractive.execute();

	    ido.onInput();
	},

	killBuffer: function () {
	    ido.init();

	    var idoKillTabInteractive = firebinder.Interactive("idoKillTab", "Tab:",
							       firebinder.utils.getCurrentTabCompletions(false), firebinder.utils.killTab);
	    idoKillTabInteractive.execute();

	    ido.onInput();
	}
    };

    firebinder.keyboardShortcutMap.add(firebinder.KeyboardShortcut(["C-x", "b"], ido.switchBuffer));
    firebinder.keyboardShortcutMap.add(firebinder.KeyboardShortcut(["C-x", "k"], ido.killBuffer));
})();
