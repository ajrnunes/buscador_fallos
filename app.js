const SUPABASE_URL = 'https://hleezrlqvdnwatwddcih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWV6cmxxdmRud2F0d2RkY2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTczOTQsImV4cCI6MjA3MDA3MzM5NH0.ah3ybvbk7_HVrsOc_esK_BolcIyzY1EN7wzSb0qYBL8';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const palabraLibreInput = document.getElementById('palabraLibre');
const anioInput = document.getElementById('anio');
const tribunalInput = document.getElementById('tribunal');
const palabrasClaveInput = document.getElementById('palabrasClave');
const categoriaSelect = document.getElementById('categoria');
const subcategoriaInput = document.getElementById('subcategoria');
const buscarBtn = document.getElementById('buscar');
const resultadosDiv = document.getElementById('resultados');
const tribunalSugerencias = document.getElementById('tribunalSugerencias');
const subcategoriaSugerencias = document.getElementById('subcategoriaSugerencias');

// --- Carga inicial de filtros ---
async function cargarCategorias() {
    const { data, error } = await supabase
        .from('bas_fallos')
        .select('Categoria');

    if (error) {
        console.error('Error cargando categorías:', error);
        return;
    }

    const categoriasUnicas = [...new Set(data.map(item => item.Categoria).filter(Boolean))];
    categoriasUnicas.sort();
    categoriasUnicas.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        categoriaSelect.appendChild(option);
    });
}


// --- Funcionalidad de autocompletar ---
async function autocompletar(input, sugerenciasDiv, columna) {
    const valor = input.value;
    if (valor.length < 2) {
        sugerenciasDiv.innerHTML = '';
        sugerenciasDiv.style.display = 'none';
        return;
    }

    const { data, error } = await supabase
        .from('bas_fallos')
        .select(columna)
        .ilike(columna, `%${valor}%`);

    if (error) {
        console.error('Error en autocompletar:', error);
        return;
    }

    const sugerenciasUnicas = [...new Set(data.map(item => item[columna]).filter(Boolean))];
    sugerenciasDiv.innerHTML = '';
    if (sugerenciasUnicas.length > 0) {
        sugerenciasUnicas.slice(0, 10).forEach(sugerencia => {
            const div = document.createElement('div');
            div.textContent = sugerencia;
            div.addEventListener('click', () => {
                input.value = sugerencia;
                sugerenciasDiv.innerHTML = '';
                sugerenciasDiv.style.display = 'none';
            });
            sugerenciasDiv.appendChild(div);
        });
        sugerenciasDiv.style.display = 'block';
    } else {
        sugerenciasDiv.style.display = 'none';
    }
}


tribunalInput.addEventListener('keyup', () => autocompletar(tribunalInput, tribunalSugerencias, 'Tribunal'));
subcategoriaInput.addEventListener('keyup', () => autocompletar(subcategoriaInput, subcategoriaSugerencias, 'Subcategoria'));


// --- Funcionalidad de búsqueda ---
async function buscarFallos() {
    let query = supabase.from('bas_fallos').select('*');

    // Construcción de la consulta
    if (anioInput.value) {
        query = query.eq('Fecha_Fallo.substring(0, 4)', anioInput.value);
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
       // Búsqueda de texto completo (si está configurado en Supabase) o búsqueda simple en múltiples columnas
       const searchTerm = palabraLibreInput.value.split(' ').join(' & ');
       query = query.or(`Nombre.ilike.%${searchTerm}%,Caratula.ilike.%${searchTerm}%,Resumen.ilike.%${searchTerm}%,Sumarios.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error en la búsqueda:', error);
        resultadosDiv.innerHTML = '<p>Ocurrió un error al realizar la búsqueda.</p>';
        return;
    }

    mostrarResultados(data);
}


function mostrarResultados(fallos) {
    resultadosDiv.innerHTML = '';

    if (!fallos || fallos.length === 0) {
        resultadosDiv.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    fallos.forEach(fallo => {
        const falloDiv = document.createElement('div');
        falloDiv.className = 'fallo';

        falloDiv.innerHTML = `
            <h2>${fallo.Nombre}</h2>
            <p><strong>Carátula:</strong> ${fallo.Caratula}</p>
            <p><strong>Tribunal:</strong> ${fallo.Tribunal}</p>
            <p><strong>Fecha:</strong> ${fallo.Fecha_Fallo}</p>
            <p><strong>Resumen:</strong> ${fallo.Resumen}</p>
            <button class="ver-sumarios">Ver sumarios</button>
            <a href="${fallo.Link_de_Drive}" target="_blank"><button>Ver documento completo</button></a>
            <div class="sumarios">
                <p>${fallo.Sumarios.split('|').join('<br><br>')}</p>
            </div>
        `;

        resultadosDiv.appendChild(falloDiv);
    });

    // Añadir event listeners a los nuevos botones
    document.querySelectorAll('.ver-sumarios').forEach(button => {
        button.addEventListener('click', (event) => {
            const sumariosDiv = event.target.nextElementSibling.nextElementSibling;
            if (sumariosDiv.style.display === 'block') {
                sumariosDiv.style.display = 'none';
                event.target.textContent = 'Ver sumarios';
            } else {
                sumariosDiv.style.display = 'block';
                event.target.textContent = 'Ocultar sumarios';
            }
        });
    });
}


buscarBtn.addEventListener('click', buscarFallos);
// Carga inicial de los filtros
cargarCategorias();
