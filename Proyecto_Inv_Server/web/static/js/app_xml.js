const BASE_API_URL = 'http://3.139.90.118/api/';
const DEFAULT_LIMIT = 500;

const TABLES_CONFIG = {
    cfdi_raw: { 
        name: 'VlxSatCfdiRaw (CFDI Crudos)', 
        endpoint: 'get-all-raw/', 
        orderKey: 'id',
        xmlColumn: 'xmlcontent', 
        description: 'Contiene los datos XML completos de los CFDI.'
    },
    data_xml: { 
        name: 'VlxDataXml (Conceptos)', 
        endpoint: 'get-all-data/', 
        orderKey: 'id_data_xml',
        xmlColumn: null,
        description: 'Contiene los conceptos y detalles de cada CFDI.'
    },
    total_xml: { 
        name: 'VlxTotalDataXml (Totales/Encabezados)', 
        endpoint: 'get-all-total/', 
        orderKey: 'id_total_data_xml',
        xmlColumn: null,
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
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderError(message) {
    const container = document.getElementById('data-container');
    container.innerHTML = `
        <div class="p-6 text-center text-red-600 bg-red-100 border border-red-300 rounded-xl mt-6">
            ${message}
        </div>
    `;
}

function formatCellValue(colName, value) {
    if (value === null) return '-';
    
    const dateFields = ['fecha', 'created_at', 'updated_at', 'void_at'];
    if (dateFields.some(field => colName.includes(field))) {
        try {
            const date = new Date(value);
            if (!isNaN(date)) {
                return date.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }); 
            }
        } catch (e) { /* Fallthrough */ }
    }
    return String(value);
}

function escapeHtmlNative(str) {
    if (typeof str !== 'string') return str;
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function getMinWidthClass(colName) {
    const nameLower = colName.toLowerCase();
    
    if (nameLower.includes('descripcion') || nameLower.includes('uuid')) {
        return 'w-min-lg'; 
    }
    
    if (nameLower.includes('clave') || nameLower.includes('unidad') || nameLower.includes('fecha')) {
        return 'w-min-md'; 
    }
    
    if (nameLower.includes('valorunitario') || nameLower.includes('importe') || nameLower.includes('tasa') || nameLower.includes('descuento') || nameLower.includes('base') || nameLower.includes('id')) {
        return 'w-min-sm'; 
    }
    
    return 'w-min-md'; 
}

function formatCellValue(colName, value, isXmlContent) {
    if (value === null) return '-';
    
    const strValue = String(value);

    if (isXmlContent) {
        const escapedContent = escapeHtmlNative(strValue);
        return `<span>${escapedContent}</span>`;
    }

    const dateFields = ['fecha', 'created_at', 'updated_at', 'void_at'];
    if (dateFields.some(field => colName.includes(field))) {
        try {
            const date = new Date(strValue);
            if (!isNaN(date)) {
                return date.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }); 
            }
        } catch (e) { /* Fallthrough */ }
    }
    
    // Para el resto del texto, devolvemos el valor normal (no contiene < o > relevantes)
    return strValue;
}

