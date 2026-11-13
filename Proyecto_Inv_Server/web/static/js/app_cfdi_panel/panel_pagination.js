
let currentPage = 1;
let rowsPerPage = 50; 
let totalPages = 1;
let onPageChangeCallback = null; 



let btnPrev_top, btnNext_top, pageInput_top, rowsSelect_top, totalPagesLabel_top;

let btnPrev_down, btnNext_down, pageInput_down, rowsSelect_down, totalPagesLabel_down;

function handlePageChange() {
    console.log('hola');
    if (onPageChangeCallback) {
        onPageChangeCallback({
            page: currentPage,
            limit: rowsPerPage
        });
    }
}

function updatePaginationUI() {
    if (pageInput_top) pageInput_top.value = currentPage;
    if (pageInput_down) pageInput_down.value = currentPage;

    if (totalPagesLabel_top) totalPagesLabel_top.textContent = totalPages;
    if (totalPagesLabel_down) totalPagesLabel_down.textContent = totalPages;

    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= totalPages;
    if (btnPrev_top) btnPrev_top.disabled = isFirstPage;
    if (btnPrev_down) btnPrev_down.disabled = isFirstPage;
    if (btnNext_top) btnNext_top.disabled = isLastPage;
    if (btnNext_down) btnNext_down.disabled = isLastPage;

    if (rowsSelect_top) rowsSelect_top.value = rowsPerPage;
    if (rowsSelect_down) rowsSelect_down.value = rowsPerPage;
}

function onNextClick() {
    if (currentPage < totalPages) {
        currentPage++;
        updatePaginationUI();
        handlePageChange();
    }
}

function onPrevClick() {
    if (currentPage > 1) {
        currentPage--;
        updatePaginationUI();
        handlePageChange();
    }
}

function onRowsChange(event) {
    rowsPerPage = parseInt(event.target.value, 10);
    currentPage = 1; 
    updatePaginationUI(); 
    handlePageChange();
}

function onPageInputChange(event) {
    let newPage = parseInt(event.target.value, 10);
    if (isNaN(newPage) || newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    currentPage = newPage;
    updatePaginationUI();
    handlePageChange();
}

export function inicializarPaginacion(onPageChange) {
    btnPrev_top = document.getElementById('btnPrevPage_top');
    btnNext_top = document.getElementById('btnNextPage_top');
    pageInput_top = document.getElementById('pageInput_top');
    rowsSelect_top = document.getElementById('rowsPerPageSelect_top');
    totalPagesLabel_top = document.getElementById('totalPagesLabel_top');

    btnPrev_down = document.getElementById('btnPrevPage_down');
    btnNext_down = document.getElementById('btnNextPage_down');
    pageInput_down = document.getElementById('pageInput_down');
    rowsSelect_down = document.getElementById('rowsPerPageSelect_down');
    totalPagesLabel_down = document.getElementById('totalPagesLabel_down');

    onPageChangeCallback = onPageChange;

    if (btnNext_top) btnNext_top.addEventListener('click', onNextClick);
    if (btnNext_down) btnNext_down.addEventListener('click', onNextClick);

    if (btnPrev_top) btnPrev_top.addEventListener('click', onPrevClick);
    if (btnPrev_down) btnPrev_down.addEventListener('click', onPrevClick);

    if (rowsSelect_top) rowsSelect_top.addEventListener('change', onRowsChange);
    if (rowsSelect_down) rowsSelect_down.addEventListener('change', onRowsChange);

    if (pageInput_top) pageInput_top.addEventListener('change', onPageInputChange);
    if (pageInput_down) pageInput_down.addEventListener('change', onPageInputChange);

    if (rowsSelect_top) {
        rowsPerPage = parseInt(rowsSelect_top.value, 10);
    } else if (rowsSelect_down) {
        rowsPerPage = parseInt(rowsSelect_down.value, 10); 
    }
    
    updatePaginationUI();
}

export function updateTotalPages(newTotalPages) {
    totalPages = newTotalPages > 0 ? newTotalPages : 1; 
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    updatePaginationUI();
}

export function getPaginationState() {
    return {
        page: currentPage,
        limit: rowsPerPage
    };
}

export function resetPagination() {
    currentPage = 1;
}