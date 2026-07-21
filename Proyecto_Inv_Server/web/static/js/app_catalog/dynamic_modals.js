export const modalHelpers = {
    getModalTitle() {
        const titles = {
            //? Diccionario de Estructura de registro complejo (MODAL A)
            'item': 'Registrar Ítem',
            'brand': 'Registrar Marca',
            
            //? Diccionario de Estructura de edición simple (MODAL B)
            'item_category': 'Administrar Categorías de Ítem',
            'brand_category': 'Administrar Categorías de Marca'
        };
        return titles[this.modalFormType] || 'Gestión de Registros';
    },

    getNombreLabel() {
        const labels = {
            //? Modal A
            'item': 'Nombre de Ítem',
            'brand': 'Nombre de la Marca',
            
            //? Modal B
            'item_category': 'Nombre de la Categoría',
            'brand_category': 'Nombre de la Categoría',
        };
        return labels[this.modalFormType] || 'Nombre';
    },

    getSubmitButtonText() {
        return this.isSubmitting ? 'Guardando...' : 'Guardar Cambios';
    },
    
    getPlaceholderText() {
        const placeholders = {
            'item_category': 'Ej. Carnes, Lácteos, Abarrotes...',
            'brand_category': 'Ej. Refrescos, Cervezas, Vinos...'
        };
        return placeholders[this.modalFormType] || 'Escribe aquí...';
    }
};