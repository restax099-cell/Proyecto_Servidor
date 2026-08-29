import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

Alpine.data('detalleConteoApp', () => ({
    busqueda: '',
    filtro: 'Todos', // Todos, Pendientes, Contados

    // Datos iniciales basados en la imagen
    categorias: [
        {
            nombre: 'Abarrotes secos',
            codigo: 'ABS',
            items: [
                { sku: 'ABS-0142', descripcion: 'Arroz grano largo', codigoBarras: '7501055310128', unidad: 'KG', cantidad: 36, estado: 'Contado' },
                { sku: 'ABS-0203', descripcion: 'Azúcar refinada', codigoBarras: '7501030405118', unidad: 'CJA', cantidad: 4, estado: 'Contado' },
                { sku: 'ABS-0311', descripcion: 'Harina de trigo', codigoBarras: '7501099220145', unidad: 'KG', cantidad: null, estado: 'Pendiente' },
            ]
        },
        {
            nombre: 'Lácteos',
            codigo: 'LAC',
            items: [
                { sku: 'LAC-0031', descripcion: 'Leche entera 1 L', codigoBarras: '7501020304012', unidad: 'PZA', cantidad: 112, estado: 'Contado' },
                { sku: 'LAC-0088', descripcion: 'Queso manchego rebanado', codigoBarras: '7501020309887', unidad: 'KG', cantidad: 7.5, estado: 'Editando' },
            ]
        },
        {
            nombre: 'Carnes y pescados',
            codigo: 'CAR',
            items: [
                { sku: 'CAR-0012', descripcion: 'Pechuga de pollo', codigoBarras: '7501077410023', unidad: 'KG', cantidad: null, estado: 'Pendiente' }
            ]
        }
    ],

    // Propiedades Computadas para Resumen General
    get totalItems() {
        return this.categorias.reduce((acc, cat) => acc + cat.items.length, 0);
    },
    
    get itemsContados() {
        return this.categorias.reduce((acc, cat) => {
            return acc + cat.items.filter(i => i.estado === 'Contado' || i.estado === 'Editando').length;
        }, 0);
    },
    
    get porcentajeAvance() {
        if (this.totalItems === 0) return 0;
        return (this.itemsContados / this.totalItems) * 100;
    },

    // Métodos auxiliares para la vista
    contadosPorCategoria(categoria) {
        return categoria.items.filter(i => i.estado === 'Contado' || i.estado === 'Editando').length;
    },

    claseEstado(item) {
        if (item.estado === 'Pendiente') return 'badge-danger';
        if (item.estado === 'Editando') return 'badge-brand';
        return 'badge-dark'; // Contado
    },

    // Lógica de filtrado (Búsqueda + Toggle Buttons)
    get categoriasFiltradas() {
        let search = this.busqueda.toLowerCase();
        
        return this.categorias.map(cat => {
            let filtrados = cat.items.filter(item => {
                // 1. Filtro por texto
                let coincideTexto = item.sku.toLowerCase().includes(search) || 
                                    item.descripcion.toLowerCase().includes(search) || 
                                    item.codigoBarras.includes(search);
                
                // 2. Filtro por estado (Botones Toggle)
                let coincideEstado = true;
                if (this.filtro === 'Pendientes') {
                    coincideEstado = item.estado === 'Pendiente';
                } else if (this.filtro === 'Contados') {
                    coincideEstado = item.estado === 'Contado' || item.estado === 'Editando';
                }

                return coincideTexto && coincideEstado;
            });

            // Devolvemos un nuevo objeto categoría solo con los items que pasaron el filtro
            return { ...cat, itemsFiltrados: filtrados };
        });
    },

    // Acciones de interacción (+, -, input manual)
    incrementar(item) {
        let val = parseFloat(item.cantidad);
        if (isNaN(val)) val = 0;
        item.cantidad = val + 1;
        this.actualizarEstado(item);
    },

    decrementar(item) {
        let val = parseFloat(item.cantidad);
        if (isNaN(val) || val <= 0) {
            item.cantidad = 0;
        } else {
            item.cantidad = val - 1;
        }
        this.actualizarEstado(item);
    },

    actualizarEstado(item) {
        // Si el input está vacío o nulo
        if (item.cantidad === '' || item.cantidad === null) {
            item.estado = 'Pendiente';
            return;
        }
        
        // Si tiene un número, lo marcamos como editando o contado
        item.estado = 'Editando';
    }
}));

window.Alpine = Alpine;
Alpine.start();