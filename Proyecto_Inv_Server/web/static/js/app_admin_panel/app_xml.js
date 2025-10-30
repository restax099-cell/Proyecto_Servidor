// --- 1. Imports ---
import { fetchData } from '../../utils/get_api.js';
import { buildDynamicTable } from './dynamic_tables.js';
import { inicializarFiltros } from './panel_filtros.js';
import { inicializarPaginacion, updateTotalPages, getPaginationState, resetPagination } from './panel_pagination.js';
import { inicializarBusqueda, showSpinner, hideSpinner } from './search_panel.js';


const ID_THEAD = 'thead-panel';
const ID_TBODY = 'tbody-panel';


let abortController = new AbortController();

let currentFilters = {}; 



async function loadTableData() {

    abortController.abort(); 
    abortController = new AbortController();

    showSpinner(); 
    console.log('Cargando datos...');
    const pagination = getPaginationState();
    
    const queryParams = buildQueryString(pagination.limit, pagination.page);
    const url = `http://3.139.90.118/api/cfdi-consultas/?${queryParams}`; 

    const responseData = await fetchData(url, abortController.signal);

    if (!responseData) {
        if (!abortController.signal.aborted) {
            hideSpinner();
        }
        return; 
    }

    if (responseData.results) {
        buildDynamicTable(responseData.results, ID_THEAD, ID_TBODY);
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
    for (const [key, value] of Object.entries(currentFilters)) {
        if (value) params.append(key, value);
    }
    return params.toString();
}




document.addEventListener('DOMContentLoaded', function() {

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
        currentFilters = nuevosFiltros;
        resetPagination();
        loadTableData(); 
    });
    inicializarPaginacion(() => {
        loadTableData();
    });
    loadTableData(); 

});