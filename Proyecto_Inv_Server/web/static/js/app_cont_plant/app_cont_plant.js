import Alpine from 'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/module.esm.js';

Alpine.data('plantillasApp', () => ({
    plantillaActiva: 'PC-01',
    frecuencia: 'Diario',
    diasSeleccionados: ['L', 'Ma', 'Mi', 'J', 'V', 'S'], // D no está seleccionado

    listaPlantillas: [
        { id: 'PC-01', clave: 'PC-01', nombre: 'Conteo diario — cocina', activa: true, detalle: 'Almacén cocina A · diario · límite 11:00' },
        { id: 'PC-02', clave: 'PC-02', nombre: 'Conteo semanal — general', activa: false, detalle: 'Almacén general · viernes · límite 18:00' },
        { id: 'PC-03', clave: 'PC-03', nombre: 'Inventario mensual — bebidas', activa: false, detalle: 'Bodega bebidas · día 30 · límite 20:00' },
        { id: 'PC-04', clave: 'PC-04', nombre: 'Conteo trimestral — activos', activa: false, detalle: 'Inactiva' },
    ],

    catalogos: [
        { codigo: 'ABS', categoria: 'Abarrotes secos', items: 12, orden: 1 },
        { codigo: 'LAC', categoria: 'Lácteos', items: 9, orden: 2 },
        { codigo: 'CAR', categoria: 'Carnes y pescados', items: 13, orden: 3 },
    ],

    toggleDia(dia) {
        if (this.diasSeleccionados.includes(dia)) {
            this.diasSeleccionados = this.diasSeleccionados.filter(d => d !== dia);
        } else {
            this.diasSeleccionados.push(dia);
        }
    }
}));

window.Alpine = Alpine;
Alpine.start();