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

${p.historico.map(h => {
    // Lógica de datos intacta (NO TOCAR)
    const precios = Array.isArray(h.precios) ? h.precios : JSON.parse(h.precios || "[]");
    const uuids = Array.isArray(h.uuids) ? h.uuids : JSON.parse(h.uuids || "[]");
    const cants = Array.isArray(h.cants) ? h.cants : JSON.parse(h.cants || "[]");
    const units = Array.isArray(h.units) ? h.units : JSON.parse(h.units || "[]");

    const nombreProveedor = p.nombre || '';

    return `
    <div class="mt-3">
        <div class="d-flex align-items-center mb-2">
            <span class="badge rounded-pill bg-light text-secondary border px-3 py-2" style="font-weight: 600; font-size: 0.8rem; letter-spacing: 0.5px;">AÑO ${h.año}</span>
            <div class="flex-grow-1 ms-3" style="height: 1px; background: linear-gradient(to right, #e9ecef, transparent);"></div>
        </div>
        
        <div class="d-flex flex-wrap gap-2 pt-1">
            ${precios.map((precio, i) => {
                const uuid = uuids[i] || '';
                const cantidad = cants[i] || 0;
                const unitario = units[i] || 0;

                return `
                <div class="price-badge-item d-inline-flex align-items-center mb-1" 
                    role="button" 
                    data-proveedor="${nombreProveedor}"
                    data-uuid="${uuid}"
                    onclick="funClic(this)"
                    style="cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);"
                    onmouseover="this.style.transform='translateY(-3px)'"
                    onmouseout="this.style.transform='translateY(0)'">
                    
                    <span class="rounded-start-pill border border-end-0 bg-white text-secondary px-3 py-2" 
                        style="font-size: 0.75rem; font-weight: 500; display: flex; align-items: center; box-shadow: -2px 2px 5px rgba(0,0,0,0.02);">
                        <span style="opacity: 0.7; margin-right: 4px;">Cant:</span> ${cantidad} &times; $${Number(unitario).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </span>

                    <span class="rounded-end-pill text-white px-3 py-2 shadow-sm" 
                        style="font-size: 0.95rem; font-weight: 700; background-color: #212529; border: 1px solid #212529; letter-spacing: 0.5px;">
                        $${Number(precio).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </span>
                    
                </div>`;
            }).join('')}
        </div>
    </div>`;
}).join('')}
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

function funClic(elemento) {
    const proveedor = elemento.getAttribute('data-proveedor');
    const uuid = elemento.getAttribute('data-uuid');
    
    if (typeof redirigirAContexto === 'function') {
        redirigirAContexto(proveedor, uuid, true);
    } else {
        console.error("La función redirigirAContexto no existe");
    }
}

function redirigirAContexto(nombre, uuid, esGasto = false) {
    const nombreLimpio = encodeURIComponent(nombre);
    const pagina = esGasto ? '/gastos-panel/' : '/emitidos-panel/';
    const parametro = esGasto ? 'nombre_emisor' : 'nombre_receptor';
    
    const urlDestino = `${pagina}?${parametro}=${nombreLimpio}&highlight_uuid=${uuid}`;

    window.open(urlDestino, '_blank', 'noopener,noreferrer');
}

document.addEventListener('DOMContentLoaded', () => {

    const contenedor = document.getElementById('contenedorProductos');
    if (contenedor) {
        contenedor.addEventListener('click', (e) => {
            const badge = e.target.closest('.price-badge-item');
            if (badge) {
                const nombre = badge.getAttribute('data-proveedor');
                const uuid = badge.getAttribute('data-uuid'); 
        
                redirigirAContexto(nombre, uuid, true); 
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