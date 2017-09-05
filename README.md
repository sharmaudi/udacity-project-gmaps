# Udacity Neighborhood Map App

This code base implements the Udacity Neighbourhood Map Project.

## Notes
* Makes use of the MVVM pattern using knockoutjs.
* Uses Google Maps api to render the Map and markers. A valid API key has 
to be provided in order to use the maps api
* Uses Wikipedia api to fetch location information.
* Uses snazzy-info-window for easily styled Info Windows


## Cloning the code base

    # Clone the code repository 
    git clone https://github.com/sharmaudi/udacity-project-gmaps.git
    cd udacity-project-gmaps

## Installing dependencies
    
    # npm install 
    # bower install
    
    
## Configuring the app

Before we can use this application, we will have to provide a valid the google maps api key. The api key has to be embedded in `<script>` tag requesting the google map javascript library in `index.html`

    <script src="https://maps.googleapis.com/maps/api/js?libraries=places&key=API_KEY_GOES_HERE"></script>


## Running the app

Serve the project folder using a http webserver.

### Node JS
    # Install the http-server module globally
    npm install -g http-server
    
    # Serve the application
    cd udacity-project-gmaps
    http-server -p 8000
    
### Python 3
    cd udacity-project-gmaps
    python -m http.server 8000
    
### Python 2
    cd udacity-project-gmaps
    python -m SimpleHTTPServer 8080
    
