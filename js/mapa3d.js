// Map3d.js
// NEXUS Urban Intelligence 2.0
// Motor cartográfico 3D baseado em MapLibre GL JS.

import maplibregl from "https://esm.sh/maplibre-gl@5.6.2";

let mapaNexus;
let marcadoresObras = [];
let obrasVisiveis = [];
let camadasAtivas = {
    obras: true,
    edificios: true,
    vias: true,
    areasVerdes: false,
    etiquetas: true
};

const CENTRO_RECIFE = [-34.8770, -8.0476];

const ESTILOS = {
    dia: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    noite: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
};

function obterCorStatus(status) {
    const texto = String(status || "").toLowerCase();

    if (texto.includes("conclu")) return "#22c55e";
    if (texto.includes("execu")) return "#f59e0b";
    if (texto.includes("planej")) return "#3b82f6";
    if (texto.includes("projeto")) return "#a855f7";

    return "#14b8a6";
}

function normalizarObra(obra) {
    return {
        ...obra,
        latitude: Number(obra.latitude),
        longitude: Number(obra.longitude)
    };
}

function criarElementoMarcador(obra) {
    const elemento = document.createElement("div");

    elemento.className = "nexus-marker";
    elemento.style.setProperty("--marker-color", obterCorStatus(obra.etapa));

    elemento.innerHTML = `
        <div class="marker-pulse"></div>
        <div class="marker-core">
            <span class="marker-icon">⌂</span>
        </div>
    `;

    elemento.title = obra.nome || "Obra cadastrada";

    return elemento;
}

function criarPopupObra(obra) {
    const container = document.createElement("div");
    container.className = "nexus-popup";

    const titulo = document.createElement("h3");
    titulo.textContent = obra.nome || "Obra sem nome";

    const bairro = document.createElement("p");
    bairro.textContent = obra.endereco || "Local não informado";

    const status = document.createElement("span");
    status.className = "popup-status";
    status.textContent = obra.etapa || "Sem status";

    const progresso = document.createElement("div");
    progresso.className = "popup-progress";

    const barra = document.createElement("div");
    barra.className = "popup-progress-bar";
    barra.style.width = `${Math.max(0, Math.min(100, Number(obra.progresso || 0)))}%`;
    progresso.append(barra);

    const porcentagem = document.createElement("small");
    porcentagem.textContent = `${Number(obra.progresso || 0)}% concluído`;

    const botao = document.createElement("button");
    botao.className = "popup-details";
    botao.textContent = "Ver detalhes";

    botao.addEventListener("click", () => {
        window.location.href = `lugar.html?id=${encodeURIComponent(obra.id)}`;
    });

    container.append(titulo, bairro, status, progresso, porcentagem, botao);

    return container;
}

function removerMarcadores() {
    marcadoresObras.forEach(marcador => marcador.remove());
    marcadoresObras = [];
}

function adicionarMarcadores(obras) {
    if (!mapaNexus) return;

    removerMarcadores();

    obrasVisiveis = obras.map(normalizarObra);

    obrasVisiveis.forEach(obra => {
        if (
            !Number.isFinite(obra.latitude) ||
            !Number.isFinite(obra.longitude)
        ) {
            return;
        }

        const elemento = criarElementoMarcador(obra);

        const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            maxWidth: "280px"
        }).setDOMContent(criarPopupObra(obra));

        const marcador = new maplibregl.Marker({
            element,
            anchor: "bottom"
        })
            .setLngLat([obra.longitude, obra.latitude])
            .setPopup(popup)
            .addTo(mapaNexus);

        marcadoresObras.push(marcador);
    });
}

function localizarObra(id) {
    const obra = obrasVisiveis.find(item => String(item.id) === String(id));

    if (!obra || !mapaNexus) return;

    mapaNexus.flyTo({
        center: [obra.longitude, obra.latitude],
        zoom: 17,
        pitch: 65,
        bearing: -20,
        duration: 1800
    });

    const marcador = marcadoresObras.find(item => {
        const coordenadas = item.getLngLat();

        return (
            coordenadas.lat === obra.latitude &&
            coordenadas.lng === obra.longitude
        );
    });

    if (marcador) {
        marcador.togglePopup();
    }
}

function localizarRecife() {
    if (!mapaNexus) return;

    mapaNexus.flyTo({
        center: CENTRO_RECIFE,
        zoom: 13.5,
        pitch: 58,
        bearing: -15,
        duration: 1800
    });
}

function ajustarCamadaEdificios() {
    if (!mapaNexus) return;

    const camadas = mapaNexus.getStyle()?.layers || [];

    const camadaEdificios = camadas.find(layer =>
        layer.id.toLowerCase().includes("building") ||
        layer.id.toLowerCase().includes("buildings")
    );

    if (camadaEdificios) {
        mapaNexus.setLayoutProperty(
            camadaEdificios.id,
            "visibility",
            camadasAtivas.edificios ? "visible" : "none"
        );
    }
}

