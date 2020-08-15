# Retrieve the UUID from ``metadata.json``
UUID = $(shell grep -E '^[ ]*"uuid":' ./metadata.json | sed 's@^[ ]*"uuid":[ ]*"\(.\+\)",[ ]*@\1@')

ifeq ($(strip $(DESTDIR)),)
INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
else
INSTALLBASE = $(DESTDIR)/usr/share/gnome-shell/extensions
endif
INSTALLNAME = $(UUID)

$(info UUID is "$(UUID)")
$(info INSTALLBASE is "$(INSTALLBASE)")

.PHONY: all clean install zip-file

sources = source/**/*.ts

all: depcheck compile

clean:
	rm -rf build

transpile: $(sources)
	rm -rf build
	tsc
	
stylesheet.css:
	sass css/main.scss:build/stylesheet.css

compile: convert metadata.json stylesheet.css
	cp -r metadata.json build/

convert: transpile
	for file in `find build -name *.js`; do \
		bash tools/rewrite_imports.sh "$${file}"; \
	done

depcheck:
	@if ! command -v tsc >/dev/null; then \
		echo \
		echo 'You must install TypeScript >= 3.8 to transpile'; \
		exit 1; \
	fi

enable:
	gnome-extensions enable "osd@alex4401.github.com"

disable:
	gnome-extensions disable "osd@alex4401.github.com"

listen:
	journalctl -o cat -n 0 -f "$$(which gnome-shell)"

install:
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)
	mkdir -p $(INSTALLBASE)/$(INSTALLNAME)
	cp -r build/* $(INSTALLBASE)/$(INSTALLNAME)/

uninstall:
	rm -rf $(INSTALLBASE)/$(INSTALLNAME)

restart-shell:
	if bash -c 'xprop -root &> /dev/null'; then \
		busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Please wait...")'; \
	else \
		gnome-session-quit --logout; \
	fi

zip-file: all
	cd _build && zip -qr "../$(UUID)$(VSTRING).zip" .
