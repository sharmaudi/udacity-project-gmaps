/* global console, map, google, ko, SnazzyInfoWindow, Handlebars, $ */
function initApp() {
    "use strict";
    // Load snazzy info window script once google map is initialized.
    $.getScript("bower_components/snazzy-info-window/dist/snazzy-info-window.js").done(function () {
        runApp();
    }).fail(function (jqxhr, textStatus, exception) {
        var err = textStatus + ", " + exception;
        console.log(err);
        alert("Error while loading info window script. See console for details");
    });
}

function runApp() {
    "use strict";
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
    var info = {};
    var currentlyAnimatedMarker = null;
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


    /* Info Window Template */
    var html = '<section class="custom-content">\n' +
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

    var template = Handlebars.compile(html);
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
            if (currentlyAnimatedMarker && marker !== currentlyAnimatedMarker) {
                disableBounce(currentlyAnimatedMarker);
            }
            marker.setAnimation(google.maps.Animation.BOUNCE);
            currentlyAnimatedMarker = marker;
        }
    };

    /* Method to disable animations on a marker */
    var disableBounce = function (marker) {
        if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
        }
    };


    /* Method to show info window at the provided location */
    var showInfoWindow = function (location, content) {
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
        info.setPosition(location);
        info.setContent(tmpl);
        info.open();
    };

    /* Get Content from Wikipedia */
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


    /* Creates a new marker. Also registers a listener to show infowindow with the
     relevant content once the marker is clicked. */
    var createMarker = function (id, name, location, info_url, callback) {
        var marker = new google.maps.Marker({
            position: location,
            map: map,
            animation: google.maps.Animation.DROP
        });

        marker.addListener('click', function () {
            toggleBounce(marker);
        });

        getContent(info_url, function (content) {
            marker.addListener('click', function () {
                showInfoWindow(marker.position, content);
            });
            callback(marker, content);
        });

    };


    /* custom binding handler for maps  */
    ko.bindingHandlers.mapPanel = {
        init: function (element) {
            // Initialize google map
            map = new google.maps.Map(element, {
                zoom: 13,
                styles: mapStyle
            });
            centerMap(defaultLocalLocation);

            // Initialize Info window
            info = new SnazzyInfoWindow({
                map: map,
                edgeOffset: {
                    top: 50,
                    right: 60,
                    bottom: 50
                },
                border: false,
                content: ''
            });
        }
    };


    /* Place Model */
    var Place = function (id, name, location, type, info_url) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.type = type;
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
                    if (place.name) {
                        return (place.name.toLowerCase().indexOf(self.places.filter().toLowerCase()) >= 0);
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
                        changeObj.value.marker.setVisible(true);
                    } else {
                        createMarker(changeObj.value.id,
                            changeObj.value.name,
                            changeObj.value.location,
                            changeObj.value.info_url,
                            function (marker, content) {
                                changeObj.value.marker = marker;
                                changeObj.value.details = content;
                            });
                    }
                } else if (changeObj.status === "deleted") {
                    changeObj.value.marker.setVisible(false);
                }
            });
        }, null, "arrayChange");

        this.selectPlace = function (place) {
            toggleBounce(place.marker);
            //Place details should have been set while creating the marker for this place
            // . If not, fetch it again.
            if (!place.details) {
                getContent(place.info_url, function (content) {
                    place.details = content;
                    showInfoWindow(place.location, place.details);
                });
            } else {
                showInfoWindow(place.location, place.details);
            }

        };
    };


    $.getJSON('city-data.json')
        .done(function (data) {
            var places = data.places;
            var viewModel = new ViewModel(places);
            ko.applyBindings(viewModel);
            // forcing arrayChange on computed observable 'filteredPlaces'.
            viewModel.places.filter('');
        }).fail(function (jqxhr, textStatus, error) {
        var err = textStatus + ", " + error;
        alert("Error while getting city data. Please see the console for details.");
        console.log("Request Failed: " + err);
    });

}


/* global alert */
function mapError() {
    "use strict";
    alert("Error while loading google maps. Please see the console for details.");
}
