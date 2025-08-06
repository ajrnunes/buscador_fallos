¡Excelente! Me alegra que te haya gustado la base. Aquí tienes las mejoras que solicitaste.

He modificado el archivo app.js para incorporar los dos cambios:

Búsqueda y autocompletado por palabra clave individual: Ahora, al escribir en el campo "Palabras Clave", el sistema te sugerirá palabras clave individuales (ej: "Despido", "Art. 244 LCT") en lugar de la cadena de texto completa de la celda. La búsqueda también funcionará de esta manera.

Visualización de la Normativa Aplicada: En cada tarjeta de resultado, ahora verás una nueva sección llamada "Normativa Aplicada", que mostrará la información correspondiente de la columna Normativa_Aplicada de tu tabla.

No es necesario que modifiques los archivos index.html o styles.css. Simplemente reemplaza el contenido de tu app.js con el siguiente código actualizado.

Archivo app.js actualizado
code
JavaScript
download
content_copy
expand_less

const SUPABASE_URL = 'https://hleezrlqvdnwatwddcih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsZWV6cmxxdmRud2F0d2RkY2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTczOTQsImV4cCI6MjA3MDA3MzM5NH0.ah3ybvbk7_HVrsOc_esK_BolcIyzY1EN7wzSb0qYBL8';

@@ -103,7 +120,7 @@ async function cargarCategorias() {

// Autocomplete functionality
async function autocompletar(input, sugerenciasDiv, columna) {
    const valor = input.value.trim();
    const valor = input.value.trim().toLowerCase();

if (valor.length < 2) {
sugerenciasDiv.classList.remove('show');
@@ -115,11 +132,25 @@ async function autocompletar(input, sugerenciasDiv, columna) {
.from('bas_fallos')
.select(columna)
.ilike(columna, `%${valor}%`)
            .limit(10);
            .limit(50); // Aumentamos el límite para obtener una mejor muestra

if (error) throw error;

        const sugerenciasUnicas = [...new Set(data.map(item => item[columna]).filter(Boolean))];
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

@@ -142,6 +173,7 @@ async function autocompletar(input, sugerenciasDiv, columna) {
}
}


// Hide all suggestions
function hideAllSuggestions() {
tribunalSugerencias.classList.remove('show');
@@ -261,6 +293,14 @@ function mostrarResultados() {
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
@@ -464,4 +504,4 @@ function showNotification(message, type = 'info') {
notification.style.animation = 'slideInRight 0.3s ease reverse';
setTimeout(() => notification.remove(), 300);
}, 3000);
}
}```
