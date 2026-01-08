const ID_BARRA_BUSQUEDA = 'searchTerm';
const ID_SPINNER = 'search-spinner';
let spinnerElement = null;

function debounce(func, delay = 300) { 
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => { func.apply(this, args); }, delay);
    };
}

export function showSpinner() {
    if (!spinnerElement) spinnerElement = document.getElementById(ID_SPINNER);
    if (spinnerElement) spinnerElement.classList.remove('d-none');
}

export function hideSpinner() {
    if (!spinnerElement) spinnerElement = document.getElementById(ID_SPINNER);
    if (spinnerElement) spinnerElement.classList.add('d-none');
}

export function inicializarBusqueda(onSearchCallback) {
    const barraBusqueda = document.getElementById(ID_BARRA_BUSQUEDA);
    const debouncedSearchHandler = debounce((searchTerm) => {
        onSearchCallback(searchTerm);
    });

    if (barraBusqueda) {
        barraBusqueda.addEventListener('input', (event) => {
            const searchTerm = event.target.value;
            showSpinner();
            debouncedSearchHandler(searchTerm);
        });
    }
}