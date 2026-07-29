import {
    deleteItemAPI,
    fetchOperationItem,
    saveBrand,
    saveBrandCategory,
    setCategoryItem
} from './api_catalog.js';

export const modalFunctions = {
    
    //? ABRIR MODALS 
    abrirModalRegistro(tipo) {
        this.modalFormType = tipo;

        if (tipo === 'item') {
            this.newItem.id = 0;
            this.newItem.nombre = '';
            this.newItem.codigo = '';
            this.newItem.barcode = '';
            this.newItem.id_categoria = 0;
            this.newItem.id_brand = 0;
            this.newItem.descripcion = '';
            
            this.operationItem = { 
                unidad: 0, 
                contenido_empaque: 1.0, 
                peso: 0.0, 
                rendimiento: 100.0 
            };
            
            this.modalLocalSearch = '';
            this.modalLocalSearchBrand = '';
            
        } 
        else if (tipo === 'brand') {
            this.newBrand.id = 0;
            this.newBrand.nombre = '';
            this.newBrand.id_brandcategory = 0;
            this.newBrand.descripcion = '';
            
            this.modalLocalSearchBrandCat = '';
        }
        
        if (!this.showEditModal && !this.showEditAllModal) {
            this.showCreateModal = true;
        }
    },

    async openEditModal(target, tipo = 'item') { 
        if (!target) {
            console.error("No se encontró el registro para editar.");
            return;
        }

        this.modalFormType = tipo; 

        if (tipo === 'item') {
            const matchedCategory = this.categories.find(cat => cat.name === target.category || cat.name === target.categoria);
            const matchedBrand = this.brands.find(b => b.name === target.marca || b.name === target.brand);

            const correctCategoryId = target.id_categoria || target.category_id || (matchedCategory ? matchedCategory.id : 0);
            const correctBrandId = target.id_brand || target.brand_id || (matchedBrand ? matchedBrand.id : 0);

            this.newItem = {
                id: target.id,
                nombre: target.nombre || target.name || '',
                codigo: target.codigo || target.sku || '',
                barcode: target.barcode || '', 
                id_categoria: correctCategoryId,
                id_brand: correctBrandId,
                descripcion: target.descripcion || target.description || '' 
            };

            try {
                const res = await fetchOperationItem(target.id);
                
                if (res && res.status === 'success' && res.data) {
                    this.operationItem = {
                        unidad: res.data.unidad,
                        contenido_empaque: res.data.contenido_empaque,
                        peso: res.data.peso,
                        rendimiento: res.data.rendimiento
                    };
                } else {
                    this.operationItem = { unidad: 0, contenido_empaque: 1.0, peso: 0.0, rendimiento: 100.0 };
                }
            } catch (error) {
                console.error("Error al cargar operation_item:", error);
                this.operationItem = { unidad: 0, contenido_empaque: 1.0, peso: 0.0, rendimiento: 100.0 };
            }

        } 
        else if (tipo === 'brand') {
            const matchedBrandCat = this.brandCategories.find(bc => bc.name === target.categoria_marca);
            const correctBrandCatId = target.brand_category_id || target.id_brandcategory || target.brandcategorie_id || (matchedBrandCat ? matchedBrandCat.id : 0);

            this.newBrand = {
                id: target.id || target.brand_id, 
                nombre: target.nombre || target.name || '',
                id_brandcategory: correctBrandCatId,
                descripcion: target.descripcion || target.description || ''
            };
        }

        if (!this.showCreateModal && !this.showEditAllModal) {
            this.showEditModal = true; 
        }
    },
    
    async openEditAllModal(item) {
        this.modalFormType = 'item'; 

        const matchedCategory = this.categories.find(cat => cat.name === item.category || cat.name === item.categoria);
        const matchedBrand = this.brands.find(b => b.name === item.marca || b.name === item.brand);

        const correctCategoryId = item.id_categoria || item.category_id || (matchedCategory ? matchedCategory.id : 0);
        const correctBrandId = item.id_brand || item.brand_id || (matchedBrand ? matchedBrand.id : 0);


        this.newItem = {
            id: item.id,
            nombre: item.nombre || item.name || '',
            codigo: item.codigo || item.sku || '',
            barcode: item.barcode || '', 
            id_categoria: correctCategoryId,
            id_brand: correctBrandId, 
            descripcion: item.descripcion || item.description || ''
        };
        
        const operationResponse = await fetchOperationItem(item.id); 
    
        // ...
        if (operationResponse && operationResponse.status === 'success' && operationResponse.data) {
            
            const opData = operationResponse.data;

            this.operationItem = {
                unidad: opData.id_unidad || opData.unidad || 0, 
                contenido_empaque: opData.contenido_empaque || 1.0,
                peso: opData.peso || 0.0,
                rendimiento: opData.rendimiento || 100.0,
                tipo_precio: opData.tipo_precio || '',
                precio: opData.precio || 0.0,
                utilidad: opData.utilidad || 0.0,
                moneda: opData.moneda || 'MXN',
                tasa_cuota: opData.tasa_cuota || 0.16
            };

            const tasaNum = Number(opData.tasa_cuota);
            this.ivaType = tasaNum === 0.16 ? '0.16' : (tasaNum === 0.00 ? '0.00' : 'custom');
            
            this.showEditAllModal = true;
            
        } else {
            this.operationItem = {
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
            this.showEditAllModal = true;
        }
    },

    //? ELIMINACIÓN 
    openDeleteModal(target, tipo = 'item') {
        this.deleteTarget = target;       
        this.deleteType = tipo;
        this.deleteName = target.nombre || target.name || 'este registro'; 
        this.showDeleteModal = true;   
    },

    async confirmDelete() {
        if (!this.deleteTarget) return;

        this.isDeleting = true; 

        const deleteConfigs = {
            'item': {
                apiCall: (id) => deleteItemAPI(id),
                onSuccess: () => this.loadItems(),
                successMsg: 'El ítem se ha dado de baja correctamente.'
            },
            'brand': {
                apiCall: () => saveBrand({
                    brand_id: this.deleteTarget.id,
                    brandcategorie_id: this.deleteTarget.id_brandcategory || this.deleteTarget.brandcategorie_id || 1, 
                    name: this.deleteTarget.nombre || this.deleteTarget.name,
                    description: this.deleteTarget.descripcion || this.deleteTarget.description || '',
                    is_active: 0 
                }),
                onSuccess: () => this.loadCatalogs('marcas'),
                successMsg: 'La marca se ha dado de baja correctamente.'
            },
            'category': {
                apiCall: () => setCategoryItem({
                    id: this.deleteTarget.id,
                    code: this.deleteTarget.code || '',
                    category: this.deleteTarget.name || this.deleteTarget.category,
                    is_active: 0,
                    display_order: this.deleteTarget.display_order || 0
                }),
                onSuccess: () => {
                    this.loadCatalogs('categorias');
                    if (this.showCrudModal && this.crudType === 'category') {
                        this.crudItems = this.categories; 
                    }
                },
                successMsg: 'La categoría se ha dado de baja correctamente.'
            },
            'brandCategory': { 
                apiCall: () => saveBrandCategory({
                    brandcategorie_id: this.deleteTarget.id,
                    name: this.deleteTarget.name || this.deleteTarget.nombre,
                    is_active: 0 
                }),
                onSuccess: () => {
                    this.loadCatalogs('categorias_marcas');
                    if (this.showCrudModal && this.crudType === 'brandCategory') {
                        this.crudItems = this.brandCategories;
                    }
                },
                successMsg: 'La categoría de marca se ha dado de baja correctamente.'
            }
        };
        
        try {
            const config = deleteConfigs[this.deleteType];
            if (!config) throw new Error("Tipo de eliminación no soportado");

            const response = await config.apiCall(this.deleteTarget.id);

            if (response && response.status === 'success') {
                config.onSuccess();
                this.successTitle = '¡Eliminado!';
                this.successMessage = config.successMsg;
                this.showSuccessModal = true;
            } else {
                alert(response.error || `Ocurrió un error al intentar eliminar el registro.`);
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

    //? MODALS CRUD (Solo Categorías ahora)
    openCrud(type) {
        this.crudType = type;
        this.crudNewCode = '';
        this.crudNewName = '';
        this.crudEditingId = null;

        const crudConfigs = {
            'category': {
                title: 'Administrar Categorías',
                label: 'Nombre de Categoría',
                placeholder: 'Nueva categoría...',
                showCode: true,
                getItems: () => this.categories
            },
            'brandCategory': {
                title: 'Administrar Categorías de Marca',
                label: 'Categoría de Marca',
                placeholder: 'Nueva categoría de marca...',
                showCode: false,
                getItems: () => this.brandCategories
            }
        };

        const config = crudConfigs[type];
        if (config) {
            this.crudTitle = config.title;
            this.crudNameLabel = config.label;
            this.crudPlaceholder = config.placeholder;
            this.crudShowCode = config.showCode;
            this.crudItems = config.getItems();
        }
        
        this.showCrudModal = true;
    },

    async saveCrudItem() {
        if (!this.crudNewName.trim()) return;

        const saveConfigs = {
            'brandCategory': {
                apiCall: saveBrandCategory,
                payload: { brandcategorie_id: 0, name: this.crudNewName, is_active: 1 },
                refreshTarget: 'categorias_marcas',
                updateItems: () => this.brandCategories
            },
            'category': {
                apiCall: setCategoryItem,
                payload: { 
                    id: 0, 
                    code: this.crudNewCode, 
                    category: this.crudNewName, 
                    is_active: 1, 
                    display_order: 0 
                },
                refreshTarget: 'categorias',
                updateItems: () => this.categories
            }
        };

        try {
            const config = saveConfigs[this.crudType];
            if (!config) return;

            const res = await config.apiCall(config.payload, this.abortController?.signal);
            
            if (res.status === 'success') {
                await this.loadCatalogs(config.refreshTarget); 
                this.crudItems = config.updateItems(); 
            }

            this.crudNewName = '';
            this.crudNewCode = '';

        } catch (error) {
            console.error("Error al guardar en CRUD:", error);
        }
    },

    editCrudItem(item) {
        this.crudEditingId = item.id;
        this.crudInlineName = item.name;
        this.crudInlineCode = item.code || ''; 
    },

    cancelCrudEdit() {
        this.crudEditingId = null;
        this.crudInlineName = '';
        this.crudInlineCode = '';
    },

    async saveInlineCrud(item) {
        if (!this.crudInlineName.trim()) return;

        const updateConfigs = {
            'brandCategory': {
                apiCall: saveBrandCategory,
                payload: { brandcategorie_id: item.id, name: this.crudInlineName, is_active: 1 },
                refreshTarget: 'categorias_marcas',
                updateItems: () => this.brandCategories
            },
            'category': {
                apiCall: setCategoryItem,
                payload: { 
                    id: item.id, 
                    code: this.crudInlineCode, 
                    category: this.crudInlineName, 
                    is_active: 1, 
                    display_order: item.display_order || 0 
                },
                refreshTarget: 'categorias',
                updateItems: () => this.categories
            }
        };

        try {
            const config = updateConfigs[this.crudType];
            if (!config) return;

            const res = await config.apiCall(config.payload, this.abortController?.signal);
            
            if (res.status === 'success') {
                await this.loadCatalogs(config.refreshTarget);
                this.crudItems = config.updateItems();
            }

            this.cancelCrudEdit();

        } catch (error) {
            console.error("Error al actualizar en CRUD:", error);
        }
    },

    async deleteCrudItem(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

        const itemOriginal = this.crudItems.find(i => i.id === id);
        if (!itemOriginal) return;

        const deleteConfigs = {
            'brandCategory': {
                apiCall: saveBrandCategory,
                payload: { 
                    brandcategorie_id: id, 
                    name: itemOriginal.name, 
                    is_active: 0 
                },
                refreshTarget: 'categorias_marcas',
                updateItems: () => this.brandCategories
            },
            'category': {
                apiCall: setCategoryItem,
                payload: { 
                    id: id, 
                    code: itemOriginal.code || '', 
                    category: itemOriginal.name, 
                    is_active: 0,
                    display_order: itemOriginal.display_order || 0 
                },
                refreshTarget: 'categorias',
                updateItems: () => this.categories
            }
        };

        try {
            const config = deleteConfigs[this.crudType];
            if (!config) return;

            const res = await config.apiCall(config.payload, this.abortController?.signal);
            
            if (res.status === 'success') {
                await this.loadCatalogs(config.refreshTarget);
                this.crudItems = config.updateItems();
            } else {
                alert(res?.error || "Ocurrió un error al intentar eliminar el registro.");
            }

        } catch (error) {
            console.error("Error al eliminar en CRUD:", error);
            alert("Error de conexión al intentar eliminar.");
        }
    }
};