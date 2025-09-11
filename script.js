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

        // Enable feature picking for individual building selection
        tileset.style = new Cesium.Cesium3DTileStyle({
            color: 'color("white")',
            show: true
        });

        // Store tileset reference globally for interaction
        window.shibuyaTileset = tileset;

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

    // 8. Enhanced Click Handler for PLATEAU Buildings and Coordinates
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let selectedFeature = null;

    // Function to generate building info HTML
    function generateBuildingInfoHTML(feature) {
        const currentLang = document.documentElement.lang || 'en';
        const isJapanese = currentLang === 'ja';
        
        // Extract building properties
        const properties = feature.getPropertyIds();
        let buildingId = feature.getProperty('gml:id') || feature.getProperty('fid') || 'Unknown';
        let buildingHeight = feature.getProperty('bldg:measuredHeight') || feature.getProperty('height') || 'Unknown';
        let buildingUsage = feature.getProperty('bldg:usage') || feature.getProperty('usage') || 'Unknown';
        let buildingClass = feature.getProperty('bldg:class') || feature.getProperty('class') || 'Unknown';

        // Generate HTML content
        const title = isJapanese ? '建物情報' : 'Building Information';
        const idLabel = isJapanese ? 'ID' : 'ID';
        const heightLabel = isJapanese ? '高さ' : 'Height';
        const usageLabel = isJapanese ? '用途' : 'Usage';
        const classLabel = isJapanese ? '分類' : 'Class';
        const propertiesLabel = isJapanese ? 'プロパティ' : 'Properties';

        let html = `
            <div style="font-family: 'Lato', sans-serif; max-width: 300px;">
                <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 1.1rem;">${title}</h3>
                <div style="margin-bottom: 10px;">
                    <strong>${idLabel}:</strong> ${buildingId}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>${heightLabel}:</strong> ${buildingHeight}${typeof buildingHeight === 'number' ? 'm' : ''}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>${usageLabel}:</strong> ${buildingUsage}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>${classLabel}:</strong> ${buildingClass}
                </div>
        `;

        // Add available properties
        if (properties && properties.length > 0) {
            html += `<div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
                        <strong>${propertiesLabel}:</strong><br>`;
            properties.slice(0, 5).forEach(prop => {
                const value = feature.getProperty(prop);
                if (value !== undefined && value !== null && value !== '') {
                    html += `<small>${prop}: ${value}</small><br>`;
                }
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    handler.setInputAction((movement) => {
        // Reset previous selection
        if (selectedFeature && window.shibuyaTileset) {
            selectedFeature.color = Cesium.Color.WHITE;
        }

        // Try to pick a 3D feature first
        const pickedFeature = viewer.scene.pick(movement.position);

        if (Cesium.defined(pickedFeature) && Cesium.defined(pickedFeature.primitive) && 
            pickedFeature.primitive instanceof Cesium.Cesium3DTileset) {
            
            // PLATEAU building feature selected
            selectedFeature = pickedFeature;
            
            // Highlight the selected building
            selectedFeature.color = Cesium.Color.YELLOW;
            
            // Update coordinates display
            const cartesian = viewer.scene.pickPosition(movement.position);
            if (cartesian) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(5);
                const latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(5);
                
                clickedCoordsValue.textContent = `Lat: ${latitudeString}, Lon: ${longitudeString}`;
                clickedCoordsPanel.classList.remove('hidden');
            }

            // Generate and display building information
            try {
                const infoHTML = generateBuildingInfoHTML(selectedFeature);
                viewer.selectedEntity = new Cesium.Entity({
                    name: 'PLATEAU Building',
                    description: infoHTML
                });
            } catch (error) {
                console.warn('Could not generate building info:', error);
                viewer.selectedEntity = new Cesium.Entity({
                    name: 'PLATEAU Building',
                    description: 'Building information available. Click to explore properties.'
                });
            }

        } else {
            // Ground or terrain clicked
            if (document.body.classList.contains('map-view-active')) {
                const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
                if (cartesian) {
                    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                    const longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(5);
                    const latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(5);
                    
                    clickedCoordsValue.textContent = `Lat: ${latitudeString}, Lon: ${longitudeString}`;
                    clickedCoordsPanel.classList.remove('hidden');
                }
            }
            
            // Clear building selection
            selectedFeature = null;
            viewer.selectedEntity = undefined;
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Double-click to focus on selected building
    handler.setInputAction((movement) => {
        const pickedFeature = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedFeature) && Cesium.defined(pickedFeature.primitive) && 
            pickedFeature.primitive instanceof Cesium.Cesium3DTileset) {
            
            const cartesian = viewer.scene.pickPosition(movement.position);
            if (cartesian) {
                // Fly to the selected building
                viewer.camera.flyTo({
                    destination: cartesian,
                    orientation: {
                        heading: viewer.camera.heading,
                        pitch: Cesium.Math.toRadians(-30),
                        roll: 0.0
                    },
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-30), 200)
                });
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // 9. Enhanced Camera Controls
    // Enable mouse wheel zoom
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;

    // Set zoom limits
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 5000;

    // 10. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (!document.body.classList.contains('map-view-active')) return;

        switch(e.key.toLowerCase()) {
            case 'r':
                // Toggle rotation
                if (rotationToggle) rotationToggle.click();
                break;
            case 'h':
                // Return to Shibuya home view
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
                    orientation: {
                        heading: 0,
                        pitch: pitch,
                        roll: 0.0
                    },
                    duration: 2
                });
                break;
            case 'c':
                // Clear selection
                selectedFeature = null;
                viewer.selectedEntity = undefined;
                if (window.shibuyaTileset) {
                    window.shibuyaTileset.style = new Cesium.Cesium3DTileStyle({
                        color: 'color("white")'
                    });
                }
                break;
        }
    });
});