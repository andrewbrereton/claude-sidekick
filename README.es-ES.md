

# Claude Sidekick

Un servidor de Protocolo de Contexto de Modelo (MCP) que conecta Claude con tus modelos locales de Ollama, permitiéndote delegar tareas más sencillas y ahorrar tus tokens de Claude para trabajos complejos.

## Inicio rápido

### 1. Instalar Ollama

Primero, instala Ollama en tu sistema:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

Inicia Ollama:
```bash
ollama serve
```

### 2. Descargar algunos modelos

Descarga modelos útiles para diferentes tareas:

```bash
# General purpose models
ollama pull gpt-oss           # OpenAI's open-weight model
ollama pull llama3.2          # Fast, capable model
ollama pull qwen2.5           # High-quality text generation

# Specialised models
ollama pull deepseek-coder    # Code generation
ollama pull nomic-embed-text  # Text embeddings
ollama pull llama3.2:1b       # Lightweight for simple tasks
```

### 3. Configurar el servidor MCP

Crea un nuevo directorio e instala las dependencias:

```bash
mkdir mcp-ollama-server
cd mcp-ollama-server

# Copy the files (index.ts, package.json, tsconfig.json)
# Then install dependencies:
npm install

# Create src directory and move index.ts there
mkdir src
mv index.ts src/

# Build the project
npm run build
```

### 4. Configurar Claude Desktop

