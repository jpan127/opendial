/**
 * Chrome always focuses the omnibox on chrome_url_overrides.newtab, so
 * autofocus / input.focus() on that first document cannot take the caret.
 * Navigating to another extension page is the supported workaround
 * (https://crbug.com/1085779#c26). After this replace, home.html can focus
 * the search field. The address bar will show chrome-extension://…/home.html.
 */
location.replace(new URL('home.html', location.href).href);
