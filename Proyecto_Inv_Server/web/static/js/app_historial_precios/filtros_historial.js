

export function inicializarFiltrosFechas(onFilterChange) {
    const inputDesde = document.getElementById('fechaDesde');
    const inputHasta = document.getElementById('fechaHasta');

    if (inputDesde) {
        inputDesde.addEventListener('change', (e) => {
            onFilterChange({ fecha_desde: e.target.value });
        });
    }

    if (inputHasta) {
        inputHasta.addEventListener('change', (e) => {
            onFilterChange({ fecha_hasta: e.target.value });
        });
    }
}