Añade el servidor a tu configuración de Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ollama": {
      "command": "node",
      "args": ["/absolute/path/to/your/mcp-ollama-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### 5. Reiniciar Claude Desktop

Reinicia Claude Desktop para cargar el nuevo servidor MCP. Deberías ver las herramientas de Ollama disponibles en Claude.

## Herramientas disponibles

### `ollama_generate_text`
Genera texto para tareas de escritura sencillas, resúmenes básicos o creación de contenido directa.

**Mejor para:** Escritura sencilla, explicaciones básicas, generación de contenido

### `ollama_chat`
Mantén conversaciones con modelos locales para preguntas y respuestas, explicaciones o tareas basadas en diálogos.

**Mejor para:** Sesiones de preguntas y respuestas, explicaciones, tareas interactivas

### `ollama_embed_text`
Genera embeddings de texto para similitud semántica, agrupamiento (clustering) o búsqueda.

**Mejor para:** Similitud de documentos, búsqueda semántica, agrupamiento

### `ollama_code_generation`
Genera código utilizando modelos especializados en programación.

**Mejor para:** Scripts sencillos, código base, tareas básicas de programación

### `ollama_summarise`
Resume contenido de texto con diferentes opciones de longitud.

**Mejor para:** Resúmenes de documentos, condensación de artículos

### `ollama_list_models`
Lista todos los modelos disponibles en tu instalación de Ollama.

### `ollama_pull_model`
Descarga nuevos modelos a Ollama.

## Ejemplos de uso

Una vez configurado, Claude puede usar estas herramientas así:

**Generación de texto:**
> "Usa Ollama para generar una plantilla de correo electrónico sencilla para la incorporación de clientes"

**Generación de código:**
> "Pídele a DeepSeek Coder que cree un script en Python para analizar archivos CSV"

**Embeddings:**
> "Genera embeddings para estos títulos de documentos usando Nomic"

**Resumen:**
> "Usa Llama para crear un breve resumen de este artículo"

## Recomendaciones de modelos

### Para generación de texto
- **gpt-oss** - Excelente equilibrio entre velocidad y calidad
- **llama3.2** - Buen equilibrio entre velocidad y calidad
- **qwen2.5** - Mayor calidad pero más lento
- **llama3.2:1b** - Muy rápido para tareas sencillas

### Para programación
- **gpt-oss** - Excelente generación de código
- **deepseek-coder** - Gran generación de código
- **qwen2.5-coder** - Modelo de programación alternativo

### Para embeddings
- **nomic-embed-text** - Embeddings rápidos y de alta calidad
- **mxbai-embed-large** - Modelo de embeddings más grande

## Configuración

### Personalizar el servidor

Edita `src/index.ts` para modificar:

- **URL base:** Cambia el punto de conexión de Ollama (predeterminado: `http://localhost:11434`)
- **Tiempo de espera (Timeout):** Ajusta el tiempo de espera de la solicitud (predeterminado: 5 minutos)
- **Modelos predeterminados:** Modifica qué modelos se usan por defecto
- **Configuración de temperatura:** Ajusta la creatividad/aleatoriedad

### Variables de entorno

Puedes anular configuraciones con variables de entorno:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_TIMEOUT=300000
```

## Solución de problemas

### "Error al conectarse a Ollama"
1. Asegúrate de que Ollama se esté ejecutando: `ollama serve`
2. Comprueba si es accesible: `curl http://localhost:11434/api/tags`
3. Verifica que ningún firewall esté bloqueando el puerto 11434

### "Modelo no encontrado"
1. Lista los modelos disponibles: `ollama list`
2. Descarga el modelo que falta: `ollama pull model-name`

### "El servidor MCP no aparece en Claude"
1. Verifica que la ruta del archivo de configuración sea correcta
2. Comprueba la ruta absoluta al archivo JavaScript compilado
3. Reinicia Claude Desktop por completo
4. Revisa los registros (logs) de Claude Desktop en busca de errores

### Consejos de rendimiento

1. **Usa modelos más pequeños para tareas sencillas:**
   - `llama3.2:1b` para generación básica de texto
   - `qwen2.5:0.5b` para tareas muy sencillas

2. **Mantén los modelos de uso frecuente "cargados":**
   ```bash
   # Pre-load models to keep them in memory
   ollama run llama3.2 "hello"
   ollama run deepseek-coder "print hello"
   ```

3. **Ajusta la temperatura según la tarea:**
   - Baja (0.1-0.3) para tareas factuales/de programación
   - Media (0.5-0.8) para escritura creativa
   - Alta (0.9-1.2) para tareas muy creativas

## Desarrollo

### Ejecutar en desarrollo

```bash
npm run dev        # Run with hot reload
npm run watch      # Watch mode
npm run type-check # Check TypeScript types
npm run lint       # Lint code
```

### Añadir nuevas herramientas

Para agregar nuevas capacidades:

1. Define la herramienta en `setupHandlers()`
2. Añade el método controlador (handler)
3. Actualiza el cliente de Ollama si es necesario
4. Reconstruye y reinicia

### Ampliar el soporte de modelos

Para dar soporte a nuevos tipos de modelos:

1. Añade la configuración del modelo en el constructor
2. Crea métodos controladores específicos
3. Añade estrategias de prompting (instrucciones) adecuadas

## Flujo de trabajo de ejemplo

Así es como podrías usarlo en la práctica:

1. **Análisis inicial con Claude:** "Necesito analizar este conjunto de datos y crear un informe completo"

2. **Delegar tareas sencillas:** "Usa Ollama para generar descripciones básicas para cada columna de datos"

3. **Análisis complejo con Claude:** Claude realiza el análisis estadístico sofisticado y los hallazgos

4. **Delegar la creación de resúmenes:** "Usa Llama para resumir cada sección de hallazgos"

5. **Revisión final con Claude:** Claude ensambla todo en un informe pulido

Este enfoque maximiza la eficiencia de tus tokens de Claude mientras aún obtienes resultados integrales.

## Notas de seguridad

- Este servidor se ejecuta localmente y no envía datos a externos
- Toda la inferencia del modelo ocurre en tu máquina
- No se requieren claves API ni servicios externos
- Tus datos permanecen completamente privados

## Cómo contribuir

Siéntete libre de ampliar este servidor con capacidades adicionales:
- Soporte para generación de imágenes
- Integración de ajuste fino (fine-tuning) de modelos
- Monitoreo de rendimiento
- Estrategias de cambio de modelos
- Plantillas de instrucciones (prompts) personalizadas
