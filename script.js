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

    // 2. Initialize Viewer
    const viewer = new Cesium.Viewer("cesiumContainer", {
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

        // --- Camera Animation for Shibuya Station ---
        const longitude = 139.701; // Shibuya Station longitude
        const latitude = 35.658;  // Shibuya Station latitude
        const height = 300;      // Height above the station
        const pitch = Cesium.Math.toRadians(-30.0);
        let heading = Cesium.Math.toRadians(0.0);

        const center = Cesium.Cartesian3.fromDegrees(longitude, latitude);

        // Initial flight to the location
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height + 500), // Start a bit further out
            orientation: {
                heading: heading,
                pitch: pitch,
                roll: 0.0
            },
            duration: 4
        });

        // Set up the rotation animation
        viewer.clock.onTick.addEventListener(function(clock) {
            heading += 0.002; // Rotation speed
            viewer.camera.lookAt(center, new Cesium.HeadingPitchRange(heading, pitch, 1500.0)); // 1500m range from center
        });

    }).catch(error => {
        console.error(`Error loading tileset: ${error}`);
    });

    // 6. Adjust scene settings
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
});
