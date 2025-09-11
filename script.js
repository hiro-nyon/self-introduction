document.addEventListener('DOMContentLoaded', () => {
    const langJaBtn = document.getElementById('lang-ja');
    const langEnBtn = document.getElementById('lang-en');

    let translations = {};

    // Load translations from JSON
    fetch('translations.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            translations = data;
            // Set initial language to English
            loadLanguage('en');
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
        });

    // Function to update text content based on selected language
    const loadLanguage = (lang) => {
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.dataset.i18nKey;
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        document.documentElement.lang = lang; // Update the lang attribute of the <html> tag
    };

    // Event listeners for language buttons
    langJaBtn.addEventListener('click', () => loadLanguage('ja'));
    langEnBtn.addEventListener('click', () => loadLanguage('en'));

    // --- CesiumJS Integration ---

    // 1. Set Cesium ion token from config.js
    if (typeof CESIUM_ION_TOKEN !== 'undefined') {
        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    } else {
        console.error('Cesium Ion Token not found. Please create config.js or ensure the deployment action is configured correctly.');
        return; // Stop execution if token is not found
    }

    // 2. Initialize Cesium Viewer
    const viewer = new Cesium.Viewer('cesiumContainer', {
        // Hide unnecessary UI elements
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        // Start with a dark/empty space
        imageryProvider: false
    });

    // 3. Load PLATEAU 3D Tileset (Tokyo)
    const plateauTileset = new Cesium.Cesium3DTileset({
        url: Cesium.IonResource.fromAssetId(96188) // PLATEAU Tokyo 23 Wards
    });
    viewer.scene.primitives.add(plateauTileset);

    // 4. Set Camera to Tokyo Station and Animate
    plateauTileset.readyPromise.then(() => {
        // Coordinates for Tokyo Station
        const longitude = 139.767125;
        const latitude = 35.681236;
        const height = 250; // Height above the station
        const heading = Cesium.Math.toRadians(0.0);
        const pitch = Cesium.Math.toRadians(-25.0);

        const destination = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
        
        // Fly to the location for a smoother transition
        viewer.camera.flyTo({
            destination: destination,
            orientation: {
                heading: heading,
                pitch: pitch,
                roll: 0.0
            },
            duration: 3
        });

        // Rotate the camera
        let currentHeading = heading;
        viewer.clock.onTick.addEventListener(function(clock) {
            const center = Cesium.Cartesian3.fromDegrees(longitude, latitude);
            currentHeading += 0.002; // Rotation speed
            viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(currentHeading, pitch, 2000.0));
        });

    }).catch(error => {
        console.error(`Error loading tileset: ${error}`);
    });

    // Adjust scene settings for better visuals
    viewer.scene.globe.show = false; // Hide the default globe
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.screenSpaceCameraController.enableTilt = false; // Disable tilting the camera with mouse
});
