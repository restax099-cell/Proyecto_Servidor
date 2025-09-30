/**
 * Lógica principal para el panel administrativo de datos XML.
 *
 * Esta aplicación interactúa con la API de Django para cargar datos paginados 
 * y dinámicos basados en la tabla seleccionada.
 */

// NOTA: BASE_API_URL debe ser relativa si el JS está en el mismo dominio
const BASE_API_URL = window.location.origin + '/api/';
const DEFAULT_LIMIT = 500;

const TABLES_CONFIG = {
    cfdi_raw: { 
        name: 'VlxSatCfdiRaw (CFDI Crudos)', 
        endpoint: 'get-all-raw/', 
        orderKey: 'id', 
        description: 'Contiene los datos XML completos de los CFDI.',
        xmlColumn: 'XMLCONTENT' 
    },
    data_xml: { 
        name: 'VlxDataXml (Conceptos)', 
        endpoint: 'get-all-data/', 
        orderKey: 'id_data_xml', 
        description: 'Contiene los conceptos y detalles de cada CFDI.'
    },
    total_xml: { 
        name: 'VlxTotalDataXml (Totales/Encabezados)', 
        endpoint: 'get-all-total/', 
        orderKey: 'id_total_data_xml', 
        description: 'Contiene el encabezado y los totales resumidos del CFDI.'
    }
};

let activeTable = 'cfdi_raw';
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
let isLoading = false;


function renderLoading() {
    const container = document.getElementById('data-container');
    container.innerHTML = `
        <div class="p-10 text-center mt-6 bg-white shadow-md rounded-xl">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-blue-500"></i>
            <p class="mt-3 text-gray-600">Cargando datos de ${TABLES_CONFIG[activeTable].name}...</p>
        </div>
    `;
    lucide.createIcons(); 
}

function renderError(message) {
    const container = document.getElementById('data-container');
    container.innerHTML = `
        <div class="p-6 text-center text-red-600 bg-red-100 border border-red-300 rounded-xl mt-6">
            ${message}
        </div>
    `;
}

/**
 * Aplica formato, limpieza y truncamiento al contenido XML.
 * @param {string} value - El contenido XML crudo.
 * @returns {string} El contenido truncado para la vista previa.
 */
function formatXmlContent(value) {
    if (typeof value !== 'string') return String(value);

    // 1. Limpiar el XML (eliminar saltos de línea y espacios excesivos)
    // Se eliminó .trim() para evitar cortar etiquetas iniciales.
    const cleanedValue = value.replace(/\s+/g, ' '); 
    
    // 2. Truncar a una vista previa de 100 caracteres
    const preview = cleanedValue.substring(0, 100);
    
    // Se utiliza '<*>' para indicar que es contenido XML.
    return (cleanedValue.length > 0 ? '<*>' : '-') + ' ' + preview + (cleanedValue.length > 100 ? '... [Scroll para ver más]' : '');
}

/**
 * Formatea el valor de una celda basado en el nombre de la columna.
 */
