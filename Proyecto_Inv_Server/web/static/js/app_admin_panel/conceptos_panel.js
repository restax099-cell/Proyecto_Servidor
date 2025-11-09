//? --- Imports ---

import { fetchData } from '../../utils/get_api.js';
import { buildConceptosTable } from './dynamic_tables.js';


const ID_INFO_DIV = 'info-conceptos';
const ID_THEAD = 'thead-conceptos';
const ID_TBODY = 'tbody-conceptos';
const ID_ABORT_CONTROLLER = new AbortController(); 


(async () => {
    console.log('Cargando conceptos...');
    const infoDiv = document.getElementById(ID_INFO_DIV);
    const tbody = document.getElementById(ID_TBODY); 

    if (!infoDiv || !tbody) {
        console.error('No se encontraron los elementos necesarios en la página.');
        return;
    }

    const uuid = infoDiv.dataset.uuid;
    if (!uuid) {
        console.error('No se pudo encontrar el UUID en la página.');
        tbody.innerHTML = `<tr><td colspan="100%" class="text-center text-danger p-3">Error: No se encontró UUID.</td></tr>`;
        return;
    }

    const url = `/api/get-xml-data/?uuid=${uuid}`;
    const data = await fetchData(url, ID_ABORT_CONTROLLER.signal);

    if (data) {

        buildConceptosTable(data, ID_THEAD, ID_TBODY);
    } else {
        console.error('No se pudieron cargar los conceptos.');
        tbody.innerHTML = `<tr><td colspan="100%" class="text-center text-danger p-3">Error al cargar conceptos.</td></tr>`;
    }
})();