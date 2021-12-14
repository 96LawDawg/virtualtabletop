// Dom7
var $UI = Dom7;

// Theme
var theme = 'auto';
if (document.location.search.indexOf('theme=') >= 0) {
  theme = document.location.search.split('theme=')[1].split('&')[0];
}

// Init App


var app = new Framework7({
  id: 'io.virtualtabletop.ui',
  el: '#app',
  theme,
  autoDarkTheme: true,
  popup: {
    closeOnEscape: true,
  },
  sheet: {
    closeOnEscape: true,
  },
  popover: {
    closeOnEscape: true,
  },
  actions: {
    closeOnEscape: true,
  },
  vi: {
    placementId: 'pltd4o7ibb9rc653x14',
  },
});

var mainView = app.views.create('.view-main');

$UI('#app').hide();

$UI('#app .hideApp').on('click', function() {
     $UI('#app').hide();
});