function formatCellValue(colName, value) {
    if (value === null || value === undefined) return '-';
    
    const currentConfig = TABLES_CONFIG[activeTable];
    
    // Manejo de la columna XML 
    if (currentConfig.xmlColumn && colName.toUpperCase() === currentConfig.xmlColumn.toUpperCase()) {
        return formatXmlContent(value);
    }
    
    // Manejo de fechas
    const dateFields = ['fecha', 'created_at', 'updated_at', 'void_at'];
    if (dateFields.some(field => colName.toLowerCase().includes(field.toLowerCase()))) {
        try {
            // Manejo de fechas que vienen como string de la API (ej: '2023-10-27T10:00:00')
            return new Date(value).toLocaleString('es-ES', { 
                 day: '2-digit', month: '2-digit', year: 'numeric', 
                 hour: '2-digit', minute: '2-digit', second: '2-digit', 
                 hour12: false
             });
        } catch (e) {
            return String(value);
        }
    }
    
    // Manejo de números (con decimales)
    if (typeof value === 'number' && !isNaN(value)) {
        return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    return String(value);
}

function renderPaginationControls() {
    const isPrevDisabled = currentPage <= 1 || isLoading;
    const isNextDisabled = currentPage >= totalPages || isLoading;

    return `
        <div id="pagination-controls" class="flex justify-between items-center p-4 bg-white border-t rounded-b-xl shadow-md">
            <p class="text-sm text-gray-600">
                Mostrando ${DEFAULT_LIMIT} registros (Página ${currentPage.toLocaleString()}) de ${totalRecords.toLocaleString()} registros (${totalPages.toLocaleString()} páginas totales).
            </p>
            <div class="flex items-center space-x-3">
                <button
                    id="prev-page"
                    onclick="changePage(${currentPage - 1})"
                    ${isPrevDisabled ? 'disabled' : ''}
                    class="p-2 border rounded-full bg-gray-50 hover:bg-gray-200 transition ${isPrevDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                >
                    <i data-lucide="chevron-left" class="w-5 h-5"></i>
                </button>
                <span class="text-sm font-semibold text-gray-700">
                    Página ${currentPage.toLocaleString()} de ${totalPages.toLocaleString()}
                </span>
                <button
                    id="next-page"
                    onclick="changePage(${currentPage + 1})"
                    ${isNextDisabled ? 'disabled' : ''}
                    class="p-2 border rounded-full bg-gray-50 hover:bg-gray-200 transition ${isNextDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                >
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDataTable(data) {
    const config = TABLES_CONFIG[activeTable];
    const container = document.getElementById('data-container');

    if (!data || data.length === 0) {
        if (totalRecords > 0) {
            renderError(`La página ${currentPage} no contiene datos. Total de registros conocidos: ${totalRecords.toLocaleString()}.`);
        } else if (!isLoading) {
            container.innerHTML = `
                <div class="p-6 text-center text-gray-600 bg-white border border-gray-300 rounded-xl mt-6">
                    No se encontraron registros para esta tabla: ${config.name}.
                </div>
            `;
        }
        return;
    }
    
    // OBTENER COLUMNAS DEL PRIMER REGISTRO PARA DEFINIR EL ORDEN
    const columns = Object.keys(data[0]); 
    
    const tableContent = `
        <h2 class="text-2xl font-semibold text-gray-800 mb-3">${config.name}</h2>
        <p class="text-sm text-gray-500 mb-4">${config.description}</p>
        
        ${renderPaginationControls()}

        <div class="data-table-container shadow-xl overflow-x-auto rounded-t-xl mt-4">
            <table class="text-sm text-left text-gray-500 border-collapse min-w-full">
                
                <!-- Encabezados -->
                <thead class="text-xs text-gray-700 uppercase bg-gray-200 sticky top-0 z-10">
                    <tr>
                        ${columns.map(col => `<th scope="col" class="px-6 py-3 border-r border-gray-300 last:border-r-0">${col.replace(/_/g, ' ')}</th>`).join('')}
                    </tr>
                </thead>
                
                <!-- Cuerpo (filas de datos) -->
                <tbody>
                    ${data.map(row => `
                        <tr class="bg-white border-b hover:bg-gray-50 transition-colors duration-150">
                            ${
                                // RECORRER LAS COLUMNAS EN EL ORDEN DEFINIDO EN 'columns'
                                columns.map(col => {
                                    // Se verifica que la clave exista en la fila, si no existe es null
                                    const value = row[col] !== undefined ? row[col] : null; 
                                    const isXmlColumn = config.xmlColumn && col.toUpperCase() === config.xmlColumn.toUpperCase();
                                    
                                    // Aplicación de clases CSS
                                    let cellClass = `table-data-cell truncate-cell border-r border-gray-100 last:border-r-0 ${col === config.orderKey ? 'font-bold text-blue-800' : 'text-gray-900'}`;
                                    
                                    if (isXmlColumn) {
                                        cellClass += ' xml-content-cell font-mono text-xs'; 
                                    }
                                    
                                    return `
                                    <td class="${cellClass}" title="${String(value === null ? '' : value)}">
                                        ${formatCellValue(col, value)}
                                    </td>
                                    `;
                                }).join('')
                            }
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${renderPaginationControls()}
    `;
    
    container.innerHTML = tableContent;
    lucide.createIcons();
    
    // Mantiene la posición de scroll en la tabla
    const tableContainer = document.querySelector('.data-table-container');
    if (tableContainer) {
        tableContainer.scrollLeft = 0; 
        // Solo resetear scroll vertical si la página cambia
        if (tableContainer.dataset.currentPage !== String(currentPage)) {
            tableContainer.scrollTop = 0; 
            tableContainer.dataset.currentPage = String(currentPage);
        }
    }
}

function renderSelector() {
    const selectorDiv = document.getElementById('table-selector');

    selectorDiv.innerHTML = Object.entries(TABLES_CONFIG).map(([key, config]) => {
        const isActive = key === activeTable;
        return `
            <button
                onclick="changeTable('${key}')"
                class="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm
                ${isActive 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300 transform scale-[1.02]' 
                    : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }"
            >
                ${config.name}
            </button>
        `;
    }).join('');
}

async function fetchData(page) {
    if (isLoading) return; // Evita llamadas duplicadas
    
    isLoading = true;
    renderLoading();
    
    const config = TABLES_CONFIG[activeTable];
    // Asegúrate de usar la página correcta para la solicitud
    const pageToFetch = page || currentPage;
    const url = `${BASE_API_URL}${config.endpoint}?page=${pageToFetch}&limit=${DEFAULT_LIMIT}`;
    
    try {
        const response = await fetch(url);

        if (response.status === 404) {
             // 404 puede significar que no hay más páginas
             if (pageToFetch > 1 && pageToFetch > totalPages) {
                 throw new Error(`Página ${pageToFetch} fuera de rango o vacía.`);
             } else if (pageToFetch === 1 && totalRecords === 0) {
                 // Si es la página 1 y la API devuelve 404, asumimos que no hay registros
                 totalRecords = 0;
                 totalPages = 1;
                 currentPage = 1;
                 renderDataTable([]);
                 return;
             }
             
             // Si es un 404 inesperado, se muestra el error general
             throw new Error(`El endpoint respondió 404 (No Encontrado)`);
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en el servidor: HTTP ${response.status}. Detalle: ${errorText.substring(0, 100)}...`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Error de la aplicación: ${result.error}`);
        }
        
        // El campo 'results' es MANDATORIO y debe ser un array
        if (!Array.isArray(result.results)) {
             throw new Error("La respuesta de la API no contiene el array 'results' o es inválida.");
        }

        currentPage = result.current_page || pageToFetch;
        totalPages = result.total_pages || 1;
        totalRecords = result.total_records || 0;

        renderDataTable(result.results);
        
    } catch (error) {
        console.error("Error al cargar datos:", error);
        renderError(`Error al cargar ${config.name}: ${error.message}`);
        
        // Si la página es inaccesible o fuera de rango, intenta volver a la página 1.
        if (error.message.includes('fuera de rango') && pageToFetch !== 1) {
            console.log("Intentando volver a la página 1...");
            changePage(1); 
        }
    } finally {
        isLoading = false;
    }
}

function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoading) {
        return;
    }
    fetchData(newPage);
}

function changeTable(newTableKey) {
    if (activeTable === newTableKey || isLoading) return;
    activeTable = newTableKey;
    currentPage = 1;
    totalPages = 1;
    totalRecords = 0;
    renderSelector(); 
    fetchData(currentPage);
}

window.onload = function() {
    renderSelector(); 
    fetchData(currentPage); 
};

window.changePage = changePage;
window.changeTable = changeTable;
