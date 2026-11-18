
/* ==========================================================
   NEXUS 3.0 — CONTROLADOR PRINCIPAL
   Pesquisa + Gerenciamento + Indicadores + Atividades
   ========================================================== */

(() => {

    "use strict";


    /* ======================================================
       1. CONFIGURAÇÕES E ESTADO
    ====================================================== */

    const CONFIG =
        window.NEXUS_CONFIG || {};


    const STORAGE =
        window.NEXUS_STORAGE;


    if (!STORAGE) {

        console.error(
            "[NEXUS] O armazenamento não foi carregado."
        );

        return;

    }


    const HISTORY_KEY =
        CONFIG.STORAGE?.HISTORY_KEY ||
        "nexus_search_history_v2";


    const ACTIVITY_KEY =
        CONFIG.STORAGE?.ACTIVITY_KEY ||
        "nexus_activity_v3";


    const $ = id =>
        document.getElementById(id);


    let obras =
        STORAGE.getObras();


    let searchTimer = null;

    let searchController = null;

    let mapReady = false;


    /* ======================================================
       2. FUNÇÕES AUXILIARES
    ====================================================== */

    function normalize(value) {

        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    }


    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"

            })[character]
        );

    }


    function today() {

        const now =
            new Date();


        const local =
            new Date(
                now.getTime() -
                now.getTimezoneOffset() * 60000
            );


        return local.toISOString().slice(0, 10);

    }


    function addDays(dateString, amount) {

        const date =
            new Date(`${dateString}T12:00:00`);


        date.setDate(
            date.getDate() + amount
        );


        const year =
            date.getFullYear();


        const month =
            String(date.getMonth() + 1).padStart(2, "0");


        const day =
            String(date.getDate()).padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    function formatDate(value) {

        if (!value) {
            return "Não informado";
        }


        const date =
            new Date(`${value}T12:00:00`);


        if (Number.isNaN(date.getTime())) {
            return "Data inválida";
        }


        return new Intl.DateTimeFormat(
            "pt-BR"
        ).format(date);

    }


    function generateId() {

        if (window.crypto?.randomUUID) {

            return `obra-${window.crypto.randomUUID()}`;

        }


        return `obra-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;

    }


    function statusColor(status) {

        if (status === "Concluída") {
            return "#79B66B";
        }

        if (status === "Planejamento") {
            return "#50A9D3";
        }

        return "#19B6A1";

    }


    function statusClass(status) {

        if (status === "Concluída") {
            return "concluida";
        }

        if (status === "Planejamento") {
            return "planejamento";
        }

        return "andamento";

    }


    function refreshData() {

        obras =
            STORAGE.getObras();


        window.NEXUS_OBRAS =
            obras;

    }


    function isMapReady() {

        return Boolean(

            mapReady &&

            window.NEXUS_MAPA &&

            window.NEXUS_MAPA.map

        );

    }


    function updateMapMarkers() {

        if (!isMapReady()) {
            return;
        }


        window.NEXUS_MAPA.refreshObras(obras);


        window.NEXUS_MAPA.filtrarObras(

            $("filtroStatus")?.value || "Todas"

        );

    }


    /* ======================================================
       3. HISTÓRICO DE ATIVIDADES
    ====================================================== */

    function getActivities() {

        try {

            const value =
                JSON.parse(
                    localStorage.getItem(ACTIVITY_KEY) || "[]"
                );


            return Array.isArray(value)
                ? value
                : [];


        } catch (error) {

            console.warn(
                "[NEXUS] Histórico de atividades inválido:",
                error
            );


            return [];

        }

    }


    function saveActivity(action, name, description) {

        const list =
            getActivities();


        list.unshift({

            id:
                generateId(),

            action,

            name,

            description,

            date:
                new Date().toISOString()

        });


        const max =
            CONFIG.LIMITS?.MAX_ACTIVITY || 20;


        try {

            localStorage.setItem(

                ACTIVITY_KEY,

                JSON.stringify(
                    list.slice(0, max)
                )

            );

        } catch (error) {

            console.warn(
                "[NEXUS] Não foi possível salvar a atividade:",
                error
            );

        }


        renderActivities();

    }


    function renderActivities() {

        const container =
            $("recentUpdates");


        if (!container) return;


        const activities =
            getActivities();


        if (!activities.length) {

            container.innerHTML = `

                <div class="empty-history">

                    Nenhuma atualização registrada ainda.

                </div>

            `;

            return;

        }


        container.innerHTML =
            activities.slice(0, 8).map(item => {

                const actionText = {

                    create: "Construção cadastrada",

                    update: "Construção atualizada",

                    delete: "Construção removida"

                };


                const icon = {

                    create: "＋",

                    update: "↻",

                    delete: "×"

                };


                const date =
                    new Date(item.date);


                const formatted =
                    Number.isNaN(date.getTime())
                        ? ""
                        : new Intl.DateTimeFormat(
                            "pt-BR",
                            {
                                dateStyle: "short",
                                timeStyle: "short"
                            }
                        ).format(date);


                return `

                    <div class="activity-item">

                        <div class="activity-icon">

                            ${icon[item.action] || "•"}

                        </div>


                        <div class="activity-copy">

                            <strong>

                                ${escapeHTML(
                                    actionText[item.action] ||
                                    "Atividade registrada"
                                )}

                            </strong>


                            <p>

                                ${escapeHTML(item.name)}

                                ${item.description
                                    ? " · " + escapeHTML(item.description)
                                    : ""
                                }

                            </p>

                        </div>


                        <span class="activity-date">

                            ${escapeHTML(formatted)}

                        </span>

                    </div>

                `;

            }).join("");

    }


    /* ======================================================
       4. INDICADORES PRINCIPAIS
    ====================================================== */

    function renderKpis() {

        const total =
            obras.length;


        const active =
            obras.filter(
                item => item.etapa === "Em andamento"
            ).length;


        const planning =
            obras.filter(
                item => item.etapa === "Planejamento"
            ).length;


        const completed =
            obras.filter(
                item => item.etapa === "Concluída"
            ).length;


        const average = total

            ? Math.round(

                obras.reduce(

                    (sum, item) => {

                        return sum +
                            (Number(item.progresso) || 0);

                    },

                    0

                ) / total

            )

            : 0;


        const values = {

            kpiTotal: total,

            kpiActive: active,

            kpiPlanning: planning,

            kpiCompleted: completed,

            kpiAverage: `${average}%`,

            totalObras: total,

            navWorksCount: total,

            averageProgress: `${average}%`,

            analyticsTotal: total,

            donutTotal: total

        };


        Object.entries(values).forEach(
            ([id, value]) => {

                const element = $(id);

                if (element) {
                    element.textContent = value;
                }

            }
        );


        renderStatusChart({
            total,
            active,
            planning,
            completed
        });


        renderCategoryChart();

    }


    /* ======================================================
       5. GRÁFICO DE SITUAÇÃO
    ====================================================== */

    function renderStatusChart(data) {

        const chart =
            $("statusChart");


        const legend =
            $("statusLegend");


        if (!chart || !legend) return;


        const segments = [

            {
                label: "Em andamento",

                value: data.active,

                color: "#19B6A1"

            },

            {
                label: "Planejamento",

                value: data.planning,

                color: "#50A9D3"

            },

            {
                label: "Concluídas",

                value: data.completed,

                color: "#79B66B"

            }

        ];


        if (data.total === 0) {

            chart.style.background =
                "conic-gradient(#29444D 0 100%)";

        } else {

            let current = 0;


            const gradient =
                segments.map(segment => {

                    const percentage =
                        segment.value / data.total * 100;


                    const start =
                        current;


                    current += percentage;


                    return `${segment.color} ${start}% ${current}%`;

                });


            chart.style.background =
                `conic-gradient(${gradient.join(", ")})`;

        }


        legend.innerHTML =
            segments.map(segment => `

                <div class="chart-legend-item">

                    <i style="background:${segment.color}"></i>

                    <span>

                        ${segment.label}

                        (${segment.value})

                    </span>

                </div>

            `).join("");

    }


    /* ======================================================
       6. GRÁFICO DE CATEGORIAS
    ====================================================== */

    function renderCategoryChart() {

        const container =
            $("categoryChart");


        if (!container) return;


        const categories = {};


        obras.forEach(obra => {

            const category =
                obra.categoria || "Sem categoria";


            categories[category] =
                (categories[category] || 0) + 1;

        });


        const entries =
            Object.entries(categories)
                .sort((a, b) => b[1] - a[1]);


        if (!entries.length) {

            container.innerHTML = `

                <div class="empty-history">

                    Nenhuma categoria cadastrada.

                </div>

            `;

            return;

        }


        const maximum =
            Math.max(
                1,
                ...entries.map(item => item[1])
            );


        container.innerHTML =
            entries.map(([category, quantity]) => {

                const width =
                    quantity / maximum * 100;


                return `

                    <div class="category-row">

                        <span class="category-name">

                            ${escapeHTML(category)}

                        </span>


                        <div class="category-bar">

                            <span style="width:${width}%"></span>

                        </div>


                        <strong class="category-count">

                            ${quantity}

                        </strong>

                    </div>

                `;

            }).join("");

    }


    /* ======================================================
       7. RENDERIZAR CARTÕES DE OBRAS
    ====================================================== */

    function renderWorks() {

        const container =
            $("listaObras");


        if (!container) return;


        const filter =
            $("filtroStatus")?.value || "Todas";


        const filtered =
            obras.filter(obra => {

                return (

                    filter === "Todas" ||

                    obra.etapa === filter

                );

            });


        if (!filtered.length) {

            container.innerHTML = `

                <div class="empty-history">

                    Nenhuma construção nesta situação.

                </div>

            `;

            return;

        }


        container.innerHTML =
            filtered.map(obra => {

                const progress = Math.max(

                    0,

                    Math.min(
                        100,
                        Number(obra.progresso) || 0
                    )

                );


                return `

                    <article

                        class="work-card"

                        data-work-id="${escapeHTML(obra.id)}"

                        tabindex="0"

                        role="button"

                    >

                        <div class="work-card-main">

                            <div class="work-card-title">

                                <h3>

                                    ${escapeHTML(obra.nome)}

                                </h3>


                                <span class="work-code">

                                    ${escapeHTML(obra.codigo || "")}

                                </span>

                            </div>


                            <p>

                                ${escapeHTML(obra.bairro)}

                                ·

                                ${escapeHTML(obra.categoria)}

                            </p>

                        </div>



                        <div class="work-card-side">


                            <span class="status-pill ${statusClass(obra.etapa)}">

                                ${escapeHTML(obra.etapa)}

                            </span>


                            <div class="work-progress">


                                <div class="work-progress-track">

                                    <span style="width:${progress}%"></span>

                                </div>


                                <strong>

                                    ${progress}%

                                </strong>

                            </div>


                        </div>



                        <div class="work-actions">


                            <a

                                href="lugar.html?id=${encodeURIComponent(obra.id)}"

                                aria-label="Abrir detalhes de ${escapeHTML(obra.nome)}"

                            >

                                Detalhes

                            </a>


                            <button

                                type="button"

                                data-action="edit"

                                data-id="${escapeHTML(obra.id)}"

                            >

                                Editar

                            </button>


                            <button

                                type="button"

                                class="delete-work"

                                data-action="delete"

                                data-id="${escapeHTML(obra.id)}"

                            >

                                Excluir

                            </button>


                        </div>


                    </article>

                `;

            }).join("");


        // Clique em cada cartão.
        container.querySelectorAll(
            ".work-card"
        ).forEach(card => {

            function selectCard() {

                const id =
                    card.dataset.workId;


                document.querySelectorAll(
                    ".work-card"
                ).forEach(item => {

                    item.classList.toggle(

                        "selected",

                        item === card

                    );

                });


                if (isMapReady()) {

                    window.NEXUS_MAPA.focarObra(
                        id,
                        true
                    );

                }

            }


            card.addEventListener("click", event => {

                if (event.target.closest("a, button")) {
                    return;
                }


                selectCard();

            });


            card.addEventListener("keydown", event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    selectCard();

                }

            });

        });


        // Botão editar.
        container.querySelectorAll(
            "[data-action='edit']"
        ).forEach(button => {

            button.addEventListener("click", () => {

                editWork(
                    button.dataset.id
                );

            });

        });


        // Botão excluir.
        container.querySelectorAll(
            "[data-action='delete']"
        ).forEach(button => {

            button.addEventListener("click", () => {

                deleteWork(
                    button.dataset.id
                );

            });

        });

    }


    function highlightCard(id) {

        document.querySelectorAll(
            ".work-card"
        ).forEach(card => {

            card.classList.toggle(

                "selected",

                card.dataset.workId === id

            );

        });

    }


    /* ======================================================
       8. MODAL
    ====================================================== */

    function openModal() {

        const modal =
            $("workModal");


        if (!modal) return;


        modal.hidden = false;


        document.body.style.overflow =
            "hidden";


        $("workName")?.focus();

    }


    function closeModal() {

        const modal =
            $("workModal");


        if (!modal) return;


        modal.hidden = true;


        document.body.style.overflow =
            "";


        $("workForm")?.reset();


        $("workId").value =
            "";


        $("photoHint").textContent =
            "Até 12 imagens por envio, máximo de 8 MB por arquivo.";

    }


    function setDefaultDates() {

        const start =
            today();


        $("workStartDate").value =
            start;


        $("workExecutionDate").value =
            addDays(start, 30);


        $("workDeliveryDate").value =
            addDays(start, 120);

    }


    /* ======================================================
       9. ABRIR FORMULÁRIO DE NOVA OBRA
    ====================================================== */

    function newWork() {

        $("workForm").reset();


        $("workId").value =
            "";


        $("workModalTitle").textContent =
            "Cadastrar nova construção";


        $("saveWorkButton").textContent =
            "Salvar construção";


        $("workStatus").value =
            "Planejamento";


        $("workProgress").value =
            "0";


        setDefaultDates();


        openModal();

    }


    /* ======================================================
       10. ABRIR FORMULÁRIO DE EDIÇÃO
    ====================================================== */

    async function editWork(id) {

        const work =
            STORAGE.getObra(id);


        if (!work) {

            alert(
                "Não foi possível localizar essa construção."
            );

            return;

        }


        $("workForm").reset();


        $("workId").value =
            work.id;


        $("workName").value =
            work.nome || "";


        $("workCategory").value =
            work.categoria || "Residencial";


        $("workStatus").value =
            work.etapa || "Planejamento";


        $("workNeighborhood").value =
            work.bairro || "";


        $("workResponsible").value =
            work.responsavel || "";


        $("workAddress").value =
            work.endereco || "";


        $("workLat").value =
            work.latitude;


        $("workLon").value =
            work.longitude;


        $("workProgress").value =
            Number(work.progresso) || 0;


        $("workDescription").value =
            work.descricao || "";


        const start =
            work.dataInicio || today();


        $("workStartDate").value =
            start;


        $("workExecutionDate").value =
            work.dataExecucao || addDays(start, 30);


        $("workDeliveryDate").value =
            work.dataEntrega || addDays(start, 120);


        $("workModalTitle").textContent =
            "Editar construção";


        $("saveWorkButton").textContent =
            "Salvar alterações";


        try {

            const photos =
                await STORAGE.getFotos(work.id);


            $("photoHint").textContent =

                `${photos.length} fotografia(s) já cadastrada(s). Novas imagens serão adicionadas.`;

        } catch (error) {

            console.warn(
                "[NEXUS] Não foi possível consultar a galeria:",
                error
            );

        }


        openModal();

    }


    /* ======================================================
       11. MONTAR CRONOGRAMA AUTOMATICAMENTE
    ====================================================== */

    function buildSchedule(data, previousSchedule) {

        const previous =
            Array.isArray(previousSchedule)
                ? previousSchedule
                : [];


        const statusPlanning =

            data.etapa === "Planejamento"
                ? "Em andamento"
                : "Concluída";


        const statusExecution =

            data.etapa === "Planejamento"
                ? "Pendente"

                : data.etapa === "Em andamento"
                    ? "Em andamento"
                    : "Concluída";


        const statusDelivery =

            data.etapa === "Concluída"
                ? "Concluída"
                : "Pendente";


        const defaults = [

            {

                titulo: "Planejamento",

                data: data.dataInicio,

                status: statusPlanning,

                descricao:
                    "Etapa de preparação e organização do projeto."

            },

            {

                titulo: "Execução",

                data: data.dataExecucao,

                status: statusExecution,

                descricao:
                    "Etapa de execução e acompanhamento da construção."

            },

            {

                titulo: "Entrega",

                data: data.dataEntrega,

                status: statusDelivery,

                descricao:
                    "Previsão de finalização e entrega do empreendimento."

            }

        ];


        return defaults.map((item, index) => {

            return {

                ...item,

                ...(previous[index] || {}),

                titulo: item.titulo,

                data: item.data,

                status: item.status

            };

        });

    }


    /* ======================================================
       12. VALIDAR FORMULÁRIO
    ====================================================== */

    function validateForm(data) {

        if (!data.nome.trim()) {

            throw new Error(
                "Informe o nome da construção."
            );

        }


        if (!data.bairro.trim()) {

            throw new Error(
                "Informe o bairro."
            );

        }


        if (!data.endereco.trim()) {

            throw new Error(
                "Informe o endereço completo."
            );

        }


        if (
            !Number.isFinite(data.latitude) ||
            data.latitude < -90 ||
            data.latitude > 90
        ) {

            throw new Error(
                "Informe uma latitude válida."
            );

        }


        if (
            !Number.isFinite(data.longitude) ||
            data.longitude < -180 ||
            data.longitude > 180
        ) {

            throw new Error(
                "Informe uma longitude válida."
            );

        }


        if (
            !Number.isFinite(data.progresso) ||
            data.progresso < 0 ||
            data.progresso > 100
        ) {

            throw new Error(
                "O progresso deve estar entre 0 e 100."
            );

        }


        if (
            data.dataInicio &&
            data.dataExecucao &&
            data.dataExecucao < data.dataInicio
        ) {

            throw new Error(
                "O início da execução não pode anteceder o início do projeto."
            );

        }


        if (
            data.dataExecucao &&
            data.dataEntrega &&
            data.dataEntrega < data.dataExecucao
        ) {

            throw new Error(
                "A entrega prevista não pode anteceder o início da execução."
            );

        }

    }


    /* ======================================================
       13. SALVAR CONSTRUÇÃO
    ====================================================== */

    async function saveWork(event) {

        event.preventDefault();


        const button =
            $("saveWorkButton");


        button.disabled = true;

        button.textContent =
            "Salvando...";


        let savedWork = null;

        let wasNew = false;


        try {

            const oldId =
                $("workId").value.trim();


            const oldWork =
                oldId
                    ? STORAGE.getObra(oldId)
                    : null;


            const progress =
                Number($("workProgress").value);


            const status =
                $("workStatus").value;


            const data = {

                id:
                    oldId || generateId(),

                codigo:
                    oldWork?.codigo ||
                    `NXS-${String(Date.now()).slice(-7)}`,

                nome:
                    $("workName").value.trim(),

                categoria:
                    $("workCategory").value,

                etapa:
                    status,

                bairro:
                    $("workNeighborhood").value.trim(),

                endereco:
                    $("workAddress").value.trim(),

                latitude:
                    Number($("workLat").value),

                longitude:
                    Number($("workLon").value),

                responsavel:
                    $("workResponsible").value.trim(),

                descricao:
                    $("workDescription").value.trim(),

                progresso:
                    status === "Concluída"
                        ? 100
                        : progress,

                cor:
                    statusColor(status),

                dataInicio:
                    $("workStartDate").value,

                dataExecucao:
                    $("workExecutionDate").value,

                dataEntrega:
                    $("workDeliveryDate").value,

                criadoEm:
                    oldWork?.criadoEm ||
                    new Date().toISOString()

            };


            validateForm(data);


            data.cronograma =
                buildSchedule(
                    data,
                    oldWork?.cronograma
                );


            const files =
                $("workPhotos").files;


            wasNew =
                !oldWork;


            // Primeiro salva o registro.
            savedWork =
                STORAGE.saveObra(data);


            // Depois armazena as fotografias.
            if (files && files.length) {

                await STORAGE.addFotos(
                    savedWork.id,
                    files
                );

            }


            saveActivity(

                wasNew ? "create" : "update",

                savedWork.nome,

                savedWork.bairro

            );


            refreshData();

            renderAll();

            updateMapMarkers();


            closeModal();


            alert(

                wasNew

                    ? "Construção cadastrada com sucesso."

                    : "Construção atualizada com sucesso."

            );


        } catch (error) {

            console.error(
                "[NEXUS] Erro ao salvar construção:",
                error
            );


            if (savedWork) {

                alert(

                    "A construção foi salva, mas houve um problema com as fotografias:\n\n" +

                    error.message

                );

            } else {

                alert(
                    error.message ||
                    "Não foi possível salvar a construção."
                );

            }

        } finally {

            button.disabled = false;


            button.textContent =

                $("workId").value

                    ? "Salvar alterações"

                    : "Salvar construção";

        }

    }


    /* ======================================================
       14. EXCLUIR CONSTRUÇÃO
    ====================================================== */

    async function deleteWork(id) {

        const work =
            STORAGE.getObra(id);


        if (!work) return;


        const confirmed =
            confirm(

                `Deseja realmente excluir "${work.nome}"?\n\n` +

                "As fotografias relacionadas também serão removidas deste navegador."

            );


        if (!confirmed) return;


        try {

            STORAGE.deleteObra(id);


            await STORAGE.deleteFotosObra(id);


            saveActivity(
                "delete",
                work.nome,
                work.bairro
            );


            refreshData();

            renderAll();

            updateMapMarkers();


            alert(
                "Construção excluída com sucesso."
            );


        } catch (error) {

            console.error(
                "[NEXUS] Falha na exclusão:",
                error
            );


            alert(
                error.message ||
                "Não foi possível excluir a construção."
            );

        }

    }


    /* ======================================================
       15. PESQUISA LOCAL DAS OBRAS
    ====================================================== */

    function searchLocalWorks(query) {

        const term =
            normalize(query);


        return obras

            .filter(obra => {

                const text =
                    normalize([

                        obra.nome,

                        obra.codigo,

                        obra.bairro,

                        obra.categoria,

                        obra.endereco,

                        obra.etapa,

                        obra.responsavel

                    ].join(" "));


                return text.includes(term);

            })


            .map(obra => ({

                type: "obra",

                id: obra.id,

                label: obra.nome,

                subtitle:
                    `${obra.bairro} · ${obra.etapa}`,

                lat: obra.latitude,

                lon: obra.longitude

            }));

    }


    /* ======================================================
       16. PESQUISA EXTERNA DE LOCAIS
    ====================================================== */

    async function searchExternalPlaces(query) {

        if (searchController) {

            searchController.abort();

        }


        searchController =
            new AbortController();


        const url = new URL(

            CONFIG.SEARCH?.ENDPOINT ||

            "https://photon.komoot.io/api/"

        );


        url.searchParams.set(

            "q",

            `${query}, Recife, Pernambuco, Brasil`

        );


        url.searchParams.set(
            "lat",
            String(CONFIG.SEARCH?.CENTER_LAT || -8.0476)
        );


        url.searchParams.set(
            "lon",
            String(CONFIG.SEARCH?.CENTER_LON || -34.8770)
        );


        url.searchParams.set(
            "limit",
            String(CONFIG.SEARCH?.LIMIT || 7)
        );


        url.searchParams.set(
            "lang",
            "pt"
        );


        try {

            const response =
                await fetch(

                    url.toString(),

                    {

                        signal: searchController.signal

                    }

                );


            if (!response.ok) {

                throw new Error(
                    `Pesquisa respondeu com HTTP ${response.status}.`
                );

            }


            const data =
                await response.json();


            return (data.features || [])

                .map(feature => {

                    const properties =
                        feature.properties || {};


                    const coordinates =
                        feature.geometry?.coordinates || [];


                    const longitude =
                        Number(coordinates[0]);


                    const latitude =
                        Number(coordinates[1]);


                    const name =

                        properties.name ||

                        properties.street ||

                        properties.city ||

                        "Local encontrado";


                    const subtitle = [

                        properties.street,

                        properties.district ||

                        properties.suburb,

                        properties.city

                    ]

                    .filter(Boolean)

                    .join(", ");


                    return {

                        type: "place",

                        label: name,

                        subtitle:
                            subtitle || "Localização na região do Recife",

                        lat: latitude,

                        lon: longitude

                    };

                })


                .filter(place => {

                    // Área aproximada da Região Metropolitana.
                    return (

                        Number.isFinite(place.lat) &&

                        Number.isFinite(place.lon) &&

                        place.lat >= -8.35 &&

                        place.lat <= -7.85 &&

                        place.lon >= -35.15 &&

                        place.lon <= -34.65

                    );

                });


        } catch (error) {

            if (error.name !== "AbortError") {

                console.warn(
                    "[NEXUS] Pesquisa externa indisponível:",
                    error
                );

            }


            return [];

        }

    }


    /* ======================================================
       17. SUGESTÕES DE PESQUISA
    ====================================================== */

    function renderSuggestions(results) {

        const container =
            $("searchSuggestions");


        if (!container) return;


        if (!results.length) {

            container.innerHTML = `

                <div class="suggestion-item">

                    <span class="suggestion-icon">⌕</span>

                    <span class="suggestion-copy">

                        <strong>Nenhum resultado encontrado</strong>

                        <small>
                            Experimente outro termo.
                        </small>

                    </span>

                </div>

            `;


            container.hidden = false;

            return;

        }


        container.innerHTML =
            results.map((item, index) => `

                <button

                    class="suggestion-item"

                    type="button"

                    data-result-index="${index}"

                >

                    <span class="suggestion-icon">

                        ${item.type === "obra" ? "▦" : "⌖"}

                    </span>


                    <span class="suggestion-copy">

                        <strong>

                            ${escapeHTML(item.label)}

                        </strong>


                        <small>

                            ${escapeHTML(item.subtitle)}

                        </small>

                    </span>

                </button>

            `).join("");


        container.hidden = false;


        container.querySelectorAll(
            "[data-result-index]"
        ).forEach(button => {

            button.addEventListener("click", () => {

                const item =
                    results[
                        Number(button.dataset.resultIndex)
                    ];


                selectSearchResult(item);

            });

        });

    }


    /* ======================================================
       18. HISTÓRICO DE PESQUISA
    ====================================================== */

    function getSearchHistory() {

        try {

            const value =
                JSON.parse(
                    localStorage.getItem(HISTORY_KEY) || "[]"
                );


            return Array.isArray(value)
                ? value.slice(0, 8)
                : [];


        } catch {

            return [];

        }

    }


    function saveSearchHistory(item) {

        const history =
            getSearchHistory();


        const filtered =
            history.filter(record => {

                return normalize(record.label) !==
                    normalize(item.label);

            });


        filtered.unshift({

            type: item.type,

            id: item.id,

            label: item.label,

            subtitle: item.subtitle,

            lat: item.lat,

            lon: item.lon,

            date: new Date().toISOString()

        });


        localStorage.setItem(

            HISTORY_KEY,

            JSON.stringify(

                filtered.slice(
                    0,
                    CONFIG.LIMITS?.MAX_HISTORY || 8
                )

            )

        );


        renderSearchHistory();

    }


    function renderSearchHistory() {

        const container =
            $("searchHistory");


        if (!container) return;


        const history =
            getSearchHistory();


        if (!history.length) {

            container.innerHTML = `

                <div class="empty-history">

                    Nenhuma pesquisa recente.

                </div>

            `;

            return;

        }


        container.innerHTML =
            history.map((item, index) => `

                <button

                    class="history-item"

                    type="button"

                    data-history-index="${index}"

                >

                    <span>↗</span>

                    <span>
                        ${escapeHTML(item.label)}
                    </span>

                </button>

            `).join("");


        container.querySelectorAll(
            "[data-history-index]"
        ).forEach(button => {

            button.addEventListener("click", () => {

                const item =
                    history[
                        Number(button.dataset.historyIndex)
                    ];


                if (item) {
                    selectSearchResult(item);
                }

            });

        });

    }


    /* ======================================================
       19. SELECIONAR PESQUISA
    ====================================================== */

    function selectSearchResult(item) {

        if (!item) return;


        if (!isMapReady()) {

            alert(
                "Aguarde o mapa terminar de carregar."
            );

            return;

        }


        if (item.type === "obra") {

            window.NEXUS_MAPA.focarObra(
                item.id,
                true
            );


            highlightCard(item.id);


        } else {

            window.NEXUS_MAPA.focarLocal({

                lat: item.lat,

                lon: item.lon,

                label: item.label

            });

        }


        saveSearchHistory(item);


        $("searchInput").value =
            item.label;


        $("searchSuggestions").hidden =
            true;

    }


    /* ======================================================
       20. EXECUTAR PESQUISA
    ====================================================== */

    async function executeSearch(query) {

        const term =
            query.trim();


        const localResults =
            searchLocalWorks(term);


        renderSuggestions(
            localResults
        );


        const externalResults =
            await searchExternalPlaces(term);


        if (

            normalize($("searchInput").value) !==

            normalize(term)

        ) {

            return;

        }


        const merged = [

            ...localResults,

            ...externalResults.filter(external => {

                return !localResults.some(local => {

                    return normalize(local.label) ===
                        normalize(external.label);

                });

            })

        ].slice(0, 12);


        renderSuggestions(merged);

    }


    /* ======================================================
       21. CONFIGURAR PESQUISA
    ====================================================== */

    function configureSearch() {

        const input =
            $("searchInput");


        if (!input) return;


        input.addEventListener("input", () => {

            const query =
                input.value.trim();


            clearTimeout(searchTimer);


            if (query.length < 2) {

                $("searchSuggestions").hidden = true;

                return;

            }


            searchTimer = setTimeout(() => {

                executeSearch(query);

            }, 350);

        });


        input.addEventListener("keydown", event => {

            if (event.key === "Escape") {

                $("searchSuggestions").hidden = true;

            }


            if (event.key === "Enter") {

                event.preventDefault();


                const first =
                    $("searchSuggestions")
                        .querySelector("[data-result-index]");


                if (first) {

                    first.click();

                } else if (input.value.trim().length >= 2) {

                    executeSearch(input.value.trim());

                }

            }

        });


        $("clearSearch")?.addEventListener("click", () => {

            input.value = "";

            $("searchSuggestions").hidden = true;

            input.focus();

        });


        $("clearHistory")?.addEventListener("click", () => {

            localStorage.removeItem(HISTORY_KEY);

            renderSearchHistory();

        });


        document.addEventListener("click", event => {

            if (!event.target.closest(".search-section")) {

                $("searchSuggestions").hidden = true;

            }

        });

    }


    /* ======================================================
       22. FILTROS
    ====================================================== */

    function configureFilters() {

        $("filtroStatus")?.addEventListener(
            "change",
            event => {

                renderWorks();


                if (isMapReady()) {

                    window.NEXUS_MAPA.filtrarObras(
                        event.target.value
                    );

                }

            }
        );

    }


    /* ======================================================
       23. FORMULÁRIO DE CADASTRO
    ====================================================== */

    function configureModal() {

        $("openWorkModal")?.addEventListener(
            "click",
            newWork
        );


        $("openWorkModalTop")?.addEventListener(
            "click",
            newWork
        );


        $("closeWorkModal")?.addEventListener(
            "click",
            closeModal
        );


        $("cancelWorkModal")?.addEventListener(
            "click",
            closeModal
        );


        $("workForm")?.addEventListener(
            "submit",
            saveWork
        );


        $("workModal")?.addEventListener(
            "click",
            event => {

                if (event.target.id === "workModal") {

                    closeModal();

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (

                    event.key === "Escape" &&

                    $("workModal") &&

                    !$("workModal").hidden

                ) {

                    closeModal();

                }

            }
        );

    }


    /* ======================================================
       24. RECARREGAR A INTERFACE
    ====================================================== */

    function renderAll() {

        refreshData();

        renderKpis();

        renderWorks();

        renderSearchHistory();

        renderActivities();

    }


    /* ======================================================
       25. MUDANÇAS NO ARMAZENAMENTO
    ====================================================== */

    function observeStorage() {

        window.addEventListener(
            "nexus-storage-change",
            () => {

                refreshData();

                renderAll();

            }
        );

    }


    /* ======================================================
       26. RELÓGIO E DATA
    ====================================================== */

    function configureClock() {

        function update() {

            const clock =
                $("clock");


            if (clock) {

                clock.textContent =

                    new Intl.DateTimeFormat(

                        "pt-BR",

                        {

                            timeZone: "America/Recife",

                            hour: "2-digit",

                            minute: "2-digit",

                            second: "2-digit",

                            hour12: false

                        }

                    ).format(new Date());

            }


            const date =
                $("currentDate");


            if (date) {

                date.textContent =

                    new Intl.DateTimeFormat(

                        "pt-BR",

                        {

                            timeZone: "America/Recife",

                            dateStyle: "long"

                        }

                    ).format(new Date());

            }

        }


        update();

        setInterval(update, 1000);

    }


    /* ======================================================
       27. TELA CHEIA
    ====================================================== */

    function configureFullscreen() {

        $("fullscreenBtn")?.addEventListener(
            "click",
            async () => {

                try {

                    if (!document.fullscreenElement) {

                        await document.documentElement.requestFullscreen();

                    } else {

                        await document.exitFullscreen();

                    }


                    window.NEXUS_MAPA?.map?.resize();

                } catch (error) {

                    console.warn(
                        "[NEXUS] Erro em tela cheia:",
                        error
                    );

                }

            }
        );


        document.addEventListener(
            "fullscreenchange",
            () => {

                window.NEXUS_MAPA?.map?.resize();

            }
        );

    }


    /* ======================================================
       28. NAVEGAÇÃO DA PÁGINA
    ====================================================== */

    function configureNavigation() {

        document.querySelectorAll(
            ".nav-link"
        ).forEach(link => {

            link.addEventListener("click", () => {

                document.querySelectorAll(
                    ".nav-link"
                ).forEach(item => {

                    item.classList.remove("active");

                });


                link.classList.add("active");

            });

        });

    }


    /* ======================================================
       29. MAPA PRONTO
    ====================================================== */

    function configureMapEvents() {

        window.addEventListener(
            "nexus-map-ready",
            () => {

                mapReady = true;


                const dot =
                    $("connectionDot");


                dot?.classList.add("connected");


                const label =
                    $("connectionLabel");


                if (label) {

                    label.textContent =
                        "MAPA CONECTADO";

                }


                refreshData();

                updateMapMarkers();


                const requestedWork =
                    new URLSearchParams(
                        window.location.search
                    ).get("obra");


                if (requestedWork) {

                    setTimeout(() => {

                        window.NEXUS_MAPA.focarObra(
                            requestedWork,
                            true
                        );


                        highlightCard(requestedWork);

                    }, 500);

                }

            }
        );


        window.addEventListener(
            "nexus-work-selected",
            event => {

                highlightCard(
                    event.detail?.id
                );

            }
        );

    }


    /* ======================================================
       30. INICIALIZAÇÃO
    ====================================================== */

    function start() {

        refreshData();

        renderAll();

        configureSearch();

        configureFilters();

        configureModal();

        configureClock();

        configureFullscreen();

        configureNavigation();

        configureMapEvents();

        observeStorage();


        console.info(
            "[NEXUS] Interface inicializada."
        );


        console.info(
            `[NEXUS] ${obras.length} construções cadastradas.`
        );

    }


    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            { once: true }
        );

    } else {

        start();

    }


})();

/* ============================================================
   NEXUS — CORREÇÃO DA JANELA E MODO DIA/NOITE
   ============================================================ */

(function () {
    "use strict";

    /* --------------------------------------------------------
       1. LOCALIZAÇÃO DA JANELA DE CADASTRO
       -------------------------------------------------------- */

    function localizarJanelaCadastro() {
        const seletores = [
            '[role="dialog"]',
            '.modal-overlay',
            '.modal-backdrop',
            '.modal-container',
            '.modal',
            '[class*="modal"]',
            '[id*="modal"]'
        ];

        const elementos = document.querySelectorAll(seletores.join(","));

        for (const elemento of elementos) {
            const texto = (elemento.innerText || "").toLowerCase();

            if (
                texto.includes("nova construção") ||
                texto.includes("nova construcao") ||
                texto.includes("nexus project management")
            ) {
                return elemento;
            }
        }

        return null;
    }

    /* --------------------------------------------------------
       2. FECHAMENTO DA JANELA
       -------------------------------------------------------- */

    function fecharJanelaCadastro() {
        const janela = localizarJanelaCadastro();

        if (!janela) {
            console.warn("NEXUS: janela de cadastro não localizada.");
            return;
        }

        janela.style.display = "none";
        janela.style.visibility = "hidden";
        janela.style.opacity = "0";
        janela.style.pointerEvents = "none";
        janela.setAttribute("aria-hidden", "true");

        /*
         * Se a janela estiver dentro de um fundo escurecido,
         * escondemos também esse fundo.
         */
        const fundo = janela.closest(
            '.modal-overlay, .modal-backdrop, .overlay'
        );

        if (fundo && fundo !== janela) {
            fundo.style.display = "none";
            fundo.setAttribute("aria-hidden", "true");
        }

        document.body.classList.remove("modal-aberto");
        document.body.classList.remove("modal-open");

        console.log("NEXUS: janela de cadastro fechada.");
    }

    /* --------------------------------------------------------
       3. RECONHECIMENTO DO BOTÃO X
       -------------------------------------------------------- */

    document.addEventListener("click", function (evento) {
        const botao = evento.target.closest("button, [role='button']");

        if (!botao) return;

        const texto = (botao.innerText || "").trim().toLowerCase();
        const aria = (
            botao.getAttribute("aria-label") || ""
        ).toLowerCase();

        const titulo = (
            botao.getAttribute("title") || ""
        ).toLowerCase();

        const classe = (
            typeof botao.className === "string"
                ? botao.className
                : ""
        ).toLowerCase();

        const pareceBotaoFechar =
            ["x", "×", "✕", "✖"].includes(texto) ||
            aria.includes("fechar") ||
            aria.includes("close") ||
            titulo.includes("fechar") ||
            titulo.includes("close") ||
            classe.includes("close") ||
            classe.includes("fechar");

        if (pareceBotaoFechar && localizarJanelaCadastro()) {
            evento.preventDefault();
            evento.stopPropagation();
            evento.stopImmediatePropagation();

            fecharJanelaCadastro();
        }
    }, true);

    /* --------------------------------------------------------
       4. FECHAR COM A TECLA ESC
       -------------------------------------------------------- */

    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") {
            const janela = localizarJanelaCadastro();

            if (janela && janela.style.display !== "none") {
                fecharJanelaCadastro();
            }
        }
    });

    /* --------------------------------------------------------
       5. FECHAR CLICANDO NO FUNDO ESCURECIDO
       -------------------------------------------------------- */

    document.addEventListener("click", function (evento) {
        const janela = localizarJanelaCadastro();

        if (!janela) return;

        const fundo = janela.closest(
            '.modal-overlay, .modal-backdrop, .overlay'
        );

        if (fundo && evento.target === fundo) {
            fecharJanelaCadastro();
        }
    });

    /* ========================================================
       6. MODO DIURNO E NOTURNO
       ======================================================== */

    const CHAVE_MODO_NEXUS = "nexus_modo_mapa";

    function aplicarModoMapa(modo) {
        const noturno = modo === "noite";

        document.body.classList.toggle(
            "nexus-modo-noturno",
            noturno
        );

        const botao = document.getElementById(
            "nexusDayNightButton"
        );

        if (botao) {
            const icone = botao.querySelector(
                ".nexus-day-night-icon"
            );

            const texto = botao.querySelector(
                ".nexus-day-night-text"
            );

            if (icone) {
                icone.textContent = noturno ? "☀️" : "🌙";
            }

            if (texto) {
                texto.textContent = noturno
                    ? "Modo diurno"
                    : "Modo noturno";
            }

            botao.setAttribute(
                "aria-label",
                noturno
                    ? "Mudar para o modo diurno"
                    : "Mudar para o modo noturno"
            );

            botao.setAttribute(
                "aria-pressed",
                String(noturno)
            );
        }

        try {
            localStorage.setItem(
                CHAVE_MODO_NEXUS,
                modo
            );
        } catch (erro) {
            console.warn(
                "NEXUS: não foi possível salvar a preferência.",
                erro
            );
        }
    }

    /* --------------------------------------------------------
       7. CRIAÇÃO DO BOTÃO NO MAPA
       -------------------------------------------------------- */

    function criarControleDiaNoite() {
        const mapa = document.getElementById("mapa");

        if (!mapa) {
            console.warn(
                "NEXUS: elemento #mapa não encontrado."
            );
            return;
        }

        if (
            document.getElementById("nexusDayNightButton")
        ) {
            return;
        }

        const botao = document.createElement("button");

        botao.id = "nexusDayNightButton";
        botao.type = "button";
        botao.className = "nexus-day-night-control";

        botao.innerHTML = `
            <span class="nexus-day-night-icon">🌙</span>
            <span class="nexus-day-night-text">
                Modo noturno
            </span>
        `;

        botao.addEventListener("click", function () {
            const estaNoite = document.body.classList.contains(
                "nexus-modo-noturno"
            );

            aplicarModoMapa(
                estaNoite ? "dia" : "noite"
            );
        });

        mapa.appendChild(botao);

        /* Recupera a última preferência salva. */
        let modoSalvo = "dia";

        try {
            modoSalvo =
                localStorage.getItem(CHAVE_MODO_NEXUS) || "dia";
        } catch (erro) {
            console.warn("NEXUS: preferência não disponível.");
        }

        aplicarModoMapa(modoSalvo);
    }

    /* --------------------------------------------------------
       8. INICIALIZAÇÃO
       -------------------------------------------------------- */

    function iniciarNexusAtualizacao() {
        criarControleDiaNoite();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciarNexusAtualizacao
        );
    } else {
        iniciarNexusAtualizacao();
    }

})();

/* NEXUS — reconhecimento do X mesmo quando ele é apenas um ícone */

document.addEventListener("click", function (evento) {
    const botao = evento.target.closest("button");

    if (!botao) return;

    const janela = document.querySelector(
        '[role="dialog"], .modal-overlay, .modal-backdrop, .modal, [class*="modal"]'
    );

    if (!janela || !janela.contains(botao)) return;

    const texto = (botao.innerText || "").trim();

    const botaoSemTexto = texto === "" && botao.querySelector("svg, i");

    if (!botaoSemTexto) return;

    const janelaRect = janela.getBoundingClientRect();
    const botaoRect = botao.getBoundingClientRect();

    const estaNoCantoSuperiorDireito =
        botaoRect.right > janelaRect.right - 85 &&
        botaoRect.top < janelaRect.top + 75;

    if (estaNoCantoSuperiorDireito) {
        evento.preventDefault();

        janela.style.display = "none";
        janela.style.visibility = "hidden";
        janela.style.pointerEvents = "none";
        janela.setAttribute("aria-hidden", "true");

        const fundo = janela.closest(
            ".modal-overlay, .modal-backdrop, .overlay"
        );

        if (fundo && fundo !== janela) {
            fundo.style.display = "none";
        }
    }
}, true);