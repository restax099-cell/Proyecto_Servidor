import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

Alpine.data('conteoApp', () => ({
    busqueda: '',
    plantillaSeleccionada: 1,
    
    // Datos extraídos exactamente de tu primera imagen
    plantillas: [
        {
            id: 1,
            nombre: 'Conteo diario — cocina',
            descripcion: 'Abarrotes secos, Lácteos, Carnes · 34 items',
            almacen: 'Almacén cocina A',
            frecuencia: 'Diario · L a S',
            limiteCaptura: 'Hoy 11:00 · en 42 min',
            alertaRoja: true,
            inactiva: false
        },
        {
            id: 2,
            nombre: 'Conteo semanal — almacén general',
            descripcion: 'Desechables, Limpieza · 61 items',
            almacen: 'Almacén general',
            frecuencia: 'Semanal · viernes',
            limiteCaptura: '21/08/2026 18:00',
            alertaRoja: false,
            inactiva: false
        },
        {
            id: 3,
            nombre: 'Inventario mensual — bebidas',
            descripcion: 'Bebidas, Vinos y licores · 88 items',
            almacen: 'Bodega bebidas',
            frecuencia: 'Mensual · día 30',
            limiteCaptura: '30/08/2026 20:00',
            alertaRoja: false,
            inactiva: false
        },
        {
            id: 4,
            nombre: 'Conteo trimestral — activos',
            descripcion: 'Utensilios, Loza · 120 items',
            almacen: 'Almacén general',
            frecuencia: 'Trimestral',
            limiteCaptura: 'Fuera de periodo',
            alertaRoja: false,
            inactiva: true
        }
    ],

    // Funciones Computadas / Métodos
    get plantillasFiltradas() {
        if (this.busqueda === '') {
            return this.plantillas;
        }
        const b = this.busqueda.toLowerCase();
        return this.plantillas.filter(p => 
            p.nombre.toLowerCase().includes(b) || 
            p.almacen.toLowerCase().includes(b)
        );
    },

    get textoAlmacenSeleccionado() {
        if(!this.plantillaSeleccionada) return '';
        const plan = this.plantillas.find(p => p.id === this.plantillaSeleccionada);
        if(plan && !plan.inactiva) {
            return `${plan.almacen} · definido por la plantilla`;
        }
        return '';
    },

    seleccionarPlantilla(plantilla) {
        if(!plantilla.inactiva) {
            this.plantillaSeleccionada = plantilla.id;
        }
    },

    obtenerClaseLimite(plantilla) {
        if (plantilla.inactiva) return 'text-muted';
        if (plantilla.alertaRoja) return 'text-danger fw-semibold';
        return '';
    }
}));

window.Alpine = Alpine;
Alpine.start();