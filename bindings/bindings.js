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
    var bindings = [
	firebinder.KeyboardShortcut(["C-g"], firebinder.commands.keyboardQuit),
	firebinder.KeyboardShortcut(["C-v"], firebinder.commands.pageDown),
	firebinder.KeyboardShortcut(["M-v"], firebinder.commands.pageUp),
	firebinder.KeyboardShortcut(["M-<"], firebinder.commands.scrollTop),
	firebinder.KeyboardShortcut(["M->"], firebinder.commands.scrollBottom),
	firebinder.KeyboardShortcut(["C-x", "h"], firebinder.commands.selectAll),
	firebinder.KeyboardShortcut(["C-p"], firebinder.commands.scrollLineUp),
	firebinder.KeyboardShortcut(["C-n"], firebinder.commands.scrollLineDown),
	firebinder.KeyboardShortcut(["C-b"], firebinder.commands.scrollLeft),
	firebinder.KeyboardShortcut(["C-f"], firebinder.commands.scrollRight),
	firebinder.KeyboardShortcut(["C-d"], firebinder.commands.deleteCharForward),
	firebinder.KeyboardShortcut(["M-d"], firebinder.commands.deleteWordForward),
	firebinder.KeyboardShortcut(["M-b"], firebinder.commands.wordPrevious),
	firebinder.KeyboardShortcut(["M-f"], firebinder.commands.wordNext),
	firebinder.KeyboardShortcut(["M-w"], firebinder.commands.copy),
	firebinder.KeyboardShortcut(["C-w"], firebinder.commands.cut),
	firebinder.KeyboardShortcut(["C-y"], firebinder.commands.yank),
	firebinder.KeyboardShortcut(["M-y"], firebinder.commands.yankPop),
	firebinder.KeyboardShortcut(["'", ",", "."], firebinder.commands.goBack),
	firebinder.KeyboardShortcut([",", ".", "p"], firebinder.commands.goForward),
	firebinder.KeyboardShortcut(["C-s"], firebinder.commands.findForward),
	firebinder.KeyboardShortcut(["C-r"], firebinder.commands.findBackward),
	firebinder.KeyboardShortcut([",", "r"], firebinder.commands.reloadTab),
	firebinder.KeyboardShortcut(["C-a"], firebinder.commands.beginningOfLine),
	firebinder.KeyboardShortcut(["C-e"], firebinder.commands.endOfLine),
	firebinder.KeyboardShortcut(["C-K"], firebinder.commands.undoCloseTab),
	firebinder.KeyboardShortcut(["C-k"], firebinder.commands.killLine),
	firebinder.KeyboardShortcut(["C- "], firebinder.commands.setMark),

	firebinder.KeyboardShortcut(["C-x", "b"], function () {
	    firebinder.commands.switchTabInteractive.execute();
	}),
	firebinder.KeyboardShortcut(["C-x", "k"], function () {
	    firebinder.commands.killTabInteractive.execute();
	})
    ];

    Array.forEach(bindings, function (elem) {
	firebinder.keyboardShortcutMap.add(elem);
    });
})();
