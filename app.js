const SUPABASE_URL = 'https://hleezrlqvdnwatwddcih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWV6cmxxdmRud2F0d2RkY2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTczOTQsImV4cCI6MjA3MDA3MzM5NH0.ah3ybvbk7_HVrsOc_esK_BolcIyzY1EN7wzSb0qYBL8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const palabraLibreInput = document.getElementById('palabraLibre');
const anioInput = document.getElementById('anio');
const tribunalInput = document.getElementById('tribunal');
const palabrasClaveInput = document.getElementById('palabrasClave');
const categoriaSelect = document.getElementById('categoria');
const subcategoriaInput = document.getElementById('subcategoria');
const buscarBtn = document.getElementById('buscar');
const resultadosDiv = document.getElementById('resultados');
const loadingIndicator = document.getElementById('loadingIndicator');
const paginationContainer = document.getElementById('pagination');

// Suggestion containers
const tribunalSugerencias = document.getElementById('tribunalSugerencias');
const subcategoriaSugerencias = document.getElementById('subcategoriaSugerencias');
const palabrasClavesSugerencias = document.getElementById('palabrasClavesSugerencias');

// Control elements
const toggleAdvancedBtn = document.getElementById('toggleAdvanced');
const clearFiltersBtn = document.getElementById('clearFilters');
const advancedFilters = document.getElementById('advancedFilters');

// Pagination variables
let currentPage = 1;
let totalResults = 0;
const resultsPerPage = 10;
let allResults = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    cargarCategorias();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Search functionality
    buscarBtn.addEventListener('click', buscarFallos);
    
    // Enter key search
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.target.closest('.sugerencias')) {
            buscarFallos();
        }
    });

    // Advanced filters toggle
    toggleAdvancedBtn.addEventListener('click', function() {
        const isVisible = advancedFilters.classList.contains('show');
        if (isVisible) {
            advancedFilters.classList.remove('show');
            this.innerHTML = '<i class="fas fa-cog"></i> Filtros Avanzados';
        } else {
            advancedFilters.classList.add('show');
            this.innerHTML = '<i class="fas fa-cog"></i> Ocultar Filtros';
        }
    });

    // Clear filters
    clearFiltersBtn.addEventListener('click', clearAllFilters);

    // Autocomplete
    tribunalInput.addEventListener('input', () => autocompletar(tribunalInput, tribunalSugerencias, 'Tribunal'));
    subcategoriaInput.addEventListener('input', () => autocompletar(subcategoriaInput, subcategoriaSugerencias, 'Subcategoria'));
    palabrasClaveInput.addEventListener('input', () => autocompletar(palabrasClaveInput, palabrasClavesSugerencias, 'Palabras_Clave'));

    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideAllSuggestions();
        }
    });
}

// Load categories
async function cargarCategorias() {
    try {
        const { data, error } = await supabase
            .from('bas_fallos')
            .select('Categoria');

        if (error) throw error;

        const categoriasUnicas = [...new Set(data.map(item => item.Categoria).filter(Boolean))];
        categoriasUnicas.sort();
        
        categoriasUnicas.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
        showNotification('Error cargando categorías', 'error');
    }
}

// Autocomplete functionality
async function autocompletar(input, sugerenciasDiv, columna) {
    const valor = input.value.trim().toLowerCase();
    
    if (valor.length < 2) {
        sugerenciasDiv.classList.remove('show');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('bas_fallos')
            .select(columna)
            .ilike(columna, `%${valor}%`)
            .limit(50); // Aumentamos el límite para obtener una mejor muestra

        if (error) throw error;

        let sugerenciasUnicas;

        if (columna === 'Palabras_Clave') {
            // Procesamiento especial para palabras clave individuales
            const todasLasPalabras = data
                .flatMap(item => item.Palabras_Clave ? item.Palabras_Clave.split(',') : [])
                .map(kw => kw.trim())
                .filter(kw => kw); // Eliminar strings vacíos
            
            const palabrasCoincidentes = [...new Set(todasLasPalabras.filter(kw => kw.toLowerCase().includes(valor)))];
            sugerenciasUnicas = palabrasCoincidentes.slice(0, 10); // Limitar el número de sugerencias
        } else {
            // Comportamiento normal para otras columnas
            sugerenciasUnicas = [...new Set(data.map(item => item[columna]).filter(Boolean))];
        }
        
        sugerenciasDiv.innerHTML = '';
        
        if (sugerenciasUnicas.length > 0) {
            sugerenciasUnicas.forEach(sugerencia => {
                const div = document.createElement('div');
                div.textContent = sugerencia;
                div.addEventListener('click', () => {
                    input.value = sugerencia;
                    sugerenciasDiv.classList.remove('show');
                });
                sugerenciasDiv.appendChild(div);
            });
            sugerenciasDiv.classList.add('show');
        } else {
            sugerenciasDiv.classList.remove('show');
        }
    } catch (error) {
        console.error('Error en autocompletar:', error);
    }
}


