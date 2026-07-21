import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import {
    createItem,
    fetchBarcodeImage,
    fetchBrandCategories,
    fetchBrands,
    fetchCatalogItems,
    fetchCategories,
    fetchPendingCount,
    saveBrand,
    saveFichaTecnica,
} from './api_catalog.js';

import { modalHelpers } from './dynamic_modals.js';
import { modalFunctions } from './modals_catalog.js';
import { getCategoryStyles } from './themes_catalog.js';

Alpine.data('catalogApp', () => ({
    
    //? --- IMPORTACIÓN DE MODULOS ---
    ...modalHelpers,   
    ...modalFunctions, 

    //? DATOS PRINCIPALES Y LISTAS
    items: [], 
    categories: [], 
    brandCategories: [], 
    brands: [],

    //? PAGINACIÓN Y FILTROS PRINCIPALES
    localSearch: '',
    searchQuery: '',
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,

    //? ESTADOS DE LOS DROPDOWNS DINÁMICOS
    
    openCategoryDropdown: false,
    modalLocalSearch: '',
    modalOpenCategoryDropdown: false,
    selectedCategoryId: 0, 
    selectedCategoryName: 'Todas las categorías...',
    
    modalLocalSearchBrandCat: '',
    modalOpenBrandCatDropdown: false,
    
    modalLocalSearchBrand: '',
    modalOpenBrandDropdown: false,

    //? FORMULARIOS (CREACIÓN Y EDICIÓN)
    newItem: {
        id: null,
        nombre: '',
        codigo: '',
        id_categoria: 0,
        id_brand: 1,       
        descripcion: ''
    },
    newBrand: {
        id: null, 
        nombre: '', 
        id_brandcategory: 1, 
        descripcion: ''
    },
    ficha: {
        unidad: 0,
        contenido_empaque: 1.0,
        peso: 0.0,
        rendimiento: 100.0,
        tipo_precio: '',
        precio: 0.0,
        utilidad: 0.0,
        moneda: 'MXN',
        tasa_cuota: 0.16
    },
    skuModificadoManualmente: false,
    ivaType: '0.16',
    activeItem: {}, 
    isEditingAll: false,
    modalFormType: 'item',

    //? MUESTREO DE MODALS (Booleanos)
    showBrandModal: false,
    showCreateModal: false,
    showCompleteModal: false,
    showEditModal: false,
    showEditAllModal: false,
    showCrudModal: false,
    showDeleteModal: false,
    showSuccessModal: false,

    //? VARIABLES DE CONTROL (CRUD Y ELIMINACIÓN)
    //* Control de eliminación
    deleteTarget: null, 
    deleteType: '',     
    deleteName: '',     
    
    //* Control del Modal CRUD 
    crudType: '', 
    crudTitle: '',
    crudNameLabel: '',
    crudPlaceholder: '',
    crudShowCode: false, 
    crudNewCode: '',
    crudNewName: '',
    crudItems: [],
    crudEditingId: null,
    crudInlineCode: '',
    crudInlineName: '',
   
    // Mensajes de éxito
    successTitle: '',
    successMessage: '',

    //? CÓDIGOS DE BARRAS Y PDF
    showBarcodeModal: false,
    barcodeSearch: '',
    selectedBarcodeItems: [], 
    selectedItems: [], 
    isGeneratingPDF: false,

    //? ESTADOS DEL SISTEMA Y RED
    abortController: null,
    _timeout: null, 
    globalPendingCount: 0,
    isLoading: false,
    isSubmitting: false,
    isSavingFicha: false,
    isDeleting: false,

    //? INICIALIZACIÓN Y OBSERVADORES (WATCHERS)
    init() {
        this.searchAbortController = new AbortController();
        
        this.loadCatalogs('todos');
        this.loadItems();
        this.loadPendingCount();

        //? --- WATCHERS ---
        this.$watch('searchQuery', () => { 
            this.currentPage = 1; 
            this.debounceItems(); 
        });

        this.$watch('selectedCategoryId', () => { 
            this.currentPage = 1; 
            this.loadItems(); 
        });

        this.$watch('ivaType', (value) => {
            if (value !== 'custom') {
                this.ficha.tasa_cuota = parseFloat(value);
            }
        });
    },

    async loadPendingCount() {
        try {
            const response = await fetchPendingCount();
            if (response && response.success) {
                this.globalPendingCount = response.count;
            }
        } catch (error) {
            console.error("Error al contar registros pendientes:", error);
        }
    },

    //? CARGA DE ITEMS

    debounceItems() {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this.loadItems();
        }, 300);
    },

    async loadItems() {
        this.isLoading = true;

        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        
        try {
            const filters = {
                search: this.searchQuery,
                categoryId: this.selectedCategoryId 
            };

            const response = await fetchCatalogItems(filters, this.currentPage, this.abortController.signal);
            
            if (response && response.results) {
                this.items = response.results;              
                this.totalItems = response.total_records;  
                this.totalPages = response.total_pages;
                this.currentPage = response.current_page;

                this._debugData(); 
                
                this.$nextTick(() => {
                    if (window.lucide) window.lucide.createIcons();
                });
            } else if (response && response.error) {
                console.error("Error de la API al cargar items:", response.error);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error de red en loadItems:", error);
            }
        } finally {
            this.isLoading = false;
        }
    },

    //? CARGA DE CATÁLOGOS BASE
    
    async loadCatalogs(tipo = 'todos', search = '') {
        try {
            if (tipo === 'categorias' || tipo === 'todos') {
                const responseCat = await fetchCategories(search, this.abortController?.signal);
                const isSuccess = responseCat && (responseCat.success === true || responseCat.status === 'success');
                
                if (isSuccess) {
                    const datos = responseCat.data || responseCat.categories || responseCat.results || [];
                    this.categories = [
                        { id: 0, code: '', name: 'Todas las categorías...' },
                        ...datos
                    ];
                } else {
                    console.warn("La API de categorías respondió, pero no reportó éxito:", responseCat);
                }
            }

            if (tipo === 'marcas' || tipo === 'todos') {
                const dataBrands = await fetchBrands(search, this.abortController?.signal);
                
                if (dataBrands && dataBrands.status === 'success') {
                    this.brands = dataBrands.brands || [];
                } else {
                    console.error("Error del servidor al cargar marcas:", dataBrands?.message);
                }
            }

            if (tipo === 'categorias_marcas' || tipo === 'todos') {
                const dataBrandCats = await fetchBrandCategories(search, this.abortController?.signal);
                
                if (dataBrandCats && dataBrandCats.status === 'success') {
                    this.brandCategories = dataBrandCats.brandCategories || [];
                } else {
                    console.error("Error del servidor al cargar categorías de marcas:", dataBrandCats?.message);
                }
            }
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`Error de red al cargar catálogos (${tipo}):`, error);
            }
        }
    },

    //? DROPDOWNS 

    debounceBuscador(tipo, valor) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(async () => {
            try {
                if (tipo === 'categoria') this.loadCatalogs('categorias', valor); 
                else if (tipo === 'marca') this.loadCatalogs('marcas', valor);
                else if (tipo === 'categoria_marca') this.loadCatalogs('categorias_marcas', valor);
            } catch (error) {
                if (error.name !== 'AbortError') console.error(`Error buscando ${tipo}:`, error);
            }
        }, 300);
    },

    seleccionarDropdown(tipo, id) {
        if (tipo === 'categoria') {
            this.newItem.id_categoria = id;
            if (typeof this.proposeSKU === 'function') this.proposeSKU();
            this.modalOpenCategoryDropdown = false;
            this.modalLocalSearch = '';
        } 
        else if (tipo === 'marca') {
            this.newItem.id_brand = id;
            this.modalOpenBrandDropdown = false;
            this.modalLocalSearchBrand = '';
        } 
        else if (tipo === 'categoria_marca') {
            this.newBrand.id_brandcategory = id;
            this.modalOpenBrandCatDropdown = false;
            this.modalLocalSearchBrandCat = '';
        }
    },

    cerrarDropdown(tipo) {
        if (tipo === 'categoria') {
            this.modalOpenCategoryDropdown = false;
            this.modalLocalSearch = '';
        } else if (tipo === 'marca') {
            this.modalOpenBrandDropdown = false;
            this.modalLocalSearchBrand = '';
        } else if (tipo === 'categoria_marca') {
            this.modalOpenBrandCatDropdown = false;
            this.modalLocalSearchBrandCat = '';
        }
    },

    //? SUBMITS 
    getSubmitButtonText() {
        if (this.isSubmitting) return 'Guardando...';
        
        if (this.modalFormType === 'brand') return 'Guardar Marca';
        if (this.modalFormType === 'brandCategory') return 'Guardar Categoría de Marca';
        if (this.modalFormType === 'category') return 'Guardar Categoría';
        
        return this.newItem.id ? 'Actualizar Ítem' : 'Crear Ítem';
    },

    async procesarFormulario(accion) {
        // 1. Configuración de estados
        const isFichaTecnica = accion === 'ficha_tecnica';
        const isEditarTodo = accion === 'editar_todo';
        const isItem = ['crear', 'editar_basico', 'editar_todo', 'ficha_tecnica'].includes(accion);
        
        // Determinamos la variable de carga
        const loadingVar = isFichaTecnica ? 'isSavingFicha' : (isEditarTodo ? 'isEditingAll' : 'isSubmitting');
        this[loadingVar] = true;

        // 2. Validación
        if (accion === 'guardar_marca' && !this.newBrand.nombre.trim()) return alert("El nombre de la marca es obligatorio");
        if (accion === 'guardar_brand_category' && !this.newBrandCategory.name.trim()) return alert("El nombre es obligatorio");
        if (accion === 'guardar_category' && !this.newCategory.name.trim()) return alert("El nombre es obligatorio");
        if ((accion === 'crear' || accion === 'editar_basico') && !this.newItem.nombre.trim()) return alert("El nombre del ítem es obligatorio");

        try {
            let exito = true;
            let respuesta = null;

            // 3. Ejecución de APIs
            switch (accion) {
                case 'crear':
                case 'editar_basico':
                    respuesta = await createItem(this.newItem);
                    break;

                case 'editar_todo':
                    const resBase = await createItem(this.newItem);
                    if (resBase?.status !== 'success') throw new Error(resBase?.error || "Error al guardar base");
                    // Fall-through intencional para guardar ficha técnica también
                case 'ficha_tecnica':
                    respuesta = await saveFichaTecnica({
                        id_item: isFichaTecnica ? this.activeItem.id : this.newItem.id,
                        ...this.ficha
                    });
                    break;

                case 'guardar_marca':
                    respuesta = await saveBrand(this.newBrand);
                    break;

                case 'guardar_brand_category':
                    respuesta = await saveBrandCategory(this.newBrandCategory);
                    break;

                case 'guardar_category':
                    respuesta = await setCategoryItem(this.newCategory);
                    break;
            }

            if (respuesta && respuesta.status !== 'success') {
                alert(respuesta?.error || "Error al procesar la solicitud.");
                exito = false;
            }

            if (exito) {
                this.handleSuccessCleanup(accion, isItem);
                this.showSuccessModal = true;
            }

        } catch (error) {
            console.error(`Error en submit (${accion}):`, error);
            alert("Error de conexión al servidor");
        } finally {
            this[loadingVar] = false;
        }
    },

    handleSuccessCleanup(accion, isItem) {
        // Cerrar todos los modales
        this.showCreateModal = false;
        this.showEditModal = false;
        this.showEditAllModal = false;
        this.showCompleteModal = false;

        // Limpieza general para Ítems
        if (isItem) {
            this.newItem = { id: null, nombre: '', codigo: '', id_categoria: 0, id_brandcategory: 0, id_brand: 0, descripcion: '' };
            this.loadItems();
            if (accion === 'crear') this.currentPage = 1;
        }

        // Limpieza específica de Ficha Técnica
        if (['editar_todo', 'ficha_tecnica'].includes(accion)) {
            this.ficha = { unidad: 0, contenido_empaque: 1.0, peso: 0.0, rendimiento: 100.0, tipo_precio: '', precio: 0.0, utilidad: 0.0, moneda: 'MXN', tasa_cuota: 0.16 };
            this.loadPendingCount();
        }

        // Limpieza de Catálogos (Marcas/Categorías)
        if (accion === 'guardar_marca') {
            this.newBrand = { id: 0, nombre: '', id_brandcategory: 0, descripcion: '' };
            this.loadCatalogs('marcas');
        }
        if (accion === 'guardar_brand_category') this.loadCatalogs('brand_categories');
        if (accion === 'guardar_category') this.loadCatalogs('categories');

        // Mensajes
        this.successTitle = isItem ? '¡Ítem Procesado!' : '¡Datos Actualizados!';
        this.successMessage = 'La información se ha guardado correctamente.';
    },

    //? GENERADOR DE SKU 
    _limpiarTexto(texto) {
        if (!texto) return "";
        let limpio = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "");
        let palabras = limpio.toUpperCase().split(" ");
        
        let ignoradas = new Set(["Y", "E", "DE", "DEL", "CON", "EL", "LA", "LOS", "LAS", "EN", "PARA"]);
        
        return palabras.filter(p => !ignoradas.has(p) && p.length > 0);
    },

    generarPrefijoInteligente(texto) {
        let palabrasUtiles = this._limpiarTexto(texto);

        if (palabrasUtiles.length === 0) return "XXX";

        if (palabrasUtiles.length >= 3) {
            return (palabrasUtiles[0][0] + palabrasUtiles[1][0] + palabrasUtiles[2][0]);
        } 
        else if (palabrasUtiles.length === 2) {
            let p1 = palabrasUtiles[0].substring(0, 2); 
            let p2 = palabrasUtiles[1].substring(0, 1); 
            return (p1 + p2).padEnd(3, 'X'); 
        } 
        else {
            let palabra = palabrasUtiles[0];
            let primeraLetra = palabra.charAt(0); 
            let restoConsonantes = palabra.slice(1).replace(/[AEIOU]/ig, ''); 
            return (primeraLetra + restoConsonantes).padEnd(3, 'X').substring(0, 3);
        }
    },

    proposeSKU() {
        if (this.skuModificadoManualmente) return;

        let catTarget = this.categories.find(c => c.id === this.newItem.id_categoria);
        if (!catTarget) return;

        let prefijo = this.generarPrefijoInteligente(catTarget.name);


        let randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        let nuevoCodigo = `${prefijo}${randomNum}`;
        
        let esDuplicadoLocal = true;
        let intentos = 0; 
        
        while (esDuplicadoLocal && intentos < 10) {
            let coincidencia = this.items.some(item => item.codigo === nuevoCodigo);
            if (!coincidencia) {
                esDuplicadoLocal = false; 
            } else {
                randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                nuevoCodigo = `${prefijo}${randomNum}`;
            }
            intentos++;
        }
        
        this.newItem.codigo = nuevoCodigo;
    },

    //? FUNSIONES BARCODE 
    _fontTitlesPDF(doc, nombreItem, width) {
        let nombre = (nombreItem || '').trim();
        let lineasText = [];

        if (!nombre.includes(' ')) {
            lineasText = [nombre, ""];
        } else {
            let centroIdeal = Math.floor(nombre.length * 0.45);
            let mejorEspacio = -1;
            let menorDistancia = nombre.length;

            for (let j = 0; j < nombre.length; j++) {
                if (nombre[j] === ' ') {
                    let distancia = Math.abs(j - centroIdeal);
                    if (distancia < menorDistancia) {
                        menorDistancia = distancia;
                        mejorEspacio = j;
                    }
                }
            }

            let linea1 = nombre.substring(0, mejorEspacio).trim();
            let linea2 = nombre.substring(mejorEspacio + 1).trim();
            lineasText = [linea1, linea2];
        }

        let anchoMaximo = width + 5;
        for (let k = 0; k < 2; k++) {
            if (doc.getTextWidth(lineasText[k]) > anchoMaximo) {
                while (doc.getTextWidth(lineasText[k] + '...') > anchoMaximo && lineasText[k].length > 0) {
                    lineasText[k] = lineasText[k].slice(0, -1); 
                }
                lineasText[k] = lineasText[k].trim() + '...';
            }
        }

        return lineasText;
    },

    async generarPDFCodigos() {
        if (!this.selectedBarcodeItems || this.selectedBarcodeItems.length === 0) {
            alert("Por favor, selecciona al menos un ítem.");
            return;
        }

        this.isGeneratingPDF = true; 

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const itemsParaImprimir = this.selectedBarcodeItems;

            const fetchPromises = itemsParaImprimir.map(async (item) => {
                try {
                    const codigoIdentificador = item.codigo || item.sku; 
                    let blob = await fetchBarcodeImage(codigoIdentificador);

                    let base64Img = await new Promise((resolve, reject) => {
                        let reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    
                    return { ...item, imgBase64: base64Img };
                } catch (error) {
                    console.warn(`Falló la generación para el código ${item.codigo || item.sku}:`, error);
                    return { ...item, imgBase64: null }; 
                }
            });

            const itemsConImagenes = await Promise.all(fetchPromises);

            let x = 20;          
            let y = 28;         
            const width = 75;    
            const height = 35;   
            const gapX = 90;     
            const gapY = 60;     
            let colActual = 0;

            for (let i = 0; i < itemsConImagenes.length; i++) {
                let item = itemsConImagenes[i];

                if (item.imgBase64) {
                    doc.setFont("helvetica", "bold"); 
                    doc.setFontSize(11);              
                    doc.setTextColor(0, 0, 0);        

                    let lineasText = this._fontTitlesPDF(doc, item.nombre, width);
                    let posicionYTexto = y - 8;
                    
                    doc.text(lineasText, x + (colActual * gapX) + (width / 2), posicionYTexto, { align: "center" });
                    doc.addImage(item.imgBase64, 'PNG', x + (colActual * gapX), y, width, height);
                }

                colActual++;
                if (colActual > 1) {
                    colActual = 0;
                    y += gapY;
                }

                if (y > 250 && i < itemsConImagenes.length - 1) {
                    doc.addPage();
                    y = 20; 
                    colActual = 0;
                }
            }

            let pdfUrl = doc.output('bloburl');
            window.open(pdfUrl, '_blank');

        } catch (error) {
            console.error("Error al construir el PDF:", error);
            alert("Ocurrió un error al procesar el archivo PDF.");
        } finally {
            this.isGeneratingPDF = false; 
            this.showBarcodeModal = false;
            this.selectedBarcodeItems = [];
        }
    },

    getBarcodeSearchResults() {
        const search = this.barcodeSearch.trim().toLowerCase();
        
        if (!search || !this.items || this.items.length === 0) {
            return [];
        }
        
        return this.items.filter(item => {
            const matchNombre = item.nombre?.toLowerCase().includes(search);
            const matchCodigo = item.codigo?.toLowerCase().includes(search);
            
            const noEstaAgregado = !this.selectedBarcodeItems.some(selected => selected.id === item.id);
            
            return (matchNombre || matchCodigo) && noEstaAgregado;
        }).slice(0, 5); 
    },

    addBarcodeItem(item) {
        const yaExiste = this.selectedBarcodeItems.some(selected => selected.id === item.id);
        if (!yaExiste) this.selectedBarcodeItems.push(item);
        this.barcodeSearch = '';
    },

    removeBarcodeItem(id) {
        this.selectedBarcodeItems = this.selectedBarcodeItems.filter(item => item.id !== id);
    },

    //? PROPIEDADES COMPUTADAS (GETTERS) Y PAGINACIÓN

    get filteredItems() {
        return this.items;
    },

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadItems();
        }
    },

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadItems();
        }
    },
    
    goToPage(page) {
        this.currentPage = page;
        this.loadItems();
    },

    get visiblePages() {
        let pages = [];
        let start = Math.max(1, this.currentPage - 1);
        let end = Math.min(this.totalPages, this.currentPage + 1);

        if (this.currentPage === 1) end = Math.min(this.totalPages, 3);
        if (this.currentPage === this.totalPages) start = Math.max(1, this.totalPages - 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    },

    //? ESTILOS Y ACCIONES EXTRAS

    getCategoryStyles(category) {
        return getCategoryStyles(category);
    },

    openCompleteModal(item) {
        this.activeItem = item;
        
        this.ficha = {
            unidad: 0, contenido_empaque: 1.0, peso: 0.0, rendimiento: 100.0,
            tipo_precio: '', precio: 0.0, utilidad: 0.0, moneda: 'MXN', tasa_cuota: 0.16
        };
        this.ivaType = '0.16';

        this.showCompleteModal = true;
    },

    marcarComoCompletado() {
        if(this.activeItem && this.activeItem.id) {
            const index = this.items.findIndex(i => i.id === this.activeItem.id);
            if(index !== -1) {
                this.items[index].isComplete = true;
                this.globalPendingCount = Math.max(0, this.globalPendingCount - 1); 
            }
        }
        this.showCompleteModal = false;
        this.activeItem = {}; 
    },

    _debugData() {
        if (this.items.length > 0) {
            console.log("--- DEBUG: ESTRUCTURA DE DATOS ---");
            console.log("1. Objeto completo del primer ITEM:", this.items[0]);
            if (this.categories.length > 1) {
                console.log("2. Objeto completo de una CATEGORÍA:", this.categories[1]);
            }
            console.log("----------------------------------");
        }
    },

}));

window.Alpine = Alpine;
Alpine.start();