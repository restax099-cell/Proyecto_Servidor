import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import { createItem, fetchCatalogItems, fetchCategories, fetchPendingCount, saveFichaTecnica } from './api_catalog.js';
import { getCategoryStyles } from './themes_catalog.js';

Alpine.data('catalogApp', () => ({
    
    //? --- ESTADO ---
    searchQuery: '',
    
    
    localSearch: '',
    openCategoryDropdown: false,
    selectedCategoryId: 0, 
    selectedCategoryName: 'Todas las categorías...',
    categories: [], 
    
    showCreateModal: false,
    showCompleteModal: false,
    showSuccessModal: false,
    showEditModal: false,
    isEditingAll: false,
    successTitle: '',
    successMessage: '',
    activeItem: {}, 
    
    items: [], 
    isLoading: false,
    abortController: null,

    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,

    globalPendingCount: 0,

    newItem: {
        nombre: '',
        codigo: '',
        id_categoria: 0,
        descripcion: ''
    },
    isSubmitting: false,

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
    ivaType: '0.16',
    isSavingFicha: false,
    
    _timeout: null, 

    //? --- INICIALIZACIÓN ---
    init() {
        this.loadCategories();
        this.loadItems();
        this.loadPendingCount();

        this.$watch('searchQuery', () => { 
            this.currentPage = 1; 
            this.loadItems(); 
        });

        this.$watch('selectedCategoryId', () => { 
            this.currentPage = 1; 
            this.loadItems(); 
        });

        this.$watch('localSearch', (value) => {
            if (this.openCategoryDropdown) {
                this.debounceCategories(value);
            }
        });

        this.$watch('ivaType', (value) => {
            if (value !== 'custom') {
                this.ficha.tasa_cuota = parseFloat(value);
            }
        });
    },

    //? --- CONEXIÓN A LA API ---
    async loadItems() {
        this.isLoading = true;

        if (this.abortController) {
            this.abortController.abort();
        }
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
                
                this.$nextTick(() => {
                    if (window.lucide) window.lucide.createIcons();
                });
            } else if (response && response.error) {
                console.error("Error de la API:", response.error);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Error de red:", error);
            }
        } finally {
            this.isLoading = false;
        }
    },

    async loadCategories(search = '') {
        const response = await fetchCategories(search);
        if (response && response.success) {
            this.categories = [
                { id: 0, name: 'Todas las categorías...' },
                ...response.data
            ];
        }
    },

    async loadPendingCount() {
        try {
            const response = await fetchPendingCount();
            if (response && response.success) {
                this.globalPendingCount = response.count;
            }
        } catch (error) {
            console.error("Error al contar pendientes:", error);
        }
    },

    async submitNewItem() {
        if (!this.newItem.nombre.trim()) {
            alert("El nombre del ítem es obligatorio");
            return;
        }

        this.isSubmitting = true;

        try {
            const response = await createItem(this.newItem);

            if (response && response.status === 'success') {
                this.showCreateModal = false;
                
                this.newItem = { nombre: '', codigo: '', id_categoria: 0, descripcion: '' };
                
                this.currentPage = 1;
                this.loadItems();

                this.successTitle = 'Item Registrado con Exito';
                this.successMessage = 'El nuevo ítem se ha guardado correctamente en el catálogo.';
                this.showSuccessModal = true;
                
                console.log("Ítem creado con ID:", response.data.new_item_id);
            } else {
                alert(response.error || "Hubo un problema al registrar el ítem");
            }
        } catch (error) {
            alert("Error de conexión");
        } finally {
            this.isSubmitting = false;
        }
    },

    async submitFichaTecnica() {
        this.isSavingFicha = true;

        const payload = {
            id_item: this.activeItem.id, 
            ...this.ficha
        };

        try {
            const response = await saveFichaTecnica(payload);

            if (response && response.status === 'success') {
                this.showCompleteModal = false; 
                
                
                this.ficha = { unidad: 0, contenido_empaque: 1.0, peso: 0.0, rendimiento: 100.0, tipo_precio: '', precio: 0.0, utilidad: 0.0, moneda: 'MXN', tasa_cuota: 0.0 };
                
                this.loadPendingCount();
                this.loadItems();

                this.successTitle = 'Ficha Finalizada con Éxito';
                this.successMessage = 'Los datos operativos y financieros se han vinculado correctamente.';
                this.showSuccessModal = true;
                
                console.log("Ficha técnica guardada con éxito");
            } else {
                alert(response.error || "Hubo un problema al guardar la ficha técnica");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al guardar la ficha técnica");
        } finally {
            this.isSavingFicha = false;
        }
    },

    async submitEditAll() {
        if (!this.newItem.nombre.trim()) {
            alert("El nombre del ítem es obligatorio");
            return;
        }

        this.isEditingAll = true;

        try {
            const resBase = await createItem(this.newItem);
            
            if (resBase && resBase.status === 'success') {
                
                const payloadFicha = {
                    id_item: this.newItem.id,
                    ...this.ficha
                };
                const resFicha = await saveFichaTecnica(payloadFicha);

                if (resFicha && resFicha.status === 'success') {
                    this.showEditModal = false;
                    this.loadItems();
                    
                    this.successTitle = '¡Ítem Actualizado!';
                    this.successMessage = 'Toda la información y la ficha técnica se guardaron correctamente.';
                    this.showSuccessModal = true;
                } else {
                    alert(resFicha.error || "Se actualizó el nombre, pero falló la ficha.");
                }
            } else {
                alert(resBase.error || "Falló al actualizar los datos básicos.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al actualizar el ítem.");
        } finally {
            this.isEditingAll = false;
        }
    },

    openEditModal(item) {
        this.activeItem = item;
        
        this.newItem = {
            id: item.id,
            nombre: item.nombre || '',
            codigo: item.codigo || '',
            id_categoria: item.id_categoria || 0,
            descripcion: item.descripcion || ''
        };

        this.ficha = {
            unidad: item.unidad || 0,
            contenido_empaque: item.contenido_empaque || 1.0,
            peso: item.peso || 0.0,
            rendimiento: item.rendimiento || 100.0,
            tipo_precio: item.tipo_precio || '',
            precio: item.precio || 0.0,
            utilidad: item.utilidad || 0.0,
            moneda: item.moneda || 'MXN',
            tasa_cuota: item.tasa_cuota !== undefined ? item.tasa_cuota : 0.16
        };

        this.ivaType = [0.16, 0.00].includes(this.ficha.tasa_cuota) 
                        ? this.ficha.tasa_cuota.toString() 
                        : 'custom';

        this.showEditModal = true;
    },


    debounceCategories(value) {
        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this.loadCategories(value);
        }, 300);
    },

    //? --- PROPIEDADES COMPUTADAS (GETTERS) ---
    get filteredItems() {
        return this.items;
    },

    

    //? --- BOTONES DE PAGINACIÓN ---
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

    //? --- ESTILOS DE CATEGORÍAS ---
    getCategoryStyles(category) {
        return getCategoryStyles(category);
    },

    //? --- ACCIONES ---
    openCompleteModal(item) {
        this.activeItem = item;
        
        this.ficha = {
            unidad: 0,
            contenido_empaque: 1.0,
            peso: 0.0,
            rendimiento: 100.0,
            tipo_precio: '',
            precio: 0.0,
            utilidad: 0.0,
            moneda: 'MXN',
            tasa_cuota: 0.16
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

    
}));

window.Alpine = Alpine;
Alpine.start();