
/* ==========================================================
   NEXUS 3.0 — MOTOR CARTOGRÁFICO
   MapLibre + OpenFreeMap + fachadas texturizadas
   ========================================================== */

(() => {

    "use strict";


    /* ======================================================
       1. CONFIGURAÇÕES
    ====================================================== */

    const CONFIG =
        window.NEXUS_CONFIG || {};


    const MC =
        CONFIG.MAP || {};


    const COLORS =
        CONFIG.COLORS || {};


    const STYLE_URL =
        MC.STYLE_URL ||
        "https://tiles.openfreemap.org/styles/liberty";


    const CENTER =
        MC.CENTER || [-34.8770, -8.0560];


    const ZOOM =
        MC.ZOOM || 12.5;


    const PITCH =
        MC.PITCH || 53;


    const BEARING =
        MC.BEARING || -17;


    const TERRAIN_URL =
        MC.TERRAIN_URL ||
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";


    const BUILDING_URL =
        "https://tiles.openfreemap.org/planet";


    /* ======================================================
       2. ESTADO
    ====================================================== */

    let map = null;

    let terrainAvailable = false;

    let terrainEnabled = false;

    let buildingEnabled = true;

    let worksEnabled = true;

    let selectedWorkId = null;

    let temporaryMarker = null;

    let rotationAngle = BEARING;

    let buildingSourceId = null;

    let buildingSourceLayer = "building";

    let markersInitialized = false;

    const markers = new Map();

    let filteredStatus = "Todas";


    /* ======================================================
       3. ELEMENTOS
    ====================================================== */

    const statusElement =
        document.getElementById("mapStatus");


    const statusText =
        document.getElementById("mapStatusText");


    const coordinatesElement =
        document.getElementById("mapCoordinates");


    const contextElement =
        document.getElementById("mapContextTitle");


    function showStatus(message) {

        if (!statusElement) return;


        statusElement.hidden = false;

        statusElement.classList.remove("hidden");


        if (statusText) {
            statusText.textContent = message;
        }

    }


    function hideStatus() {

        if (!statusElement) return;


        statusElement.classList.add("hidden");

        statusElement.hidden = true;

    }


    function setCoordinates(text) {

        if (coordinatesElement) {
            coordinatesElement.textContent = text;
        }

    }


    function setContext(text) {

        if (contextElement) {
            contextElement.textContent = text;
        }

    }


    /* ======================================================
       4. FUNÇÕES AUXILIARES
    ====================================================== */

    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"

            })[char]
        );

    }


    function obrasAtuais() {

        if (
            window.NEXUS_STORAGE &&
            typeof window.NEXUS_STORAGE.getObras === "function"
        ) {

            return window.NEXUS_STORAGE.getObras();

        }


        return Array.isArray(window.NEXUS_OBRAS)
            ? window.NEXUS_OBRAS
            : [];

    }


    function statusColor(status) {

        if (status === "Concluída") {
            return COLORS.completed || "#79B66B";
        }

        if (status === "Planejamento") {
            return COLORS.planning || "#50A9D3";
        }

        return COLORS.progress || "#19B6A1";

    }


    function markerStatusClass(status) {

        if (status === "Concluída") {
            return "concluida";
        }

        if (status === "Planejamento") {
            return "planejamento";
        }

        return "andamento";

    }


    /* ======================================================
       5. IDENTIFICAR FONTE VETORIAL DE EDIFICAÇÕES
    ====================================================== */

    function findBuildingLayer() {

        if (!map || !map.isStyleLoaded()) {
            return null;
        }


        const layers =
            map.getStyle().layers || [];


        return layers.find(layer => {

            return (
                layer["source-layer"] === "building" &&
                layer.source
            );

        }) || null;

    }


    function configureBuildingSource() {

        const existing =
            findBuildingLayer();


        if (existing) {

            buildingSourceId =
                existing.source;

            buildingSourceLayer =
                existing["source-layer"];


            console.info(
                "[NEXUS MAP] Fonte de edifícios:",
                buildingSourceId
            );


            return true;

        }


        const sources =
            map.getStyle().sources || {};


        const candidate =
            Object.entries(sources).find(
                ([, source]) => {

                    return (

                        source.type === "vector" &&

                        (

                            String(source.url || "")
                                .includes("openfreemap") ||

                            String(source.url || "")
                                .includes("planet")

                        )

                    );

                }
            );


        if (candidate) {

            buildingSourceId =
                candidate[0];

            buildingSourceLayer =
                "building";


            return true;

        }


        buildingSourceId =
            "nexus-buildings";


        if (!map.getSource(buildingSourceId)) {

            map.addSource(
                buildingSourceId,
                {

                    type: "vector",

                    url: BUILDING_URL

                }
            );

        }


        buildingSourceLayer =
            "building";


        return true;

    }


    /* ======================================================
       6. TEXTURAS PROCEDURAIS
       Concreto, vidro, tijolo e metal.
    ====================================================== */

    function createTexture(type, colors) {

        const canvas =
            document.createElement("canvas");


        // A dimensão 64 permite padrão repetível.
        canvas.width = 64;

        canvas.height = 64;


        const context =
            canvas.getContext("2d");


        if (!context) {
            return canvas;
        }


        context.fillStyle =
            colors.background;


        context.fillRect(
            0,
            0,
            64,
            64
        );


        /* CONCRETO */

        if (type === "concrete") {

            context.strokeStyle =
                colors.joint;

            context.lineWidth = 1;


            for (let y = 0; y <= 64; y += 32) {

                context.beginPath();

                context.moveTo(0, y);

                context.lineTo(64, y);

                context.stroke();

            }


            for (let x = 0; x <= 64; x += 32) {

                context.beginPath();

                context.moveTo(x, 0);

                context.lineTo(x, 64);

                context.stroke();

            }


            for (let i = 0; i < 100; i++) {

                const x =
                    (i * 37) % 64;


                const y =
                    (i * 19) % 64;


                context.fillStyle =
                    `rgba(60,65,62,${0.025 + (i % 4) * 0.01})`;


                context.fillRect(
                    x,
                    y,
                    1,
                    1
                );

            }

        }


        /* VIDRO */

        if (type === "glass") {

            for (let y = 0; y < 64; y += 16) {

                for (let x = 0; x < 64; x += 16) {

                    context.fillStyle =
                        colors.window;


                    context.fillRect(
                        x + 2,
                        y + 2,
                        12,
                        12
                    );


                    context.fillStyle =
                        colors.reflection;


                    context.fillRect(
                        x + 3,
                        y + 3,
                        3,
                        10
                    );


                    context.strokeStyle =
                        colors.joint;


                    context.lineWidth = 1;


                    context.strokeRect(
                        x,
                        y,
                        16,
                        16
                    );

                }

            }

        }


        /* TIJOLO */

        if (type === "brick") {

            for (let row = 0; row < 8; row++) {

                const shift =
                    row % 2 ? -8 : 0;


                for (let x = -8; x < 72; x += 16) {

                    context.fillStyle =
                        colors.brick;


                    context.fillRect(
                        x + shift + 1,
                        row * 8 + 1,
                        14,
                        6
                    );


                    context.strokeStyle =
                        colors.joint;


                    context.lineWidth = .6;


                    context.strokeRect(
                        x + shift + 1,
                        row * 8 + 1,
                        14,
                        6
                    );

                }

            }

        }


        /* METAL */

        if (type === "metal") {

            for (let x = 0; x < 64; x += 5) {

                context.fillStyle =
                    colors.shadow;


                context.fillRect(
                    x,
                    0,
                    1,
                    64
                );


                context.fillStyle =
                    colors.light;


                context.fillRect(
                    x + 1,
                    0,
                    3,
                    64
                );

            }

        }


        return canvas;

    }


    function registerTextures() {

        const textureList = [

            {

                id: "nexus-concrete",

                type: "concrete",

                colors: {

                    background: "#C9C5B9",

                    joint: "#AAA69B"

                }

            },

            {

                id: "nexus-glass",

                type: "glass",

                colors: {

                    background: "#507E8A",

                    window: "#80B0BD",

                    reflection: "#D3EFF0",

                    joint: "#335C69"

                }

            },

            {

                id: "nexus-brick",

                type: "brick",

                colors: {

                    background: "#A97459",

                    brick: "#BD886B",

                    joint: "#E0BBA0"

                }

            },

            {

                id: "nexus-metal",

                type: "metal",

                colors: {

                    background: "#9BA9AC",

                    shadow: "#71848B",

                    light: "#C3CFD1"

                }

            }

        ];


        textureList.forEach(texture => {

            if (map.hasImage(texture.id)) {
                return;
            }


            const image = createTexture(
                texture.type,
                texture.colors
            );


            map.addImage(
                texture.id,
                image,
                {
                    pixelRatio: 1
                }
            );

        });


        console.info(
            "[NEXUS MAP] Texturas procedurais preparadas."
        );

    }


    /* ======================================================
       7. IDENTIFICAR TEXTURA PELO TIPO DE EDIFÍCIO
    ====================================================== */

    function getBuildingPattern() {

        return [

            "match",

            ["get", "class"],


            "commercial",
            "nexus-glass",


            "office",
            "nexus-glass",


            "industrial",
            "nexus-metal",


            "house",
            "nexus-brick",


            "apartments",
            "nexus-concrete",


            "school",
            "nexus-concrete",


            "hospital",
            "nexus-concrete",


            "nexus-concrete"

        ];

    }


    /* ======================================================
       8. ALTURA DAS CONSTRUÇÕES
    ====================================================== */

    function getBuildingHeight() {

        return [

            "max",

            4,

            [

                "to-number",

                [

                    "coalesce",

                    ["get", "render_height"],

                    ["get", "height"],

                    [

                        "*",

                        [

                            "to-number",

                            [

                                "coalesce",

                                ["get", "building:levels"],

                                ["get", "levels"],

                                3

                            ]

                        ],

                        3

                    ],

                    8

                ]

            ]

        ];

    }


    function getBuildingBase() {

        return [

            "max",

            0,

            [

                "to-number",

                [

                    "coalesce",

                    ["get", "render_min_height"],

                    ["get", "min_height"],

                    0

                ]

            ]

        ];

    }


    /* ======================================================
       9. ADICIONAR EDIFÍCIOS 3D
    ====================================================== */

    function add3DBuildings() {

        if (!map || !map.isStyleLoaded()) {
            return false;
        }


        if (map.getLayer("nexus-buildings-3d")) {
            return true;
        }


        configureBuildingSource();


        const height =
            getBuildingHeight();


        const base =
            getBuildingBase();


        const firstSymbol =
            (map.getStyle().layers || [])
                .find(layer => layer.type === "symbol");


        try {

            // Evita uma duplicação de extrusões 3D do estilo original.
            const existingExtrusions =
                (map.getStyle().layers || []).filter(layer => {

                    return (

                        layer.type === "fill-extrusion" &&

                        layer["source-layer"] === "building"

                    );

                });


            existingExtrusions.forEach(layer => {

                map.setLayoutProperty(
                    layer.id,
                    "visibility",
                    "none"
                );

            });


            map.addLayer(

                {

                    id: "nexus-buildings-3d",

                    type: "fill-extrusion",

                    source: buildingSourceId,

                    "source-layer": buildingSourceLayer,

                    minzoom:
                        MC.BUILDING_MIN_ZOOM || 12.9,


                    filter: [

                        "!=",

                        ["get", "hide_3d"],

                        true

                    ],


                    paint: {

                        "fill-extrusion-pattern":
                            getBuildingPattern(),


                        "fill-extrusion-height":

                            [

                                "interpolate",

                                ["linear"],

                                ["zoom"],

                                12.5,
                                0,

                                15,
                                height

                            ],


                        "fill-extrusion-base":
                            base,


                        "fill-extrusion-opacity":
                            0.98,


                        "fill-extrusion-vertical-gradient":
                            true

                    }

                },

                firstSymbol
                    ? firstSymbol.id
                    : undefined

            );


            console.info(
                "[NEXUS MAP] Edificações 3D texturizadas ativadas."
            );


            return true;


        } catch (error) {

            console.error(
                "[NEXUS MAP] Erro ao adicionar edifícios:",
                error
            );


            return false;

        }

    }


    /* ======================================================
       10. ESTILIZAR HIDROGRAFIA
    ====================================================== */

    function configureWater() {

        const layers =
            map.getStyle().layers || [];


        layers.forEach(layer => {

            const id =
                layer.id.toLowerCase();


            const sourceLayer =
                String(
                    layer["source-layer"] || ""
                ).toLowerCase();


            const isWaterFill =

                layer.type === "fill" &&

                (

                    sourceLayer === "water" ||

                    /water|ocean|lake|river/i.test(id)

                );


            if (!isWaterFill) {
                return;
            }


            try {

                map.setPaintProperty(
                    layer.id,
                    "fill-color",
                    COLORS.water || "#81C8E2"
                );


                map.setPaintProperty(
                    layer.id,
                    "fill-opacity",
                    0.97
                );


                map.setPaintProperty(
                    layer.id,
                    "fill-outline-color",
                    COLORS.waterOutline || "#B6E4EE"
                );

            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Erro na água:",
                    error
                );

            }

        });


        // Rios, canais e cursos d'água lineares.
        layers.forEach(layer => {

            const id =
                layer.id.toLowerCase();


            const sourceLayer =
                String(
                    layer["source-layer"] || ""
                ).toLowerCase();


            const isWaterLine =

                layer.type === "line" &&

                (

                    sourceLayer === "waterway" ||

                    /waterway|river|canal/i.test(id)

                );


            if (!isWaterLine) {
                return;
            }


            try {

                map.setPaintProperty(
                    layer.id,
                    "line-color",
                    "#52B9D8"
                );


                map.setPaintProperty(
                    layer.id,
                    "line-opacity",
                    0.95
                );


                map.setPaintProperty(

                    layer.id,

                    "line-width",

                    [

                        "interpolate",

                        ["linear"],

                        ["zoom"],

                        10, 1,

                        13, 2,

                        16, 3.5,

                        19, 5

                    ]

                );

            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Erro no curso d'água:",
                    error
                );

            }

        });

    }


    /* ======================================================
       11. ESTILIZAR ÁREAS VERDES
    ====================================================== */

    function configureGreen() {

        const layers =
            map.getStyle().layers || [];


        layers.forEach(layer => {

            if (layer.type !== "fill") {
                return;
            }


            const id =
                layer.id.toLowerCase();


            const sourceLayer =
                String(
                    layer["source-layer"] || ""
                ).toLowerCase();


            const isGreen =

                sourceLayer === "park" ||

                sourceLayer === "landcover" ||

                /park|forest|grass|wood|landcover/i.test(id);


            if (!isGreen) {
                return;
            }


            try {

                map.setPaintProperty(
                    layer.id,
                    "fill-color",
                    COLORS.green || "#B5D7AE"
                );


                map.setPaintProperty(
                    layer.id,
                    "fill-opacity",
                    0.82
                );

            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Erro em área verde:",
                    error
                );

            }

        });

    }


    /* ======================================================
       12. AJUSTAR RUAS E AVENIDAS
    ====================================================== */

    function configureRoads() {

        const layers =
            map.getStyle().layers || [];


        layers.forEach(layer => {

            if (layer.type !== "line") {
                return;
            }


            const id =
                layer.id.toLowerCase();


            const sourceLayer =
                String(
                    layer["source-layer"] || ""
                ).toLowerCase();


            const isRoad =

                [

                    "transportation",

                    "transportation_name",

                    "transportation_detail",

                    "road"

                ].includes(sourceLayer) ||

                /road|street|motorway|highway|transportation/i.test(id);


            if (!isRoad) {
                return;
            }


            if (/outline|casing|tunnel|bridge/i.test(id)) {
                return;
            }


            try {

                map.setPaintProperty(

                    layer.id,

                    "line-color",

                    COLORS.roadSecondary || "#F5E7C7"

                );


            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Não foi possível ajustar uma via:",
                    layer.id
                );

            }

        });

    }


    /* ======================================================
       13. REDUZIR EXCESSO DE RÓTULOS
    ====================================================== */

    function cleanLabels() {

        const layers =
            map.getStyle().layers || [];


        const noisy =

            /(housenumber|house_number|poi|point_of_interest|airport|aeroway|shop|amenity|tourism|mountain_peak)/i;


        layers.forEach(layer => {

            if (layer.type !== "symbol") {
                return;
            }


            if (noisy.test(layer.id)) {

                try {

                    map.setLayoutProperty(
                        layer.id,
                        "visibility",
                        "none"
                    );

                } catch (error) {

                    console.warn(
                        "[NEXUS MAP] Rótulo não ocultado:",
                        layer.id
                    );

                }

            }

        });

    }


    /* ======================================================
       14. RELEVO E SOMBREAMENTO
    ====================================================== */

    function configureTerrain() {

        const enabled =
            MC.TERRAIN_ENABLED !== false;


        if (!enabled || !map) {
            return false;
        }


        try {

            if (!map.getSource("nexus-terrain")) {

                map.addSource(

                    "nexus-terrain",

                    {

                        type: "raster-dem",

                        tiles: [TERRAIN_URL],

                        tileSize: 256,

                        minzoom: 0,

                        maxzoom: 15,

                        encoding: "terrarium"

                    }

                );

            }


            if (!map.getLayer("nexus-hillshade")) {

                const before =
                    (map.getStyle().layers || [])
                        .find(layer => layer.type === "symbol");


                map.addLayer(

                    {

                        id: "nexus-hillshade",

                        type: "hillshade",

                        source: "nexus-terrain",


                        paint: {

                            "hillshade-shadow-color":
                                "#586D69",

                            "hillshade-highlight-color":
                                "#F1F3E9",

                            "hillshade-accent-color":
                                "#A1B8AC",

                            "hillshade-illumination-direction":
                                335,

                            "hillshade-exaggeration":
                                0.22

                        }

                    },

                    before?.id

                );

            }


            map.setTerrain({

                source: "nexus-terrain",

                exaggeration:
                    MC.TERRAIN_EXAGGERATION || 1.15

            });


            terrainAvailable = true;

            terrainEnabled = true;


            console.info(
                "[NEXUS MAP] Relevo e sombreamento habilitados."
            );


            return true;


        } catch (error) {

            terrainAvailable = false;

            terrainEnabled = false;


            console.warn(
                "[NEXUS MAP] Relevo indisponível; mapa continuará funcionando:",
                error
            );


            const checkbox =
                document.getElementById("layerRelief");


            if (checkbox) {
                checkbox.checked = false;
            }


            return false;

        }

    }


    function setTerrain(visible) {

        if (!map) return;


        if (visible) {

            const result =
                configureTerrain();


            const layer =
                map.getLayer("nexus-hillshade");


            if (layer) {

                map.setLayoutProperty(
                    "nexus-hillshade",
                    "visibility",
                    "visible"
                );

            }


            terrainEnabled =
                Boolean(result);


        } else {

            try {

                if (map.getLayer("nexus-hillshade")) {

                    map.setLayoutProperty(
                        "nexus-hillshade",
                        "visibility",
                        "none"
                    );

                }


                map.setTerrain(null);


            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Não foi possível desativar o relevo:",
                    error
                );

            }


            terrainEnabled = false;

        }

    }


    /* ======================================================
       15. CLASSIFICAR CAMADAS CARTOGRÁFICAS
    ====================================================== */

    function belongsToGroup(layer, group) {

        const id =
            layer.id.toLowerCase();


        const sourceLayer =
            String(
                layer["source-layer"] || ""
            ).toLowerCase();


        if (group === "buildings") {

            return (

                sourceLayer === "building" ||

                /building/.test(id)

            );

        }


        if (group === "roads") {

            return (

                [

                    "transportation",

                    "transportation_name",

                    "transportation_detail",

                    "road"

                ].includes(sourceLayer) ||

                /road|street|highway|transportation|motorway/i.test(id)

            );

        }


        if (group === "water") {

            return (

                sourceLayer === "water" ||

                sourceLayer === "waterway" ||

                /water|river|ocean|lake|canal/i.test(id)

            );

        }


        if (group === "green") {

            return (

                sourceLayer === "park" ||

                sourceLayer === "landcover" ||

                /park|green|forest|grass|wood|landcover/i.test(id)

            );

        }


        if (group === "labels") {

            return layer.type === "symbol";

        }


        return false;

    }


    /* ======================================================
       16. CONTROLAR CAMADAS
    ====================================================== */

    function setLayerGroup(group, visible) {

        if (!map || !map.isStyleLoaded()) {
            return;
        }


        if (group === "works") {

            worksEnabled = visible;


            markers.forEach(({ marker }) => {

                marker.getElement().style.display =
                    visible ? "" : "none";

            });


            return;

        }


        if (group === "relief") {

            setTerrain(visible);

            return;

        }


        if (group === "buildings") {

            buildingEnabled = visible;


            if (map.getLayer("nexus-buildings-3d")) {

                map.setLayoutProperty(

                    "nexus-buildings-3d",

                    "visibility",

                    visible ? "visible" : "none"

                );

            }

        }


        const layers =
            map.getStyle().layers || [];


        layers.forEach(layer => {

            if (!belongsToGroup(layer, group)) {
                return;
            }


            if (

                layer.id === "nexus-buildings-3d"

            ) {
                return;
            }


            try {

                map.setLayoutProperty(

                    layer.id,

                    "visibility",

                    visible ? "visible" : "none"

                );

            } catch (error) {

                console.warn(
                    "[NEXUS MAP] Falha ao alterar camada:",
                    layer.id
                );

            }

        });

    }


    /* ======================================================
       17. PAINEL DE CAMADAS
    ====================================================== */

    function configureLayerPanel() {

        const groups = {

            layerBuildings: "buildings",

            layerRoads: "roads",

            layerWater: "water",

            layerGreen: "green",

            layerLabels: "labels",

            layerRelief: "relief",

            layerWorks: "works"

        };


        Object.entries(groups).forEach(
            ([inputId, group]) => {

                const input =
                    document.getElementById(inputId);


                if (!input) return;


                input.addEventListener("change", () => {

                    setLayerGroup(
                        group,
                        input.checked
                    );

                });

            }

        );


        const panel =
            document.getElementById("layersPanel");


        const button =
            document.getElementById("layersBtn");


        const close =
            document.getElementById("closeLayers");


        function openPanel(show) {

            if (!panel || !button) return;


            panel.hidden = !show;


            button.setAttribute(
                "aria-expanded",
                String(show)
            );


            button.classList.toggle(
                "active",
                show
            );

        }


        button?.addEventListener("click", () => {

            openPanel(panel.hidden);

        });


        close?.addEventListener("click", () => {

            openPanel(false);

        });


        document.getElementById("showAllLayers")
            ?.addEventListener("click", () => {

                Object.entries(groups).forEach(
                    ([inputId, group]) => {

                        const input =
                            document.getElementById(inputId);


                        if (input) {
                            input.checked = true;
                        }


                        setLayerGroup(group, true);

                    }

                );

            });


        document.getElementById("hideAllLayers")
            ?.addEventListener("click", () => {

                Object.entries(groups).forEach(
                    ([inputId, group]) => {

                        const input =
                            document.getElementById(inputId);


                        if (input) {
                            input.checked = false;
                        }


                        setLayerGroup(group, false);

                    }

                );

            });


        panel?.addEventListener("click", event => {
            event.stopPropagation();
        });


        document.addEventListener("click", event => {

            if (

                panel &&

                !panel.hidden &&

                !panel.contains(event.target) &&

                !button?.contains(event.target)

            ) {

                openPanel(false);

            }

        });

    }


    /* ======================================================
       18. MARCADORES DAS OBRAS
    ====================================================== */

    function createMarkerElement(obra) {

        const element =
            document.createElement("div");


        element.className =
            `obra-marker ${markerStatusClass(obra.etapa)}`;


        element.dataset.obraId =
            obra.id;


        element.style.setProperty(

            "--marker-color",

            obra.cor || statusColor(obra.etapa)

        );


        element.title =
            `${obra.nome} — ${obra.etapa}`;


        element.setAttribute(
            "role",
            "button"
        );


        element.setAttribute(
            "aria-label",
            `Localizar obra ${obra.nome}`
        );


        return element;

    }


    function popupHTML(obra) {

        return `

            <div class="popup-obra">

                <div class="popup-kicker">

                    ${escapeHTML(obra.codigo || "NEXUS")}

                </div>


                <h3>

                    ${escapeHTML(obra.nome)}

                </h3>


                <p>

                    ${escapeHTML(obra.bairro)}

                    · Recife, PE

                </p>


                <p>

                    ${escapeHTML(obra.categoria)}

                    ·

                    ${Number(obra.progresso || 0)}% concluído

                </p>


                <p>

                    Situação:

                    ${escapeHTML(obra.etapa)}

                </p>


                <a

                    href="lugar.html?id=${encodeURIComponent(obra.id)}"

                >

                    Abrir detalhes completos ↗

                </a>

            </div>

        `;

    }


    function addMarker(obra) {

        const lat =
            Number(obra.latitude);


        const lon =
            Number(obra.longitude);


        if (

            !Number.isFinite(lat) ||

            !Number.isFinite(lon) ||

            lat < -90 ||

            lat > 90 ||

            lon < -180 ||

            lon > 180

        ) {

            console.warn(
                "[NEXUS MAP] Coordenadas inválidas:",
                obra.id
            );

            return null;

        }


        const element =
            createMarkerElement(obra);


        const popup =
            new maplibregl.Popup({

                offset: 21,

                closeButton: true,

                closeOnClick: false,

                maxWidth: "280px"

            }).setHTML(
                popupHTML(obra)
            );


        const marker =
            new maplibregl.Marker({

                element,

                anchor: "bottom"

            })

            .setLngLat([lon, lat])

            .setPopup(popup)

            .addTo(map);


        element.addEventListener("click", () => {

            focusWork(
                obra.id,
                true
            );

        });


        markers.set(

            obra.id,

            {

                marker,

                obra

            }

        );


        if (!worksEnabled) {

            element.style.display = "none";

        }


        if (
            filteredStatus !== "Todas" &&
            obra.etapa !== filteredStatus
        ) {

            element.style.display = "none";

        }


        return marker;

    }


    /* ======================================================
       19. ATUALIZAR MARCADORES
    ====================================================== */

    function refreshWorks(newWorks) {

        if (!map || !map.isStyleLoaded()) {
            return false;
        }


        const works =
            Array.isArray(newWorks)
                ? newWorks
                : obrasAtuais();


        // Remove os marcadores antigos.
        markers.forEach(({ marker }) => {

            marker.remove();

        });


        markers.clear();


        selectedWorkId = null;


        works.forEach(obra => {

            addMarker(obra);

        });


        markersInitialized = true;


        console.info(
            `[NEXUS MAP] ${markers.size} marcadores atualizados.`
        );


        return true;

    }


    function createMarkers() {

        if (markersInitialized) return;


        refreshWorks(obrasAtuais());

    }


    /* ======================================================
       20. DESTACAR UMA OBRA
    ====================================================== */

    function focusWork(id, openPopup = true) {

        const item =
            markers.get(id);


        if (!item || !map) {
            return false;
        }


        const obra =
            item.obra;


        selectedWorkId =
            id;


        markers.forEach(({ marker }, markerId) => {

            marker.getElement().classList.toggle(

                "destaque",

                markerId === id

            );

            if (markerId !== id) {

                marker.getPopup()?.remove();

            }

        });


        if (openPopup) {

            const popup =
                item.marker.getPopup();


            if (popup && !popup.isOpen()) {

                popup.addTo(map);

            }

        }


        map.flyTo({

            center: [

                Number(obra.longitude),

                Number(obra.latitude)

            ],

            zoom:
                MC.WORK_ZOOM || 17.2,

            pitch:
                MC.WORK_PITCH || 63,

            bearing:
                map.getBearing() - 4,

            duration:
                MC.ANIMATION_DURATION || 1600,

            curve: 1.35,

            speed: 0.9,

            essential: true

        });


        setCoordinates(
            `${obra.bairro} · ${obra.nome}`
        );


        setContext(
            "OBRA EM DESTAQUE"
        );


        window.dispatchEvent(

            new CustomEvent(
                "nexus-work-selected",
                {
                    detail: {
                        id: obra.id
                    }
                }
            )

        );


        return true;

    }


    /* ======================================================
       21. FILTRAR MARCADORES
    ====================================================== */

    function filterWorks(status) {

        filteredStatus =
            status || "Todas";


        markers.forEach(({ marker, obra }) => {

            const visible =

                filteredStatus === "Todas" ||

                obra.etapa === filteredStatus;


            marker.getElement().style.display =

                visible && worksEnabled
                    ? ""
                    : "none";

        });

    }


    /* ======================================================
       22. PESQUISAR OUTRO LOCAL
    ====================================================== */

    function focusPlace(place) {

        if (!map || !place) return;


        const lat =
            Number(place.lat);


        const lon =
            Number(place.lon);


        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon)
        ) {
            return;
        }


        selectedWorkId = null;


        markers.forEach(({ marker }) => {

            marker.getElement().classList.remove(
                "destaque"
            );

            marker.getPopup()?.remove();

        });


        temporaryMarker?.remove();

        temporaryMarker = null;


        const element =
            document.createElement("div");


        element.className =
            "nexus-place-marker";


        const popup =
            new maplibregl.Popup({
                offset: 15
            }).setText(
                place.label || "Local pesquisado"
            );


        temporaryMarker =
            new maplibregl.Marker({

                element,

                anchor: "center"

            })

            .setLngLat([lon, lat])

            .setPopup(popup)

            .addTo(map);


        popup.addTo(map);


        map.flyTo({

            center: [lon, lat],

            zoom: 16.5,

            pitch: 58,

            bearing: map.getBearing(),

            duration: 1450,

            curve: 1.3,

            speed: .9,

            essential: true

        });


        setCoordinates(
            place.label || "Local selecionado"
        );


        setContext(
            "LOCAL EM DESTAQUE"
        );

    }


    /* ======================================================
       23. VISÃO GERAL DO RECIFE
    ====================================================== */

    function home() {

        if (!map) return;


        selectedWorkId = null;


        markers.forEach(({ marker }) => {

            marker.getElement().classList.remove(
                "destaque"
            );

            marker.getPopup()?.remove();

        });


        temporaryMarker?.remove();

        temporaryMarker = null;


        map.flyTo({

            center: CENTER,

            zoom: ZOOM,

            pitch: PITCH,

            bearing: BEARING,

            duration: 1900,

            curve: 1.35,

            speed: .85,

            essential: true

        });


        rotationAngle =
            BEARING;


        setCoordinates(
            "Recife · Pernambuco"
        );


        setContext(
            "MAPA 3D"
        );

    }


    /* ======================================================
       24. ALTERNAR 2D E 3D
    ====================================================== */

    function toggle3D() {

        if (!map) return;


        buildingEnabled =
            !buildingEnabled;


        if (map.getLayer("nexus-buildings-3d")) {

            map.setLayoutProperty(

                "nexus-buildings-3d",

                "visibility",

                buildingEnabled
                    ? "visible"
                    : "none"

            );

        }


        if (map.getLayer("nexus-buildings-3d")) {

            map.easeTo({

                pitch: buildingEnabled
                    ? PITCH
                    : 0,

                duration: 900

            });

        }


        const input =
            document.getElementById("layerBuildings");


        if (input) {
            input.checked = buildingEnabled;
        }


        const button =
            document.getElementById("toggle3dBtn");


        if (button) {

            button.textContent =
                buildingEnabled ? "3D" : "2D";


            button.classList.toggle(
                "active",
                buildingEnabled
            );

        }


        setContext(
            buildingEnabled
                ? "MAPA 3D"
                : "MAPA 2D"
        );

    }


    /* ======================================================
       25. ROTAÇÃO
    ====================================================== */

    function rotateMap() {

        if (!map) return;


        rotationAngle =
            map.getBearing() + 45;


        map.rotateTo(

            rotationAngle,

            {

                duration: 950,

                easing: t => t * (2 - t)

            }

        );

    }


    /* ======================================================
       26. GEOLOCALIZAÇÃO
    ====================================================== */

    function locateUser() {

        if (!navigator.geolocation) {

            showStatus(
                "Geolocalização indisponível."
            );

            return;

        }


        navigator.geolocation.getCurrentPosition(

            position => {

                focusPlace({

                    lat:
                        position.coords.latitude,

                    lon:
                        position.coords.longitude,

                    label:
                        "Minha localização"

                });

            },


            error => {

                console.warn(
                    "[NEXUS MAP] Erro de localização:",
                    error
                );


                showStatus(
                    "Não foi possível acessar sua localização."
                );


                setTimeout(
                    hideStatus,
                    3000
                );

            },


            {

                enableHighAccuracy: true,

                timeout: 10000,

                maximumAge: 60000

            }

        );

    }


    /* ======================================================
       27. IDENTIFICAÇÃO DOS EDIFÍCIOS POR CLIQUE
    ====================================================== */

    function configureBuildingIdentification() {

        map.on("click", "nexus-buildings-3d", event => {

            if (!event.features?.length) {
                return;
            }


            const feature =
                event.features[0];


            const props =
                feature.properties || {};


            const name =

                props.name ||

                props.class ||

                props.type ||

                "Edificação urbana";


            const height =

                props.render_height ||

                props.height ||

                "Não informado";


            const content = `

                <div class="popup-obra">

                    <div class="popup-kicker">
                        IDENTIFICAÇÃO URBANA
                    </div>

                    <h3>
                        ${escapeHTML(name)}
                    </h3>

                    <p>
                        Altura registrada: ${escapeHTML(height)} m
                    </p>

                    <p>
                        Edificação cartográfica
                    </p>

                </div>

            `;


            new maplibregl.Popup({

                closeButton: true,

                maxWidth: "240px"

            })

            .setLngLat(event.lngLat)

            .setHTML(content)

            .addTo(map);

        });


        map.on(
            "mouseenter",
            "nexus-buildings-3d",
            () => {

                map.getCanvas().style.cursor =
                    "pointer";

            }
        );


        map.on(
            "mouseleave",
            "nexus-buildings-3d",
            () => {

                map.getCanvas().style.cursor =
                    "";

            }
        );

    }


    /* ======================================================
       28. CONTROLES NATIVOS E BOTÕES
    ====================================================== */

    function configureControls() {

        map.addControl(

            new maplibregl.NavigationControl({

                visualizePitch: true,

                showZoom: true,

                showCompass: true

            }),

            "bottom-right"

        );


        map.addControl(

            new maplibregl.ScaleControl({

                maxWidth: 100,

                unit: "metric"

            }),

            "bottom-right"

        );


        document.getElementById("homeBtn")
            ?.addEventListener(
                "click",
                home
            );


        document.getElementById("locateBtn")
            ?.addEventListener(
                "click",
                locateUser
            );


        document.getElementById("toggle3dBtn")
            ?.addEventListener(
                "click",
                toggle3D
            );


        document.getElementById("rotateBtn")
            ?.addEventListener(
                "click",
                rotateMap
            );


        configureLayerPanel();

    }


    /* ======================================================
       29. INICIALIZAR O MAPA
    ====================================================== */

    function initializeMap() {

        const container =
            document.getElementById("mapa");


        if (!container) {

            console.error(
                "[NEXUS MAP] #mapa não foi encontrado."
            );

            return;

        }


        if (!window.maplibregl) {

            showStatus(
                "A biblioteca MapLibre não foi carregada."
            );

            console.error(
                "[NEXUS MAP] MapLibre indisponível."
            );

            return;

        }


        showStatus(
            "Preparando mapa 3D do Recife..."
        );


        map = new maplibregl.Map({

            container,

            style: STYLE_URL,

            center: CENTER,

            zoom: ZOOM,

            minZoom:
                MC.MIN_ZOOM || 10,

            maxZoom:
                MC.MAX_ZOOM || 19.5,

            pitch: PITCH,

            bearing: BEARING,

            maxPitch:
                MC.MAX_PITCH || 68,

            antialias: true,

            renderWorldCopies: false,

            cooperativeGestures: true,

            fadeDuration: 250

        });


        configureControls();


        /* ==================================================
           ESTILO CARREGADO
        ================================================== */

        map.on("load", () => {

            console.info(
                "[NEXUS MAP] Estilo Liberty carregado."
            );


            try {

                registerTextures();

            } catch (error) {

                console.error(
                    "[NEXUS MAP] Texturas:",
                    error
                );

            }


            configureWater();

            configureGreen();

            configureRoads();

            cleanLabels();


            const buildingsReady =
                add3DBuildings();


            const terrainCheckbox =
                document.getElementById("layerRelief");


            if (
                terrainCheckbox &&
                terrainCheckbox.checked
            ) {

                configureTerrain();

            }


            createMarkers();


            if (
    buildingsReady &&
    map.getLayer("nexus-buildings-3d")
) {
    configureBuildingIdentification();
}


            hideStatus();


            const dot =
                document.getElementById("connectionDot");


            dot?.classList.add("connected");


            const connection =
                document.getElementById("connectionLabel");


            if (connection) {

                connection.textContent =
                    "MAPA CONECTADO";

            }


            setCoordinates(
                "Recife · Pernambuco"
            );


            setContext(
                "MAPA 3D"
            );


            window.dispatchEvent(
                new CustomEvent("nexus-map-ready")
            );


            requestAnimationFrame(() => {

                map.resize();

            });


            console.info(
                "[NEXUS MAP] Marcadores:",
                markers.size
            );


            console.info(
                "[NEXUS MAP] Edifícios:",
                buildingsReady ? "ATIVOS" : "NÃO DISPONÍVEIS"
            );

        });


        /* ==================================================
           ERROS DO MAPA
        ================================================== */

        map.on("error", event => {

            console.error(
                "[NEXUS MAP]",
                event?.error || event
            );

        });


        /* ==================================================
           MOVIMENTAÇÃO
        ================================================== */

        map.on("moveend", () => {

            if (selectedWorkId || temporaryMarker) {
                return;
            }


            const center =
                map.getCenter();


            setCoordinates(

                `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`

            );

        });


        /* ==================================================
           RESIZE
        ================================================== */

        window.addEventListener("resize", () => {

            map?.resize();

        });

    }


    /* ======================================================
       30. API PÚBLICA
    ====================================================== */

    window.NEXUS_MAPA = {

        get map() {
            return map;
        },

        mapa: () => map,

        focarObra: focusWork,

        focarLocal: focusPlace,

        mostrarVisaoGeral: home,

        alternar3D: toggle3D,

        rotacionar: rotateMap,

        localizarUsuario: locateUser,

        refreshObras: refreshWorks,

        filtrarObras: filterWorks,

        setLayerGroup,

        getMarkers: () => markers,

        getTerrainStatus: () => ({
            available: terrainAvailable,
            enabled: terrainEnabled
        })

    };


    /* ======================================================
       31. INICIALIZAÇÃO
    ====================================================== */

    if (document.readyState === "loading") {

        document.addEventListener(

            "DOMContentLoaded",

            initializeMap,

            { once: true }

        );

    } else {

        initializeMap();

    }

})();
