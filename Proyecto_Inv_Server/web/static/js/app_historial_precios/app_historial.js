import { inicializarFiltrosFechas } from './filtros_historial.js';
import { hideSpinner, inicializarBusqueda, showSpinner } from './search_historial.js';

let currentFilters = {
    page: 1,
    search_term: '',
    fecha_desde: '',
    fecha_hasta: ''
};

let abortController = null;

async function loadTableData() {
    const contenedor = document.getElementById('contenedorProductos');
    const controles = document.getElementById('controlesPaginacion');

    if (abortController) {
        abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    const params = new URLSearchParams(currentFilters);
    const url = `/api/history-price/?${params.toString()}`;

    try {
        const response = await fetch(url, { signal });
        const data = await response.json();

        renderizarTarjetas(data.results, contenedor);
        renderizarPaginacion(data.total_pages, data.current_page, controles);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Petición vieja cancelada exitosamente');
        } else {
            console.error("Error real:", error);
            contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar datos</div>`;
        }
    } finally {
        if (!signal.aborted) {
            hideSpinner();
        }
    }
}

window.cambiarPagina = (num) => {
    showSpinner();
    currentFilters.page = num;
    loadTableData();
};

function renderizarTarjetas(productos, contenedor) {
    let html = '';
    if (!productos || productos.length === 0) {
        contenedor.innerHTML = '<div class="alert alert-info text-center">No se encontraron productos en este periodo.</div>';
        return;
    }

    productos.forEach((item, index) => {
        html += `
        <div class="card shadow-sm mb-3 border-0">
            <div class="accordion" id="acc${index}">
                <div class="accordion-item border-0">
                    <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#col${index}">
                        <div class="text-start">
                            <h6 class="mb-0 fw-bold text-dark text-uppercase" style="font-size: 0.9rem;">${item.producto}</h6>
                            <small class="text-primary fw-bold">MEJOR PRECIO: $${item.precio_min_global.toLocaleString('es-MX', {minimumFractionDigits: 2})}</small>
                        </div>
                    </button>
                    
                    <div id="col${index}" class="accordion-collapse collapse" data-bs-parent="#acc${index}">
                        <div class="accordion-body bg-light-subtle px-3">
                            ${item.proveedores.map(p => `
                                <div class="bg-white p-3 mb-3 border rounded-3 shadow-sm">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span class="fw-bold text-primary small text-uppercase">${p.nombre}</span>
                                        <span class="badge bg-success-subtle text-success border border-success-subtle">Min: $${p.precio_min_proveedor.toFixed(2)}</span>
                                    </div>
                                    
                                    <hr class="my-2 opacity-25">

                                    ${p.historico.map(h => `
                                        <div class="mt-3">
                                            <div class="d-flex align-items-center mb-2">
                                                <span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis fw-bold px-3">Año ${h.año}</span>
                                                <div class="flex-grow-1 ms-2" style="height: 1px; background-color: #eee;"></div>
                                            </div>
                                            
                                            <div class="d-flex flex-wrap gap-2 pt-1">
                                                ${(Array.isArray(h.precios) ? h.precios : JSON.parse(h.precios || "[]")).map(precio => `
                                                    <span class="price-badge-item" 
                                                        role="button" 
                                                        data-proveedor="${p.nombre}"
                                                        onclick="redirigirAContexto('${p.nombre}', true)"> $${Number(precio).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                                                    </span>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
}

function renderizarPaginacion(total, actual, contenedor) {
    contenedor.innerHTML = `
        <ul class="pagination justify-content-center">
            <li class="page-item ${actual === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="window.cambiarPagina(${actual - 1})">Anterior</button>
            </li>
            <li class="page-item disabled"><span class="page-link">Página ${actual} de ${total}</span></li>
            <li class="page-item ${actual === total ? 'disabled' : ''}">
                <button class="page-link" onclick="window.cambiarPagina(${actual + 1})">Siguiente</button>
            </li>
        </ul>`;
}



function redirigirAContexto(nombre, esGasto = false) {
    const nombreLimpio = encodeURIComponent(nombre);
    let urlDestino = '';

    const pagina = esGasto ? '/gastos-panel/' : '/emitidos-panel/';
    const parametro = esGasto ? 'nombre_emisor' : 'nombre_receptor';
    
    window.location.href = `${pagina}?${parametro}=${nombreLimpio}`;
}

document.addEventListener('DOMContentLoaded', () => {

    const contenedor = document.getElementById('contenedorProductos');
    if (contenedor) {
        contenedor.addEventListener('click', (e) => {
            const badge = e.target.closest('.price-badge-item');
            if (badge) {
                const nombre = badge.getAttribute('data-proveedor');
          
                redirigirAContexto(nombre, true); 
            }
        });
    }

    inicializarBusqueda((searchTerm) => {
        currentFilters.search_term = searchTerm;
        currentFilters.page = 1;
        loadTableData();
    });

    inicializarFiltrosFechas((nuevosFiltros) => {
        showSpinner(); 
        
        currentFilters = { ...currentFilters, ...nuevosFiltros, page: 1 };
        
        loadTableData();
    });

    loadTableData();
});