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

    // --- View Mode Toggle ---
    const viewModeToggle = document.getElementById('view-mode-toggle');
    viewModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        document.body.classList.toggle('map-view-active');

        // Update button text based on current state and language
        const currentLang = document.documentElement.lang || 'en';
        const isMapView = document.body.classList.contains('map-view-active');
        const newKey = isMapView ? 'navUIView' : 'nav3DView';
        
        viewModeToggle.dataset.i18nKey = newKey;
        if (translations[currentLang] && translations[currentLang][newKey]) {
            viewModeToggle.textContent = translations[currentLang][newKey];
        }
    });

    // --- CesiumJS Integration ---

    // 1. Set Cesium ion token from config.js
    if (typeof CESIUM_ION_TOKEN !== 'undefined') {
        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
    } else {
        console.error('Cesium Ion Token not found. Please create config.js or ensure the deployment action is configured correctly.');
        return; // Stop execution if token is not found
    }

    // 2. Initialize Viewer
    const viewer = new Cesium.Viewer("cesiumContainer", {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: true,  // Enable standard info box
        sceneModePicker: false,
        selectionIndicator: true,  // Enable selection indicator
        timeline: false,
        navigationHelpButton: false,
    });

    // 3. Load PLATEAU-Terrain
    viewer.scene.setTerrain(
      new Cesium.Terrain(
        Cesium.CesiumTerrainProvider.fromIonAssetId(2488101),
      ),
    );

    // 4. Load PLATEAU-Ortho
    const imageProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://api.plateauview.mlit.go.jp/tiles/plateau-ortho-2023/{z}/{x}/{y}.png',
      maximumLevel: 19
    });
    viewer.scene.imageryLayers.addImageryProvider(imageProvider);

    // 5. Load Shibuya building models and animate camera
    const shibuyaTilesetUrl = 'https://assets.cms.plateau.reearth.io/assets/2a/090b53-0af1-4dac-9d77-67eddc26bf7a/13113_shibuya-ku_pref_2023_citygml_2_op_bldg_3dtiles_13113_shibuya-ku_lod2/tileset.json';
    Cesium.Cesium3DTileset.fromUrl(shibuyaTilesetUrl)
    .then((tileset) => {
        viewer.scene.primitives.add(tileset);

        // Tileset loaded - camera is already positioned at Shibuya
        console.log('Shibuya tileset loaded successfully');

    }).catch(error => {
        console.error(`Error loading tileset: ${error}`);
    });

    // 6. Adjust scene settings
    viewer.scene.backgroundColor = Cesium.Color.BLACK;

    // 6.1. Initial camera position to Shibuya (before tileset loads)
    const longitude = 139.701; // Shibuya Station longitude
    const latitude = 35.658;  // Shibuya Station latitude
    const height = 1500;     // Initial height
    const pitch = Cesium.Math.toRadians(-30.0);
    let heading = Cesium.Math.toRadians(0.0);
    
    const center = Cesium.Cartesian3.fromDegrees(longitude, latitude);
    
    // Set initial camera position immediately
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
            heading: heading,
            pitch: pitch,
            roll: 0.0
        }
    });

    // Global rotation control (available everywhere)
    let isRotating = true;
    viewer.clock.onTick.addEventListener(function(clock) {
        if (isRotating) {
            heading += 0.002; // Rotation speed
            viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, 1500.0)); // 1500m range from center
        }
    });

    // --- Rotation Toggle (available everywhere) ---
    const rotationToggle = document.getElementById('rotation-toggle');
    rotationToggle.addEventListener('click', (e) => {
        e.preventDefault();
        isRotating = !isRotating;

        // Update button text based on current state and language
        const currentLang = document.documentElement.lang || 'en';
        const newKey = isRotating ? 'navRotationToggle' : 'navRotationStart';
        
        rotationToggle.dataset.i18nKey = newKey;
        if (translations[currentLang] && translations[currentLang][newKey]) {
            rotationToggle.textContent = translations[currentLang][newKey];
        }
    });

    // 7. GIS Status Panel and Click Handler
    const statusLat = document.getElementById('status-lat');
    const statusLon = document.getElementById('status-lon');
    const statusAlt = document.getElementById('status-alt');
    const statusHdg = document.getElementById('status-hdg');
    const statusPitch = document.getElementById('status-pitch');
    const clickedCoordsPanel = document.getElementById('clicked-coords-panel');
    const clickedCoordsValue = document.getElementById('clicked-coords-value');

    let frameCount = 0;
    viewer.clock.onTick.addEventListener(() => {
        // Throttle the update to every 10th frame for performance
        if (frameCount % 10 === 0) {
            const camera = viewer.camera;
            const cameraPos = camera.positionCartographic;
            if (cameraPos) {
                const lat = Cesium.Math.toDegrees(cameraPos.latitude).toFixed(4);
                const lon = Cesium.Math.toDegrees(cameraPos.longitude).toFixed(4);
                const alt = cameraPos.height.toFixed(0);
                const hdg = Cesium.Math.toDegrees(camera.heading).toFixed(0);
                const pitch = Cesium.Math.toDegrees(camera.pitch).toFixed(0);

                statusLat.textContent = lat;
                statusLon.textContent = lon;
                statusAlt.textContent = `${alt} m`;
                statusHdg.textContent = `${hdg}°`;
                statusPitch.textContent = `${pitch}°`;
            }
        }
        frameCount++;
    });

    // 8. Simple Click Handler for Coordinates
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
        if (!document.body.classList.contains('map-view-active')) {
            return; // Only active in map view
        }

        // Update clicked coordinates for ground clicks
        const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(5);
            const latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(5);
            
            clickedCoordsValue.textContent = `Lat: ${latitudeString}, Lon: ${longitudeString}`;
            clickedCoordsPanel.classList.remove('hidden');
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
});