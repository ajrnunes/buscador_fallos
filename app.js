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

// Utility functions
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
    if (toggleAdvancedBtn) {
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
    }

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
            .limit(50);

        if (error) throw error;

        let sugerenciasUnicas;

        if (columna === 'Palabras_Clave') {
            // Procesamiento especial para palabras clave individuales
            const todasLasPalabras = data
                .flatMap(item => item.Palabras_Clave ? item.Palabras_Clave.split(',') : [])
                .map(kw => kw.trim())
                .filter(kw => kw); // Eliminar strings vacíos
            
            const palabrasCoincidentes = [...new Set(todasLasPalabras.filter(kw => kw.toLowerCase().includes(valor)))];
            sugerenciasUnicas = palabrasCoincidentes.slice(0, 10);
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
// Search functionality
async function buscarFallos() {
    // Validar que al menos un campo tenga contenido
    const hasSearchTerm = palabraLibreInput.value.trim() ||
                         anioInput.value ||
                         tribunalInput.value.trim() ||
                         palabrasClaveInput.value.trim() ||
                         categoriaSelect.value ||
                         subcategoriaInput.value.trim();

    if (!hasSearchTerm) {
        showNotification('Por favor, introduce al menos un criterio de búsqueda', 'error');
        return;
    }

    // Show loading
    showLoading();
    hideAllSuggestions();

    try {
        let query = supabase.from('bas_fallos').select('*', { count: 'exact' });

        // 1. BÚSQUEDA DE TEXTO COMPLETO (LA GRAN MEJORA)
        if (palabraLibreInput.value.trim()) {
            const searchTerm = palabraLibreInput.value.trim();
            // Usamos textSearch, que es el método del cliente de Supabase para usar nuestro índice GIN
            query = query.textSearch('search_vector', searchTerm, {
                type: 'websearch', // 'websearch' es ideal para múltiples palabras
                config: 'spanish'
            });
        }

        // 2. APLICAR FILTROS ESPECÍFICOS (igual que antes)
        if (anioInput.value) {
            const anio = parseInt(anioInput.value);
            if (!isNaN(anio) && anio >= 1900 && anio <= new Date().getFullYear() + 1) {
                // Usamos gte (mayor o igual) y lte (menor o igual) para cubrir todo el año
                query = query.gte('Fecha_Fallo', `${anio}-01-01`);
                query = query.lte('Fecha_Fallo', `${anio}-12-31`);
            }
        }
        if (tribunalInput.value.trim()) {
            query = query.ilike('Tribunal', `%${tribunalInput.value.trim()}%`);
        }
        if (palabrasClaveInput.value.trim()) {
            query = query.ilike('Palabras_Clave', `%${palabrasClaveInput.value.trim()}%`);
        }
        if (categoriaSelect.value) {
            query = query.eq('Categoria', categoriaSelect.value);
        }
        if (subcategoriaInput.value.trim()) {
            query = query.ilike('Subcategoria', `%${subcategoriaInput.value.trim()}%`);
        }

        // La antigua y compleja cláusula ".or(...)" ya no es necesaria.

        // 3. EJECUTAR LA CONSULTA (ahora no necesitamos count, ya lo pedimos en el select)
        const { data, error, count } = await query.order('Fecha_Fallo', { ascending: false });

        if (error) throw error;

        allResults = data || [];
        totalResults = count; // Usamos el count que nos devuelve Supabase, es más eficiente
        currentPage = 1;

        mostrarResultados();

    } catch (error) {
        console.error('Error en la búsqueda:', error);
        showNotification('Error al realizar la búsqueda. Por favor, intenta nuevamente.', 'error');
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

    currentResults.forEach((fallo, index) => {
        // Generar un ID único consistente para este fallo
        const falloId = fallo.ID || fallo.id || `fallo-${currentPage}-${index}`;
        
        // Sanitizar y validar datos
        const nombre = fallo.Nombre || 'Nombre no disponible';
        const caratula = fallo.Caratula || 'Carátula no disponible';
        const tribunal = fallo.Tribunal || 'Tribunal no especificado';
        const fecha = fallo.Fecha_Fallo || 'Fecha no disponible';
        const resumen = fallo.Resumen || 'Resumen no disponible';
        const link = fallo.Link_de_Drive || '#';
        
        const palabrasClave = fallo.Palabras_Clave ? 
            fallo.Palabras_Clave.split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0) : [];
        
        html += `
            <div class="fallo">
                <div class="fallo-header">
                    <div class="fallo-title">
                        <h2>${escapeHtml(nombre)}</h2>
                        <div class="fallo-caratula">${escapeHtml(caratula)}</div>
                        
                        <div class="fallo-meta">
                            <div class="fallo-meta-item">
                                <i class="fas fa-building"></i>
                                <span>${escapeHtml(tribunal)}</span>
                            </div>
                            <div class="fallo-meta-item">
                                <i class="fas fa-calendar"></i>
                                <span>${escapeHtml(fecha)}</span>
                            </div>
                        </div>
                        
                        ${(fallo.Categoria || fallo.Subcategoria || palabrasClave.length > 0) ? `
                            <div class="fallo-tags">
                                ${fallo.Categoria ? `<span class="tag">${escapeHtml(fallo.Categoria)}</span>` : ''}
                                ${fallo.Subcategoria ? `<span class="tag">${escapeHtml(fallo.Subcategoria)}</span>` : ''}
                                ${palabrasClave.slice(0, 3).map(palabra => `<span class="tag">${escapeHtml(palabra)}</span>`).join('')}
                                ${palabrasClave.length > 3 ? `<span class="tag">+${palabrasClave.length - 3} más</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <a href="${escapeHtml(link)}" target="_blank" class="btn-info" ${link === '#' ? 'style="pointer-events: none; opacity: 0.6;"' : ''}>
                        <i class="fas fa-external-link-alt"></i>
                        ${link === '#' ? 'No disponible' : 'Ver documento'}
                    </a>
                </div>
                
                <div class="fallo-content">
                    <div class="fallo-section">
                        <h4>Resumen</h4>
                        <p>${escapeHtml(resumen)}</p>
                    </div>

                    ${fallo.Normativa_Aplicada ? `
                        <div class="fallo-section">
                            <h4><i class="fas fa-gavel"></i> Normativa Aplicada</h4>
                            <p>${escapeHtml(fallo.Normativa_Aplicada)}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="fallo-actions">
                    <button class="btn-success ver-sumarios" data-fallo-id="${falloId}" aria-expanded="false">
                        <i class="fas fa-eye"></i>
                        Ver sumarios
                    </button>
                </div>
                
                <div class="sumarios" id="sumarios-${falloId}" aria-hidden="true">
                    <h4><i class="fas fa-list"></i> Sumarios</h4>
                    ${fallo.Sumarios ? 
                        fallo.Sumarios.split('|')
                            .map(sumario => sumario.trim())
                            .filter(sumario => sumario.length > 0)
                            .map(sumario => `<div class="sumario-item">${escapeHtml(sumario)}</div>`)
                            .join('') || '<div class="sumario-item">No hay sumarios válidos disponibles</div>'
                        : '<div class="sumario-item">No hay sumarios disponibles</div>'}
                </div>
            </div>
        `;
    });

    html += '</div>';
    
    resultadosDiv.innerHTML = html;
    resultadosDiv.classList.add('show');
    
    // Configurar event listeners para botones de sumarios
    setupSumariosListeners();
    
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

// VERSIÓN CORREGIDA: Setup event listeners for sumarios buttons
function setupSumariosListeners() {
    // Seleccionar todos los botones de sumarios y agregar listeners individuales
    const botonesSumarios = document.querySelectorAll('.ver-sumarios');
    
    botonesSumarios.forEach(boton => {
        // Crear una función específica para este botón
        boton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const falloId = this.getAttribute('data-fallo-id');
            console.log('Click en botón, falloId:', falloId); // Debug
            
            if (!falloId) {
                console.error('No se encontró data-fallo-id en el botón');
                return;
            }
            
            const sumariosDiv = document.getElementById(`sumarios-${falloId}`);
            console.log('Elemento sumarios encontrado:', sumariosDiv); // Debug
            
            if (!sumariosDiv) {
                console.error(`No se encontró elemento con ID: sumarios-${falloId}`);
                return;
            }
            
            const isVisible = sumariosDiv.classList.contains('show');
            console.log('Es visible:', isVisible); // Debug
            
            if (isVisible) {
                // Ocultar sumarios
                sumariosDiv.classList.remove('show');
                sumariosDiv.setAttribute('aria-hidden', 'true');
                this.innerHTML = '<i class="fas fa-eye"></i> Ver sumarios';
                this.setAttribute('aria-expanded', 'false');
            } else {
                // Mostrar sumarios
                sumariosDiv.classList.add('show');
                sumariosDiv.setAttribute('aria-hidden', 'false');
                this.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar sumarios';
                this.setAttribute('aria-expanded', 'true');
            }
        };
    });
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
