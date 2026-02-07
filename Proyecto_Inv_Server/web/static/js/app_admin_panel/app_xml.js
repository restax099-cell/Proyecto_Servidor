
import { fetchData } from '../../utils/get_api.js';
import { buildDynamicTable } from './dynamic_tables.js';
import { inicializarFiltros } from './panel_filtros.js';
import { getPaginationState, inicializarPaginacion, resetPagination, updateTotalPages } from './panel_pagination.js';
import { hideSpinner, inicializarBusqueda, showSpinner } from './search_panel.js';


const ID_THEAD = 'thead-panel';
const ID_TBODY = 'tbody-panel';
const ID_MODAL = 'conceptosModal';
const ID_MODAL_BODY = 'conceptosModalBody';

let abortController = new AbortController();

let currentFilters = {}; 

async function loadTableData() {

    abortController.abort(); 
    abortController = new AbortController();

    showSpinner(); 
    console.log('Cargando datos...');
    const pagination = getPaginationState();

    const queryParams = buildQueryString(pagination.limit, pagination.page);

    const url = `/api/cfdi-consultas/?${queryParams}`;
    const responseData = await fetchData(url, abortController.signal);

    if (!responseData) {
        if (!abortController.signal.aborted) {
            hideSpinner();
        }
        return; 
    }

    if (responseData.results) {
        buildDynamicTable(responseData.results, ID_THEAD, ID_TBODY, () => {
            resetPagination();
            loadTableData();   
        });
        updateTotalPages(responseData.total_pages);
    } else {
        const tbody = document.getElementById(ID_TBODY);
        if (tbody) tbody.innerHTML = `<tr><td colspan="100%" class="text-center p-3">Error al cargar datos.</td></tr>`;
        updateTotalPages(1); 
    }
    hideSpinner();
}

function buildQueryString(limit, page) {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('offset', (page - 1) * limit);
    //params.append('nombre_emisor', 'DAMALIJE');

    const browserParams = new URLSearchParams(window.location.search);
    const ordering = browserParams.get('ordering');
    if (ordering) {
        params.append('ordering', ordering);
    } else {
        params.append('ordering', '-fecha'); 
    }

    for (const [key, value] of Object.entries(currentFilters)) {
        if (value) params.append(key, value);
    }
    return params.toString();
}

document.addEventListener('DOMContentLoaded', function() {
    

    const urlBusqueda = new URLSearchParams(window.location.search);
    const receptorUrl = urlBusqueda.get('nombre_receptor');

    if (receptorUrl) {
        currentFilters['nombre_receptor'] = receptorUrl;
    }
    console.log(currentFilters);

    inicializarBusqueda((searchTerm) => {

        if (searchTerm && searchTerm.trim() !== '') {
            currentFilters['search_term'] = searchTerm;
        } else {
            delete currentFilters['search_term'];
        }

        resetPagination();

        loadTableData();
    });

    inicializarFiltros((nuevosFiltros) => {
        // 1. Guardamos lo que haya en el buscador
        const busquedaGuardada = currentFilters.search_term;

        // 2. Reemplazamos TODO con los nuevos filtros (esto borra los viejos)
        currentFilters = {
            ...nuevosFiltros
        };

        // 3. Si había una búsqueda, la volvemos a poner
        if (busquedaGuardada) {
            currentFilters.search_term = busquedaGuardada;
        }

        resetPagination();
        loadTableData(); 
    });
    inicializarPaginacion(() => {
        loadTableData();
    });
   


    const tbody = document.getElementById(ID_TBODY);
    if (tbody) {
        tbody.addEventListener('click', (event) => {
            const fila = event.target.closest('tr');
            
            if (fila && fila.dataset.href) {
                console.log('Redirigiendo a:', fila.dataset.href);
                window.open(fila.dataset.href, '_blank', 'noopener,noreferrer');
            }
        });
    }


    loadTableData(); 

});