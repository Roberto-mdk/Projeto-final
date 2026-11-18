
/* ==========================================================
   NEXUS 3.0 — ARMAZENAMENTO
   Obras: LocalStorage
   Fotografias: IndexedDB
   ========================================================== */

(() => {

    "use strict";


    const CONFIG =
        window.NEXUS_CONFIG || {};


    const STORAGE_KEY =
        CONFIG.STORAGE?.WORKS_KEY ||
        "nexus_works_v2";


    const DB_NAME =
        CONFIG.STORAGE?.MEDIA_DB ||
        "nexus_media_v2";


    const STORE_NAME =
        CONFIG.STORAGE?.MEDIA_STORE ||
        "photos";


    const MAX_PHOTO_SIZE =
        CONFIG.LIMITS?.MAX_PHOTO_SIZE ||
        8 * 1024 * 1024;


    const MAX_PHOTOS =
        CONFIG.LIMITS?.MAX_PHOTOS_PER_UPLOAD ||
        12;


    let dbPromise = null;


    /* ======================================================
       1. UTILITÁRIOS
    ====================================================== */

    function clone(value) {

        return JSON.parse(
            JSON.stringify(value)
        );

    }


    function emitChange(detail = {}) {

        window.dispatchEvent(

            new CustomEvent(
                "nexus-storage-change",
                { detail }
            )

        );

    }


    function updateGlobal(works) {

        window.NEXUS_OBRAS =
            clone(works);

    }


    function validateWork(work) {

        if (!work || typeof work !== "object") {

            throw new Error(
                "Registro de construção inválido."
            );

        }


        if (!work.id) {

            throw new Error(
                "A construção precisa possuir um identificador."
            );

        }


        if (!String(work.nome || "").trim()) {

            throw new Error(
                "O nome da construção é obrigatório."
            );

        }


        const lat =
            Number(work.latitude);


        const lon =
            Number(work.longitude);


        if (
            !Number.isFinite(lat) ||
            lat < -90 ||
            lat > 90
        ) {

            throw new Error(
                "Latitude inválida."
            );

        }


        if (
            !Number.isFinite(lon) ||
            lon < -180 ||
            lon > 180
        ) {

            throw new Error(
                "Longitude inválida."
            );

        }

    }


    /* ======================================================
       2. LER O CADASTRO DE OBRAS
    ====================================================== */

    function readWorks() {

        try {

            const stored =
                localStorage.getItem(STORAGE_KEY);


            if (stored !== null) {

                const parsed =
                    JSON.parse(stored);


                if (!Array.isArray(parsed)) {

                    throw new Error(
                        "O cadastro salvo não possui o formato esperado."
                    );

                }


                updateGlobal(parsed);

                return parsed;

            }


        } catch (error) {

            console.error(
                "[NEXUS STORAGE] Falha na leitura dos registros:",
                error
            );

        }


        /*
         * Somente quando não existe cadastro salvo,
         * utilizamos a base inicial do arquivo obras.js.
         */

        const initial = Array.isArray(window.NEXUS_OBRAS)
            ? clone(window.NEXUS_OBRAS)
            : [];


        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(initial)
            );

        } catch (error) {

            console.error(
                "[NEXUS STORAGE] Não foi possível inicializar os dados:",
                error
            );

        }


        updateGlobal(initial);

        return initial;

    }


    function getObras() {

        return readWorks();

    }


    function getObra(id) {

        return getObras().find(
            work => work.id === id
        ) || null;

    }


    /* ======================================================
       3. SALVAR OU ATUALIZAR OBRA
    ====================================================== */

    function saveObra(work) {

        validateWork(work);


        const works =
            getObras();


        const index =
            works.findIndex(
                item => item.id === work.id
            );


        const now =
            new Date().toISOString();


        const record = {

            ...work,

            criadoEm:
                work.criadoEm ||
                works[index]?.criadoEm ||
                now,

            atualizadoEm:
                now

        };


        if (index >= 0) {

            works[index] = record;

        } else {

            works.unshift(record);

        }


        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(works)
            );

        } catch (error) {

            throw new Error(
                "Não foi possível salvar a obra. O armazenamento do navegador pode estar cheio."
            );

        }


        updateGlobal(works);


        emitChange({

            type:
                index >= 0 ? "update" : "create",

            id:
                record.id,

            name:
                record.nome

        });


        return clone(record);

    }


    /* ======================================================
       4. EXCLUIR OBRA
    ====================================================== */

    function deleteObra(id) {

        const works =
            getObras();


        const existing =
            works.find(
                work => work.id === id
            );


        if (!existing) {

            throw new Error(
                "A construção não foi encontrada."
            );

        }


        const updated =
            works.filter(
                work => work.id !== id
            );


        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(updated)
        );


        updateGlobal(updated);


        emitChange({

            type: "delete",

            id,

            name: existing.nome

        });


        return updated;

    }


    /* ======================================================
       5. BANCO DE FOTOGRAFIAS
    ====================================================== */

    function openDatabase() {

        if (!("indexedDB" in window)) {

            return Promise.reject(

                new Error(
                    "IndexedDB não está disponível neste navegador."
                )

            );

        }


        if (dbPromise) {
            return dbPromise;
        }


        dbPromise = new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(DB_NAME, 1);


                request.onupgradeneeded = () => {

                    const db =
                        request.result;


                    if (!db.objectStoreNames.contains(STORE_NAME)) {

                        const store =
                            db.createObjectStore(

                                STORE_NAME,

                                {
                                    keyPath: "id"
                                }

                            );


                        store.createIndex(

                            "obraId",

                            "obraId",

                            {
                                unique: false
                            }

                        );

                    }

                };


                request.onsuccess = () => {

                    resolve(request.result);

                };


                request.onerror = () => {

                    dbPromise = null;

                    reject(request.error);

                };


                request.onblocked = () => {

                    console.warn(
                        "[NEXUS STORAGE] Banco bloqueado por outra aba. Feche outras abas do projeto."
                    );

                };

            }

        );


        return dbPromise;

    }


    /* ======================================================
       6. ADICIONAR FOTOGRAFIAS
    ====================================================== */

    async function addFotos(obraId, fileList) {

        const files =
            Array.from(fileList || []);


        if (!files.length) {
            return [];
        }


        if (files.length > MAX_PHOTOS) {

            throw new Error(
                `O limite é de ${MAX_PHOTOS} fotografias por envio.`
            );

        }


        const invalid =
            files.find(file => {

                return (

                    !file.type.startsWith("image/") ||

                    file.size <= 0 ||

                    file.size > MAX_PHOTO_SIZE

                );

            });


        if (invalid) {

            throw new Error(
                `A imagem "${invalid.name}" é inválida ou ultrapassa o limite de 8 MB.`
            );

        }


        const db =
            await openDatabase();


        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(STORE_NAME);


            const records = [];


            files.forEach(file => {

                const id =

                    window.crypto?.randomUUID

                        ? window.crypto.randomUUID()

                        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;


                const record = {

                    id,

                    obraId,

                    name: file.name,

                    type: file.type,

                    size: file.size,

                    blob: file,

                    createdAt:
                        new Date().toISOString()

                };


                store.add(record);


                records.push({

                    id,

                    obraId,

                    name: file.name

                });

            });


            transaction.oncomplete = () => {

                emitChange({

                    type: "photos",

                    id: obraId

                });


                resolve(records);

            };


            transaction.onerror = () => {

                reject(
                    transaction.error ||
                    new Error("Erro ao salvar fotografias.")
                );

            };


            transaction.onabort = () => {

                reject(
                    transaction.error ||
                    new Error("Envio das fotografias cancelado.")
                );

            };

        });

    }


    /* ======================================================
       7. LISTAR FOTOGRAFIAS
    ====================================================== */

    async function getFotos(obraId) {

        const db =
            await openDatabase();


        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readonly"
                );


            const store =
                transaction.objectStore(STORE_NAME);


            const index =
                store.index("obraId");


            const request =
                index.getAll(obraId);


            request.onsuccess = () => {

                const photos =
                    request.result || [];


                photos.sort((a, b) => {

                    return new Date(a.createdAt) -
                        new Date(b.createdAt);

                });


                resolve(photos);

            };


            request.onerror = () => {

                reject(request.error);

            };

        });

    }


    /* ======================================================
       8. EXCLUIR UMA FOTOGRAFIA
    ====================================================== */

    async function deleteFoto(photoId) {

        const db =
            await openDatabase();


        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            transaction
                .objectStore(STORE_NAME)
                .delete(photoId);


            transaction.oncomplete = () => {

                resolve(true);

            };


            transaction.onerror = () => {

                reject(transaction.error);

            };

        });

    }


    /* ======================================================
       9. EXCLUIR TODAS AS FOTOGRAFIAS DE UMA OBRA
    ====================================================== */

    async function deleteFotosObra(obraId) {

        const db =
            await openDatabase();


        return new Promise((resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(STORE_NAME);


            const index =
                store.index("obraId");


            const request =
                index.openCursor(
                    IDBKeyRange.only(obraId)
                );


            request.onsuccess = () => {

                const cursor =
                    request.result;


                if (cursor) {

                    cursor.delete();

                    cursor.continue();

                }

            };


            transaction.oncomplete = () => {

                resolve(true);

            };


            transaction.onerror = () => {

                reject(transaction.error);

            };

        });

    }


    /* ======================================================
       10. API PÚBLICA
    ====================================================== */

    window.NEXUS_STORAGE = {

        getObras,

        getObra,

        saveObra,

        deleteObra,

        addFotos,

        getFotos,

        deleteFoto,

        deleteFotosObra,

        openDatabase

    };


    // Carrega a base atual sem sobrescrever dados existentes.
    readWorks();


    console.info(
        "[NEXUS STORAGE] Módulo de armazenamento pronto."
    );

})();
