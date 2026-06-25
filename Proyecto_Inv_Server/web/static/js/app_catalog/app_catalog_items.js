import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

import {
    createItem,
    deleteItemAPI,
    fetchCatalogItems,
    fetchCategories,
    fetchFichaTecnica,
    fetchPendingCount,
    saveFichaTecnica,
    setCategoryItem,
} from './api_catalog.js';
import { getCategoryStyles } from './themes_catalog.js';

Alpine.data('catalogApp', () => ({
    
    //? --- FILTROS ---
    searchQuery: '',
    
    
    localSearch: '',
    openCategoryDropdown: false,
    modalOpenCategoryDropdown: false,
    modalLocalSearch: '',
    selectedCategoryId: 0, 
    selectedCategoryName: 'Todas las categorías...',
    categories: [], 
   

    //? --- MODALS ---
    showCreateModal: false,
    showCompleteModal: false,
    showSuccessModal: false,
    showEditModal: false,
    showEditAllModal: false,
    showCategoryModal: false,
    newCategoryName: '',
    newCategoryCode: '',
    editingCategoryId: null,
    inlineEditCode: '',
    inlineEditName: '',
    isEditingAll: false,


    //* Variables de modal delete
    showDeleteModal: false,
    isDeleting: false,
    deleteTarget: null, 
    deleteType: '',     
    deleteName: '',     
    itemToDelete: null,
   
    successTitle: '',
    successMessage: '',
    activeItem: {}, 
    

    //? --- ITEMS ---
    items: [], 
    abortController: null,
    _timeout: null, 
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 1,
    ivaType: '0.16',

    globalPendingCount: 0,

    isLoading: false,
    isSubmitting: false,
    isSavingFicha: false,

    newItem: {
        nombre: '',
        codigo: '',
        id_categoria: 0,
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

                if (this.items.length > 0) {
                    console.log("--- DEBUG: ESTRUCTURA DE DATOS ---");
                    console.log("1. Objeto completo del primer ITEM:", this.items[0]);
                    
                    // Comprobamos también cómo están estructuradas las categorías 
                    // (tomamos la posición 1 para saltar la de "Todas las categorías...")
                    if (this.categories.length > 1) {
                        console.log("2. Objeto completo de una CATEGORÍA:", this.categories[1]);
                    }
                    console.log("----------------------------------");
                }
                
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
                { id: 0, code: '', name: 'Todas las categorías...' },
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

    //? --- SUBMITS ---

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

    async submitEdit() {
        if (!this.newItem.nombre.trim()) {
            alert("El nombre del ítem es obligatorio");
            return;
        }

        this.isSubmitting = true; 

        try {
            const resBase = await createItem(this.newItem);
            
            if (resBase && resBase.status === 'success') {
                this.showEditBasicModal = false;
                
                this.loadItems();
                
                this.successTitle = '¡Datos Actualizados!';
                this.successMessage = 'Los datos básicos del ítem se guardaron correctamente.';
                this.showSuccessModal = true;
            } else {
                alert(resBase.error || "Falló al actualizar los datos básicos.");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión al actualizar el ítem.");
        } finally {
            this.isSubmitting = false;
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

    async saveCategory() {
        let codigo = this.newCategoryCode.trim();
        let nombre = this.newCategoryName.trim();
        
        if (!codigo || !nombre) {
            alert("Por favor, ingresa tanto el código como el nombre de la categoría.");
            return;
        }

        let payload = {
            id: 0, 
            code: codigo.toUpperCase(), 
            category: nombre.toUpperCase(),
            is_active: 1,
            display_order: 0
        };

        try {
            let result = await setCategoryItem(payload);
            
            this.categories.push({
                id: result.id, 
                code: payload.code,
                name: payload.category
            });

            this.newCategoryCode = '';
            this.newCategoryName = '';
            
        } catch (error) {
            alert(error.message);
        }
    },


    
    //? --- ABRIR MODALS ---
    openEditModal(item) {
        const matchedCategory = this.categories.find(cat => cat.name === item.category);
        
        const correctCategoryId = matchedCategory ? matchedCategory.id : 0;

        this.newItem = {
            id: item.id,
            nombre: item.nombre,
            codigo: item.sku,
            id_categoria: correctCategoryId, 
            descripcion: item.descripcion || ''
        };
        this.showEditModal = true;
    },
    
    async openEditAllModal(item) {
        const matchedCategory = this.categories.find(cat => cat.name === item.category);
        const correctCategoryId = matchedCategory ? matchedCategory.id : 0;

        this.newItem = {
            id: item.id,
            nombre: item.nombre,
            codigo: item.sku,
            id_categoria: correctCategoryId,
            descripcion: item.descripcion || ''
        };
        
        const fichaData = await fetchFichaTecnica(item.id);
        
        if (fichaData) {
            this.ficha = {
                unidad: fichaData.id_unidad || 0, 
                contenido_empaque: fichaData.contenido_empaque || null,
                peso: fichaData.peso || null,
                rendimiento: fichaData.rendimiento || null,
                tipo_precio: fichaData.tipo_precio || '',
                precio: fichaData.precio || null,
                utilidad: fichaData.utilidad || null,
                moneda: fichaData.moneda || 'MXN',
                tasa_cuota: fichaData.tasa_cuota || 0.16
            };

            const tasaNum = Number(fichaData.tasa_cuota);
            if (tasaNum === 0.16) {
                this.ivaType = '0.16';
            } else if (tasaNum === 0.00) {
                this.ivaType = '0.00';
            } else {
                this.ivaType = 'custom';
            }

            this.showEditAllModal = true;
            
        } else {
            alert("No se pudo cargar la información de la ficha técnica.");
        }
    },

    openDeleteModal(item) {
        this.deleteTarget = item;       
        this.deleteType = 'item';
        this.deleteName = item.nombre; 
        this.showDeleteModal = true;   
    },

    async confirmDelete() {
        if (!this.deleteTarget) return;

        this.isDeleting = true; 
        
        try {

            if (this.deleteType === 'category') {
                let payload = {
                    id: this.deleteTarget.id,
                    code: this.deleteTarget.code,
                    category: this.deleteTarget.name,
                    is_active: 0,
                    display_order: 0
                };

                await setCategoryItem(payload);
                this.categories = this.categories.filter(c => c.id !== this.deleteTarget.id);
                
                this.successTitle = '¡Categoría Eliminada!';
                this.successMessage = 'La categoría se ha dado de baja correctamente.';
                this.showSuccessModal = true;
            } 
            

            else if (this.deleteType === 'item') {
                const response = await deleteItemAPI(this.deleteTarget.id);

                if (response && response.status === 'success') {
                    this.loadItems();
                    
                    this.successTitle = '¡Eliminado!';
                    this.successMessage = 'El registro se ha dado de baja correctamente.';
                    this.showSuccessModal = true;
                } else {
                    alert(response.error || "Ocurrió un error al intentar eliminar el ítem.");
                    this.isDeleting = false;
                    return; 
                }
            }

            this.showDeleteModal = false;

        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Error de red al intentar conectar con el servidor.");
        } finally {
            this.isDeleting = false; 
            this.deleteTarget = null; 
            this.deleteType = '';
            this.deleteName = '';
        }
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


    //? --- Acciones de categorias ---
    editCategory(cat) {
        this.editingCategoryId = cat.id;
        this.inlineEditName = cat.name;
        this.inlineEditCode = cat.code; 
    },

    cancelEdit() {
        this.editingCategoryId = null;
        this.inlineEditName = '';
        this.inlineEditCode = ''; 
    },

    async saveInlineCategory(cat) {
        let nombre = this.inlineEditName.trim();
        let codigo = this.inlineEditCode.trim();
        
        if (!nombre || !codigo) {
            alert("El nombre o código no pueden estar vacíos.");
            return;
        }

        let payload = {
            id: cat.id, 
            code: codigo.toUpperCase(),
            category: nombre.toUpperCase(),
            is_active: 1,
            display_order: 0
        };

        try {
            let result = await setCategoryItem(payload);
            
            let index = this.categories.findIndex(c => c.id === cat.id);
            if (index !== -1) {
                this.categories[index].code = payload.code;
                this.categories[index].name = payload.category;
            }
            
            this.cancelEdit();
            
        } catch (error) {
            alert(error.message);
        }
    },

    deleteCategory(id) {
        let catTarget = this.categories.find(c => c.id === id);
        if (!catTarget) return;

        this.deleteTarget = catTarget;
        this.deleteType = 'category';
        this.deleteName = catTarget.name; 
        
        this.showDeleteModal = true;
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