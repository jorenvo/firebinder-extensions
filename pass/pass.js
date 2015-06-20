/* Copyright (C) 2015 Joren Van Onder */

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
    let getCurrentPwSafeDomain = function () {
	const wwwPrefix = "www.";
	let baseDomain = gBrowser.contentWindow.location.hostname;

	if (baseDomain.startsWith(wwwPrefix)) {
	    baseDomain = baseDomain.slice(wwwPrefix.length);
	}

	return baseDomain;
    };

    let copyCurrentPwSafeDomainInteractive = firebinder.KeyboardShortcut(["C-c", "C-P"], function () {
	let domain = getCurrentPwSafeDomain();

	firebinder.utils.putOnClipboard(domain);
	firebinder.display.inStatusPanel("Put " + domain + " on clipboard.");
    });
    firebinder.keyboardShortcutMap.add(copyCurrentPwSafeDomainInteractive);

    let pwSafeOnCurrentDomainInteractive = firebinder.KeyboardShortcut(["C-c", "C-p"], function () {
        let usernameInput = document.commandDispatcher.focusedElement;

        let pwsafePasswordPrompt = firebinder.Interactive("pwsafePasswordPrompt", "pwsafe pwd:", null, function (pwd) {
            const Cc = Components.classes;
	    const PROGRAM_PATH = "/usr/bin/bash";
	    const pwSafeWebsitePrefix = "website.";

            let pwSafeError = false;
	    let domain = pwSafeWebsitePrefix + getCurrentPwSafeDomain();

	    // create an nsIFile for the executable
	    let file = Cc["@mozilla.org/file/local;1"]
		    .createInstance(Components.interfaces.nsIFile);
	    file.initWithPath(PROGRAM_PATH);

	    // create an nsIProcess
	    let process = Cc["@mozilla.org/process/util;1"]
		    .createInstance(Components.interfaces.nsIProcess);
	    process.init(file);

	    let processObserver = {
	        observe: function (subject, topic, data) {
		    if (topic === "process-finished") {
		        if (subject.exitValue === 0) {
			    firebinder.display.inStatusPanel("Retrieved for " + domain + ".");
		        } else {
			    firebinder.display.inStatusPanel("Failed to retrieve for " + domain + ". (" + subject.exitValue + ")");
                            pwSafeError = true;
		        }
		    } else {
		        console.error("nsIProcess failed");
		    }
	        }
	    };

	    // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIProcess#runAsync()
	    let args = ["-c", "pwsafe -up " + domain + " < <(echo '" + pwd + "')"];
	    process.runAsync(args, args.length, processObserver);

	    usernameInput.focus();
            setTimeout(function () {
                if (! pwSafeError) {
                    goDoCommand("cmd_paste");
                    setTimeout(function () {
                        firebinder.utils.dispatchKeyCode(9, false, false); // press tab
                        setTimeout(function() {
                            goDoCommand("cmd_paste");
                        }, 50);
                    }, 50);
                }
            }, 50);
        });

        firebinder.minibuffer.setInputType("password");
        pwsafePasswordPrompt.execute();
        firebinder.minibuffer.setInputType("");
    });
    firebinder.keyboardShortcutMap.add(pwSafeOnCurrentDomainInteractive);
})();