function renderPaginationControls() {
    const isPrevDisabled = currentPage <= 1 || isLoading;
    const isNextDisabled = currentPage >= totalPages || isLoading;

    return `
        <div class="flex justify-between items-center p-4 bg-white border-t rounded-b-xl shadow-md">
            <p class="text-sm text-gray-600">
                Mostrando ${totalRecords > 0 ? DEFAULT_LIMIT : 0} registros (Página ${currentPage.toLocaleString()}) de ${totalRecords.toLocaleString()} registros (${totalPages.toLocaleString()} páginas totales).
            </p>
            <div class="flex items-center space-x-3">
                <button
                    id="prev-page"
                    onclick="changePage(${currentPage - 1})"
                    ${isPrevDisabled ? 'disabled' : ''}
                    class="p-2 border rounded-full bg-gray-50 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                    class="p-2 border rounded-full bg-gray-50 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;
}

function updatePaginationButtons() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (!prevBtn || !nextBtn) return;

    prevBtn.disabled = currentPage <= 1 || isLoading;
    nextBtn.disabled = currentPage >= totalPages || isLoading;
}

function renderDataTable(data) {
    const config = TABLES_CONFIG[activeTable];
    const container = document.getElementById('data-container');

    if (data.length === 0 && totalRecords > 0) {
            renderError(`La página ${currentPage} no contiene datos.`);
            container.innerHTML = renderPaginationControls();
            return;
    }

    if (data.length === 0 && totalRecords === 0 && !isLoading) {
            container.innerHTML = `
            <div class="p-6 text-center text-gray-600 bg-white border border-gray-300 rounded-xl mt-6">
                No se encontraron registros para esta tabla: ${config.name}.
            </div>
            `;
            return;
    }
    
    const columns = Object.keys(data[0] || {});
    
    const tableContent = `
        <h2 class="text-2xl font-semibold text-gray-800 mb-3">${config.name}</h2>
        <p class="text-sm text-gray-500 mb-4">${config.description}</p>
        
        ${renderPaginationControls()}

        <div class="responsive-table-wrapper shadow-xl bg-white rounded-xl">
            <table class="w-full text-sm text-left text-gray-500 border-collapse table-auto">
                
                <thead class="text-xs text-gray-700 uppercase bg-gray-200">
                    <tr>
                        ${columns.map(col => {
                            const isXmlColumn = config.xmlColumn && col.toLowerCase() === config.xmlColumn.toLowerCase();
                            
                            let headerClass = ' whitespace-nowrap';
                            if (isXmlColumn) {
                                headerClass = ' xml-content-cell';
                            } else if (activeTable === 'data_xml' || activeTable === 'total_xml') {
                                // Aplicar anchos mínimos solo a las tablas de Conceptos y Totales
                                headerClass += ' ' + getMinWidthClass(col);
                            }

                            return `
                                <th scope="col" class="px-6 py-3 border-r border-gray-300 last:border-r-0 ${headerClass}">
                                    ${col.replace(/_/g, ' ')}
                                </th>
                            `;
                        }).join('')}
                    </tr>
                </thead>
                
                <tbody>
                    ${data.map((row, rowIndex) => { 
                        return `
                            <tr class="bg-white border-b hover:bg-gray-50 transition-colors duration-150">
                                ${columns.map(col => {
                                    const value = row[col];
                                    const isXmlColumn = config.xmlColumn && col.toLowerCase() === config.xmlColumn.toLowerCase();

                                    let cellClass = `table-data-cell border-r border-gray-100 last:border-r-0`;
                                    
                                    if (col === config.orderKey) {
                                        cellClass += ' font-bold text-blue-800';
                                    } else {
                                        cellClass += ' text-gray-900';
                                    }

                                    if (isXmlColumn) {
                                        cellClass += ' xml-content-cell';
                                    } else {
                                        cellClass += ' truncate-cell';
                                        if (activeTable === 'data_xml' || activeTable === 'total_xml') {
                                                cellClass += ' ' + getMinWidthClass(col);
                                        }
                                    }

                                    const titleAttribute = isXmlColumn ? '' : `title="${String(value === null ? '' : value)}"`;

                                    return `
                                        <td 
                                            class="${cellClass}"
                                            ${titleAttribute}
                                        >
                                            ${formatCellValue(col, value, isXmlColumn)}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        ${renderPaginationControls()}
    `;
    
    container.innerHTML = tableContent;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    const tableContainer = document.querySelector('.responsive-table-wrapper');
    if (tableContainer) {
            tableContainer.scrollLeft = 0;
            tableContainer.scrollTop = 0;
    }
}

async function fetchData(page) {
    isLoading = true;
    renderLoading();

    const config = TABLES_CONFIG[activeTable];
    const url = `${BASE_API_URL}${config.endpoint}?page=${page}&limit=${DEFAULT_LIMIT}`;

    try {
        const response = await fetch(url);

        if (response.status === 404) {
            throw new Error(`Página ${page} fuera de rango o vacía.`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en el servidor: HTTP ${response.status}. Detalle: ${errorText.substring(0, 100)}...`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Error de la aplicación: ${result.error}`);
        }

        currentPage = result.current_page || page;
        totalPages = result.total_pages || 1;
        totalRecords = result.total_records || 0;

        renderDataTable(result.results || []);

    } catch (error) {
        console.error("Error al cargar datos:", error);
        renderError(`Error al cargar ${config.name}: ${error.message}`);

        if (error.message.includes('fuera de rango') && page !== 1) {
            currentPage = 1;
            await fetchData(1); // await asegura que isLoading se maneje correctamente
        }
    } finally {
        isLoading = false;
        updatePaginationButtons();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage || isLoading) {
        return;
    }
    currentPage = newPage;
    fetchData(currentPage);
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

window.onload = function() {
    renderSelector(); 
    fetchData(currentPage); 
};

window.changePage = changePage;
window.changeTable = changeTable;