// Hide all suggestions
function hideAllSuggestions() {
    tribunalSugerencias.classList.remove('show');
    subcategoriaSugerencias.classList.remove('show');
    palabrasClavesSugerencias.classList.remove('show');
}

// Search functionality
async function buscarFallos() {
    // Show loading
    showLoading();
    hideAllSuggestions();
    
    try {
        let query = supabase.from('bas_fallos').select('*');

        // Apply filters
        if (anioInput.value) {
            query = query.like('Fecha_Fallo', `${anioInput.value}%`);
        }
        if (tribunalInput.value) {
            query = query.ilike('Tribunal', `%${tribunalInput.value}%`);
        }
        if (palabrasClaveInput.value) {
            query = query.ilike('Palabras_Clave', `%${palabrasClaveInput.value}%`);
        }
        if (categoriaSelect.value) {
            query = query.eq('Categoria', categoriaSelect.value);
        }
        if (subcategoriaInput.value) {
            query = query.ilike('Subcategoria', `%${subcategoriaInput.value}%`);
        }
        if (palabraLibreInput.value) {
            const searchTerm = palabraLibreInput.value.trim();
            query = query.or(`Nombre.ilike.%${searchTerm}%,Caratula.ilike.%${searchTerm}%,Resumen.ilike.%${searchTerm}%,Sumarios.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('Fecha_Fallo', { ascending: false });

        if (error) throw error;

        allResults = data || [];
        totalResults = allResults.length;
        currentPage = 1;
        
        mostrarResultados();
        
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        showNotification('Error al realizar la búsqueda', 'error');
        hideLoading();
        resultadosDiv.innerHTML = '';
        resultadosDiv.classList.remove('show');
    }
}

// Display results
function mostrarResultados() {
    hideLoading();
    
    if (totalResults === 0) {
        mostrarSinResultados();
        return;
    }

    const startIndex = (currentPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    const currentResults = allResults.slice(startIndex, endIndex);

    let html = `
        <div class="results-header">
            <h2><i class="fas fa-file-alt"></i> Resultados de la búsqueda</h2>
            <span class="results-count">${totalResults} ${totalResults === 1 ? 'resultado' : 'resultados'}</span>
        </div>
        <div class="results-container">
    `;

    currentResults.forEach(fallo => {
        const palabrasClave = fallo.Palabras_Clave ? fallo.Palabras_Clave.split(',').map(p => p.trim()).filter(p => p) : [];
        
        html += `
            <div class="fallo">
                <div class="fallo-header">
                    <div class="fallo-title">
                        <h2>${fallo.Nombre}</h2>
                        <div class="fallo-caratula">${fallo.Caratula}</div>
                        
                        <div class="fallo-meta">
                            <div class="fallo-meta-item">
                                <i class="fas fa-building"></i>
                                <span>${fallo.Tribunal}</span>
                            </div>
                            <div class="fallo-meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>${fallo.Fecha_Fallo}</span>
                            </div>
                        </div>
                        
                        ${(fallo.Categoria || fallo.Subcategoria || palabrasClave.length > 0) ? `
                            <div class="fallo-tags">
                                ${fallo.Categoria ? `<span class="tag">${fallo.Categoria}</span>` : ''}
                                ${fallo.Subcategoria ? `<span class="tag">${fallo.Subcategoria}</span>` : ''}
                                ${palabrasClave.slice(0, 3).map(palabra => `<span class="tag">${palabra}</span>`).join('')}
                                ${palabrasClave.length > 3 ? `<span class="tag">+${palabrasClave.length - 3} más</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <a href="${fallo.Link_de_Drive}" target="_blank" class="btn-info">
                        <i class="fas fa-external-link-alt"></i>
                        Ver documento
                    </a>
                </div>
                
                <div class="fallo-content">
                    <div class="fallo-section">
                        <h4>Resumen</h4>
                        <p>${fallo.Resumen}</p>
                    </div>

                    <!-- NUEVA SECCIÓN: Normativa Aplicada -->
                    ${fallo.Normativa_Aplicada ? `
                        <div class="fallo-section">
                            <h4><i class="fas fa-gavel"></i> Normativa Aplicada</h4>
                            <p>${fallo.Normativa_Aplicada}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="fallo-actions">
                    <button class="btn-success ver-sumarios" data-id="${fallo.id}">
                        <i class="fas fa-eye"></i>
                        Ver sumarios
                    </button>
                </div>
                
                <div class="sumarios" id="sumarios-${fallo.id}">
                    <h4><i class="fas fa-list"></i> Sumarios</h4>
                    ${fallo.Sumarios.split('|').map(sumario => 
                        `<div class="sumario-item">${sumario.trim()}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    });

    html += '</div>';
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.classList.add('show');
    
    // Add event listeners for summary buttons
    document.querySelectorAll('.ver-sumarios').forEach(button => {
        button.addEventListener('click', toggleSumarios);
    });
    
    // Show pagination if needed
    if (totalResults > resultsPerPage) {
        mostrarPaginacion();
    } else {
        paginationContainer.classList.remove('show');
    }
    
    // Scroll to results
    resultadosDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Show no results
function mostrarSinResultados() {
    resultadosDiv.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search"></i>
            <h3>No se encontraron resultados</h3>
            <p>Intenta ajustar los filtros de búsqueda o usar términos diferentes</p>
        </div>
    `;
    resultadosDiv.classList.add('show');
    paginationContainer.classList.remove('show');
}

// Toggle summaries
function toggleSumarios(event) {
    const button = event.target.closest('.ver-sumarios');
    const falloId = button.dataset.id;
    const sumariosDiv = document.getElementById(`sumarios-${falloId}`);
    const icon = button.querySelector('i');
    
    if (sumariosDiv.classList.contains('show')) {
        sumariosDiv.classList.remove('show');
        button.innerHTML = '<i class="fas fa-eye"></i> Ver sumarios';
    } else {
        sumariosDiv.classList.add('show');
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar sumarios';
    }
}

// Pagination
function mostrarPaginacion() {
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    let html = '';
    
    // Previous button
    html += `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="cambiarPagina(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Anterior
        </button>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="cambiarPagina(1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="cambiarPagina(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
        html += `<button class="pagination-btn" onclick="cambiarPagina(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="cambiarPagina(${currentPage + 1})">
            Siguiente <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = html;
    paginationContainer.classList.add('show');
}

// Change page
function cambiarPagina(page) {
    if (page < 1 || page > Math.ceil(totalResults / resultsPerPage)) return;
    
    currentPage = page;
    mostrarResultados();
}

// Clear all filters
function clearAllFilters() {
    palabraLibreInput.value = '';
    anioInput.value = '';
    tribunalInput.value = '';
    palabrasClaveInput.value = '';
    categoriaSelect.value = '';
    subcategoriaInput.value = '';
    
    hideAllSuggestions();
    resultadosDiv.classList.remove('show');
    paginationContainer.classList.remove('show');
    
    showNotification('Filtros limpiados', 'success');
}

// Loading states
function showLoading() {
    buscarBtn.classList.add('loading');
    loadingIndicator.classList.add('show');
    resultadosDiv.classList.remove('show');
    paginationContainer.classList.remove('show');
}

function hideLoading() {
    buscarBtn.classList.remove('loading');
    loadingIndicator.classList.remove('show');
}

// Notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .notification-success { background: #48bb78; }
            .notification-error { background: #f56565; }
            .notification-info { background: #4299e1; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