function adicionarEdificios3D() {
    if (!mapaNexus || !mapaNexus.getStyle()) return;

    const layers = mapaNexus.getStyle().layers || [];

    const layerEdificios = layers.find(layer => {
        const id = layer.id.toLowerCase();

        return id.includes("building") && layer.type === "fill";
    });

    if (!layerEdificios) return;

    if (mapaNexus.getLayer("nexus-3d-buildings")) {
        mapaNexus.removeLayer("nexus-3d-buildings");
    }

    mapaNexus.addLayer({
        id: "nexus-3d-buildings",
        source: layerEdificios.source,
        "source-layer": layerEdificios["source-layer"],
        filter: layerEdificios.filter || ["all"],
        type: "fill-extrusion",
        minzoom: 13,
        paint: {
            "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["get", "height"],
                0, "#cbd5e1",
                20, "#94a3b8",
                80, "#64748b",
                150, "#475569"
            ],
            "fill-extrusion-height": [
                "coalesce",
                ["get", "render_height"],
                ["get", "height"],
                8
            ],
            "fill-extrusion-base": [
                "coalesce",
                ["get", "render_min_height"],
                ["get", "min_height"],
                0
            ],
            "fill-extrusion-opacity": 0.88
        }
    });

    ajustarCamadaEdificios();
}

function controlarCamadas() {
    if (!mapaNexus) return;

    marcadoresObras.forEach(marcador => {
        const elemento = marcador.getElement();

        elemento.style.display = camadasAtivas.obras ? "" : "none";
    });

    ajustarCamadaEdificios();

    const layers = mapaNexus.getStyle()?.layers || [];

    layers.forEach(layer => {
        const id = layer.id.toLowerCase();

        if (id.includes("road") || id.includes("transport")) {
            try {
                mapaNexus.setLayoutProperty(
                    layer.id,
                    "visibility",
                    camadasAtivas.vias ? "visible" : "none"
                );
            } catch (_) {}
        }

        if (id.includes("park") || id.includes("green") || id.includes("landcover")) {
            try {
                mapaNexus.setLayoutProperty(
                    layer.id,
                    "visibility",
                    camadasAtivas.areasVerdes ? "visible" : "none"
                );
            } catch (_) {}
        }

        if (
            layer.type === "symbol" &&
            !id.includes("building")
        ) {
            try {
                mapaNexus.setLayoutProperty(
                    layer.id,
                    "visibility",
                    camadasAtivas.etiquetas ? "visible" : "none"
                );
            } catch (_) {}
        }
    });
}

function alterarTema(tema) {
    if (!mapaNexus) return;

    const estilo = tema === "noite" ? ESTILOS.noite : ESTILOS.dia;

    mapaNexus.setStyle(estilo);

    mapaNexus.once("style.load", () => {
        adicionarEdificios3D();
        controlarCamadas();

        mapaNexus.setTerrain(null);

        mapaNexus.easeTo({
            pitch: 58,
            duration: 800
        });
    });
}

function iniciarMapa(elementoId = "map") {
    const elemento = document.getElementById(elementoId);

    if (!elemento) {
        console.error("NEXUS: elemento do mapa não encontrado.");
        return null;
    }

    if (mapaNexus) {
        return mapaNexus;
    }

    mapaNexus = new maplibregl.Map({
        container: elemento,
        style: ESTILOS.dia,
        center: CENTRO_RECIFE,
        zoom: 13.5,
        pitch: 58,
        bearing: -15,
        maxPitch: 85,
        minZoom: 10,
        maxZoom: 20,
        antialias: true,
        attributionControl: true
    });

    mapaNexus.addControl(
        new maplibregl.NavigationControl({
            visualizePitch: true,
            showZoom: true,
            showCompass: true
        }),
        "top-right"
    );

    mapaNexus.addControl(
        new maplibregl.ScaleControl({
            maxWidth: 120,
            unit: "metric"
        }),
        "bottom-left"
    );

    mapaNexus.on("load", () => {
        adicionarEdificios3D();

        mapaNexus.setPitch(58);

        const evento = new CustomEvent("nexus-map-ready");
        document.dispatchEvent(evento);
    });

    mapaNexus.on("error", evento => {
        console.warn("NEXUS MapLibre:", evento.error?.message || evento);
    });

    window.NEXUS_MAP = mapaNexus;

    return mapaNexus;
}

function atualizarObras(obras) {
    if (!mapaNexus) return;

    if (!mapaNexus.loaded()) {
        mapaNexus.once("load", () => adicionarMarcadores(obras));
        return;
    }

    adicionarMarcadores(obras);
}

function alterarCamada(nome, ativada) {
    if (!(nome in camadasAtivas)) return;

    camadasAtivas[nome] = Boolean(ativada);

    controlarCamadas();
}

function obterMapa() {
    return mapaNexus;
}

function obterCamadas() {
    return { ...camadasAtivas };
}

export {
    iniciarMapa,
    atualizarObras,
    localizarObra,
    localizarRecife,
    alterarTema,
    alterarCamada,
    obterMapa,
    obterCamadas
};