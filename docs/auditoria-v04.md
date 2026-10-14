# Revisión funcional y audiovisual · v0.4

Se revisaron creación, montaje y retirada de conjuntos, simetría, escultura, ojos, dieta, contactos, motores, defensas, IA, población, plantas, carne, progreso, final, guardado/migración, controles, pausa y audio. Las comprobaciones de navegador usan el puente de desarrollo para reproducir estados de combate y progreso, además de interacciones reales con teclado, mouse y multitáctil.

## Errores corregidos

| Problema | Corrección y comprobación |
| --- | --- |
| Una trompa o punta visible podía tocar alimento/enemigo sin activar su contacto | Contactos a lo largo del órgano dibujado; regresiones en apertura de trompa y extremo de pincho |
| La búsqueda de la superficie asumía un cuerpo convexo | Búsqueda desde el exterior y refinamiento de la membrana; caso con un cuello estrecho que antes anclaba dentro del cuerpo |
| La carne de cadáveres reutilizaba también las posiciones de carne ambiental | Se reserva un grupo independiente; se conserva el alimento ambiental después de muertes y caducidad |
| El mantenimiento destruía cadáveres antes de terminar su desvanecimiento | Se retienen durante los 650 ms de su animación |
| Las plantas sembradas en el objetivo final podían trasladarse al alejarse | Plantas del jardín ancladas permanentemente en su zona durante la partida |
| Los estados de veneno/aturdimiento del jugador sobrevivían a una adaptación | Se limpian al regresar del editor, junto con nubes y recarga |
| La pausa mostraba impulso listo aunque siguiera en recarga | El HUD recibe el tiempo restante al reanudar |
| Cancelar la creación iniciaba la aventura de todos modos | Regreso al menú; el guardado anterior permanece disponible |
| Seleccionar órganos equipados dependía solo de punteros | Selección con Enter, retirada con Delete y escultura con flechas |
| Otro dedo podía interferir con un arrastre de anatomía | Propiedad del puntero por interacción; solo el dedo que inició el arrastre puede completarlo |
| Los alimentos demasiado grandes atraían NPC que no podían comerlos | La IA filtra por tamaño de alimento además de dieta |
| Se acumulaban texturas de anatomías de aventuras anteriores | Se liberan después de destruir sus vistas al comenzar otra vida |
| Un guardado podía contener órganos superpuestos | Validación de ángulos duplicados, además de simetría y capacidad |
| Los temporizadores de efectos retenían identificadores antiguos | Limpieza de recargas caducadas |
| El audio solo intentaba desbloquearse en el primer gesto | Reintento seguro en gestos posteriores, suspensión al ocultar y recuperación al reanudar |
| El agua usaba lienzos de 10.400 × 10.400 y podía recargar sus texturas al desplazarse | Lienzos de tamaño de pantalla; en WebGL se desplazan las coordenadas de textura sin subir otra copia del bitmap |
| La animación de división podía retrasar el resultado en equipos lentos | Se desactiva el suavizado independiente de los tweens y se actualiza el objetivo antes de dividirse |
| El suavizado del reloj ralentizaba la simulación en frames lentos | Reloj sin suavizado artificial; prueba de 200 ms integrada con pasos de hasta 25 ms |
| WebGL por software podía resultar mucho más lento | Detección de aceleración y alternativa Canvas con el mismo arte procedural |

## Presentación

Las criaturas fuera de pantalla no generan texturas ni redibujan sus apéndices hasta que pueden verse.

Los cuerpos comparten una membrana sombreada y almacenada en caché, con borde iluminado, organelos, brillo y textura. Los ojos tienen filamentos de iris y un ligero movimiento. Las mandíbulas abren realmente sus mitades durante una mordida; filtros y cilios usan ciclos de cuatro imágenes. Las colas se dibujan como un contorno continuo, sin uniones visibles entre segmentos, y tienen una cresta de luz. Las sombras reutilizan una silueta simple; cada patrón calcula solo el detalle de piel que necesita.

El entorno combina nubes de color, luz que se desplaza sobre el agua, niebla y burbujas con desplazamiento relativo a la cámara. Las plantas tienen tallos con sombra y luz; sus frutos comparten su transparencia durante las transiciones. El follaje se redibuja hasta 24 veces por segundo para evitar trabajo repetido en frames intermedios.

Una sola capa de efectos mantiene hasta 180 partículas, sin crear objetos o tweens por partícula. Hay ondas y estelas, partículas de alimento, impactos, fragmentos de muerte, veneno y electricidad. La preferencia de movimiento reducido disminuye partículas y evita sacudidas de cámara.

El audio usa síntesis original con ruido filtrado, tonos, panorama estéreo, reverberación y compresión. La mezcla limita voces simultáneas y limpia sus nodos al terminar. Las señales se pueden renderizar con OfflineAudioContext para medir duración, energía, valores finitos y ausencia de clipping. Los controles de silencio afectan a la mezcla completa.

## Alcance de la validación

Las pruebas cubren las funciones principales y los fallos reproducidos. Las transiciones y el final se comprueban acelerando el progreso. Las medidas automáticas de audio verifican las señales, pero no sustituyen escucharlas en distintos altavoces y auriculares.

El entorno de pruebas usa Chromium sin GPU física. Se comprueba la alternativa Canvas y se realiza una comprobación separada de WebGL. No se certifica una frecuencia de imágenes para dispositivos reales: el rendimiento sostenido, Safari/iOS, el balance de las dietas y la sensación de juego todavía requieren sesiones humanas.

Validación de esta revisión: 78 pruebas de reglas y 34 casos de navegador verificados por grupos; comprobación independiente de WebGL y del sitio compilado, sin errores de JavaScript y con guardado/continuación en formato 3.
