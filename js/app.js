/* global console, map, google, ko, SnazzyInfoWindow, Handlebars $*/
function init_app() {
    "use strict";

    // Load the snazzy info window script once google map is initialized.
    $.getScript("bower_components/snazzy-info-window/dist/snazzy-info-window.js");


    /* Polyfill for supporting startsWith on older browser*/
    /* Source https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith    */
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            return this.substr(position || 0, searchString.length) === searchString;
        };
    }


    /* Defaults */
    var defaultLocalLocation = {lat: -37.810432, lng: 144.96616};
    var map = {};
    // Snazzy Map Style - https://snazzymaps.com/style/8097/wy
    var mapStyle = [{
        "featureType": "landscape",
        "stylers": [{"hue": "#FFBB00"}, {"saturation": 43.400000000000006}, {"lightness": 37.599999999999994}, {"gamma": 1}]
    }, {
        "featureType": "road.highway",
        "stylers": [{"hue": "#FFC200"}, {"saturation": -61.8}, {"lightness": 45.599999999999994}, {"gamma": 1}]
    }, {
        "featureType": "road.arterial",
        "stylers": [{"hue": "#FF0300"}, {"saturation": -100}, {"lightness": 51.19999999999999}, {"gamma": 1}]
    }, {
        "featureType": "road.local",
        "stylers": [{"hue": "#FF0300"}, {"saturation": -100}, {"lightness": 52}, {"gamma": 1}]
    }, {
        "featureType": "water",
        "stylers": [{"hue": "#0078FF"}, {"saturation": -13.200000000000003}, {"lightness": 2.4000000000000057}, {"gamma": 1}]
    }, {
        "featureType": "poi",
        "stylers": [{"hue": "#00FF6A"}, {"saturation": -1.0989010989011234}, {"lightness": 11.200000000000017}, {"gamma": 1}]
    }];


    var htm = '<section class="custom-content">\n' +
        '            <h1 class="custom-header">\n' +
        '                {{title}}\n' +
        '            </h1>\n' +
        '            <div class="custom-body">\n' +
        '                <div class="col-md-12">\n' +
        '                    {{#if has_error}}\n' +
        '                    <p class="has-error text-danger">{{error_msg}}</p>\n' +
        '                    {{else}}\n' +
        '                    <p>{{dotdotdot extract}}</p>\n' +
        '                    <p>\n' +
        '                        <a href="http:///en.wikipedia.org/?curid={{link}}" target="_blank">Read More:\n' +
        '                            Wikipedia</a>\n' +
        '                    </p>\n' +
        '                    {{/if}}\n' +
        '                </div>\n' +
        '            </div>\n' +
        '        </section>';

    var template = Handlebars.compile(htm);

    Handlebars.registerHelper('dotdotdot', function (str) {
        if (str.length > 1000) {
            return str.substring(0, 1000) + '...';
        }
        return str;
    });


    /* method to center map based on the location*/
    var centerMap = function (location) {
        map.setCenter(location);
        google.maps.event.trigger(map, 'resize');
    };

    /* Method to toggle bounce for a marker */
    var toggleBounce = function (marker) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
        }
    };

    /* Method to disable animations on a marker */
    var disableBounce = function (marker) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        }
    };

    /* Gets Content from Wikipedia */
    var getContent = function (info_url, callback) {

        $.ajax({
            url: info_url,
            dataType: 'json',
            type: 'GET',
            headers: {
                'Api-User-Agent': 'Example/1.0'
            }
        }).done(function (data) {
            var pages = data.query.pages;
            var content = {};
            for (var key in pages) {
                if (pages.hasOwnProperty(key)) {
                    content = pages[key];
                    break;
                }
            }
            if (!content) {
                content = {
                    error: 'Error while getting extract'
                };
            }

            callback(content);
        }).fail(function () {
            var content = {
                error: 'Error while getting extract from wikipedia'
            };
            callback(content);
        });

    };


    /* Creates a marker and infowindow */
    var createMarker = function (id, name, location, info_url, callback) {
        var marker = new google.maps.Marker({
            position: location,
            map: map,
            animation: google.maps.Animation.DROP
        });


        getContent(info_url, function (content) {
            // Add a Snazzy Info Window to the marker
            var tmpl = {};
            if (content.error) {
                tmpl = template({
                    title: name,
                    link: "",
                    extract: "",
                    error_msg: "Error while getting information from wikipedia.",
                    has_error: true
                });
            } else {
                tmpl = template({
                    title: content.title,
                    link: content.pageid,
                    extract: content.extract,
                    has_error: false
                });
            }

            var info = new SnazzyInfoWindow({
                marker: marker,

                edgeOffset: {
                    top: 50,
                    right: 60,
                    bottom: 50
                },
                border: false,
                content: tmpl
            });


        });

        callback(marker);
    };


    /* custom binding handler for maps  */
    ko.bindingHandlers.mapPanel = {
        init: function (element) {
            map = new google.maps.Map(element, {
                zoom: 13,
                styles: mapStyle
            });
            centerMap(defaultLocalLocation);
        }
    };


    /* Place Model */
    var Place = function (id, name, location, type, info_url) {
        this.id = id;
        this.name = ko.observable(name);
        this.location = ko.observable(location);
        this.type = ko.observable(type);
        this.info_url = info_url;
    };


    /* View Model for the app */
    var ViewModel = function (places) {
        var self = this;
        this.places = ko.observableArray(places.map(function (place) {
            return new Place(place.id, place.name, place.location, place.type, place.info_url);
        }));

        //Initializing filter with '#'
        this.places.filter = ko.observable('#');
        this.filteredPlaces = ko.computed(function () {
            if (!self.places.filter()) {
                return self.places();
            } else {
                return ko.utils.arrayFilter(self.places(), function (place) {
                    if (place.name()) {
                        return place.name().toLowerCase().startsWith(self.places.filter().toLowerCase());
                    } else {
                        return false;
                    }
                });
            }
        }).extend({trackArrayChanges: true});


        // Look for changes in the filtered places list and create/hide/show markers based on that.
        this.filteredPlaces.subscribe(function (changes) {
            changes.map(function (changeObj) {
                if (changeObj.status === "added") {
                    if (changeObj.value.marker) {
                        changeObj.value.marker.setMap(map);
                    } else {
                        createMarker(changeObj.value.id,
                            changeObj.value.name(),
                            changeObj.value.location(),
                            changeObj.value.info_url,
                            function (marker) {
                                changeObj.value.marker = marker;
                            });
                    }
                } else if (changeObj.status === "deleted") {
                    changeObj.value.marker.setMap(null);
                }
            });
        }, null, "arrayChange");

        this.selectPlace = function (place) {

            //'selected' currently holds the previously selected place. Disable bounce for that.
            if (self.selected && self.selected.marker && self.selected.name() !== place.name()) {
                disableBounce(self.selected.marker);
            }
            toggleBounce(place.marker);
            self.selected = place;
        };
    };


    $.getJSON('city-data.json', function (data) {
        var places = data.places;
        var viewModel = new ViewModel(places);
        ko.applyBindings(viewModel);
        // forcing arrayChange on computed observable 'filteredPlaces'.
        viewModel.places.filter('');
    });

}

/* global alert */
function mapError() {
    "use strict";
    alert("Error while loading google maps. Please see the console for details.");
}
