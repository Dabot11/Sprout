# SPROUT · versión 0.2

Un juego web de supervivencia microscópica: construye tu célula, explora, come con las bocas que equipes y adapta tu cuerpo en cinco escalas. En Madurez, llega al Jardín de Origen y recoge nutrientes para dividirte y completar la aventura.

## Jugar sin terminal con Netlify

1. Descarga el paquete **SPROUT-v02-Netlify.zip** entregado en el chat.
2. Descomprímelo. La carpeta `SPROUT` debe contener `index.html` y `assets/`.
3. Arrastra esa carpeta a Netlify Drop. Si ya publicaste la primera versión, sube la nueva carpeta en **Deploys** de ese mismo sitio para conservar la dirección y los guardados del navegador.
4. Abre el enlace del sitio. El pie del menú indica **V.02**.

No hay servidor de juego, cuentas, servicios de pago obligatorios ni descargas externas durante la partida. El guardado es local a cada navegador y dirección; no se sincroniza entre dispositivos.

## Qué cambió en esta revisión

- **Creación antes de jugar:** empiezas en el editor con una recolectora, un flagelo y 3 ADN para cambiar tu primera construcción. Puedes empezar con mandíbula o filtradora, y adaptar tu dieta después.
- **Montaje directo:** lleva las piezas a la membrana, en cualquier ángulo. Se orientan alrededor del cuerpo. Ya no hay ocho botones separados para equiparlas.
- **Compra al colocar:** seleccionar una pieza no cobra. Al colocar, se usa primero el inventario y solo se compra si hace falta. Un montaje rechazado por capacidad o saldo no consume nada.
- **Simetría bilateral:** coloca pares reflejados. Cada pieza consume capacidad y presupuesto. Las partes sobre el eje central no se duplican. Los pares conservan separación al moverlos al frente o a la cola.
- **Recolocación, retirada, deshacer y cancelación:** mover es gratis; retirar guarda la pieza; Ctrl/Cmd+Z o Deshacer revierte el último cambio. Cancelar restaura construcción, inventario, ADN, color y forma.
- **Bocas orgánicas:** recolectora tubular, mandíbulas articuladas y filtradora con un abanico de filamentos. Comer y morder activan su reacción visual.
- **Flagelo funcional:** una cinta flexible se ondula según la velocidad. Atrás favorece el avance; en los lados mejora más el giro. Los beneficios de varias piezas son decrecientes. El impulso y la recarga también dependen de la propulsión.
- **Anatomía compartida:** el editor, los retratos y el juego usan la misma geometría y las mismas rutinas de dibujo. Las colisiones siguen el ángulo y la silueta actuales.
- **Membranas y agua:** sombreado procedural, cinco colores, cuatro siluetas, cuerpo más legible en pantalla, alimentos más grandes y agua con volumen y luz suave.
- **Nado con mouse:** mantén pulsado sobre el agua para seguir el cursor. También siguen disponibles teclado y joystick multitáctil.
- **Partidas compatibles:** el formato 2 incorpora anatomía libre; el formato anterior se migra al continuar en el mismo navegador y sitio.

La revisión se centra en el flujo de construcción y nado que caracteriza a los juegos de evolución celular. Los recursos gráficos y sonidos son procedurales originales. Las consultas directas a Spore Wiki y a la página oficial de Steam fueron bloqueadas por la política de red del entorno; esa comparación en línea queda pendiente hasta habilitar esos destinos.

## Controles

- **WASD / flechas:** nadar. **Mouse:** clic mantenido sobre el agua. **Espacio:** impulso. **Esc:** pausa/reanuda.
- **Táctil:** joystick izquierdo y botón ◇ derecho simultáneamente.
- **Editor:** arrastra una tarjeta al cuerpo, o selecciónala y toca la membrana. Selecciona una parte equipada y arrástrala o toca otro lugar para moverla. Colocar sobre otra pieza la reemplaza y conserva la anterior en el inventario.
- **Retirar:** botón del inspector o Delete/Backspace. **Deshacer:** botón o Ctrl/Cmd+Z. **Cancelar:** flecha superior o Esc.
- Conserva al menos una boca al confirmar. Las piezas iniciales cuentan para la capacidad: cuatro al principio, cinco en Competidor y seis en Dominante.

La dieta viene de las bocas, no de una clase permanente. Recolectoras comen algas verdes; mandíbulas comen restos coral y muerden; filtradoras recogen partículas pequeñas. Las mandíbulas y pinchos atacan desde su ubicación; cada placa protege solamente su sector. El impulso no da invulnerabilidad. Comer recupera un poco de salud.

En Madurez, la señal indica el Jardín de Origen. Solo el alimento recogido dentro de su zona cuenta para el objetivo final. No hace falta matar a un jefe.

## Desarrollar y compilar

Requiere **Node.js 22.12 o posterior** y npm; validado con Node 24.

```sh
npm ci
npm run dev
npm run build       # TypeScript + sitio estático en dist/
npm run preview     # probar el build
npm test            # reglas y guardado
```

`dist/` puede publicarse en cualquier alojamiento estático, también en un subdirectorio. Para probar desde un teléfono en la misma red local, abre la dirección **Network** que muestra Vite y permite el puerto 5173 en el firewall. En la nube se necesita reenvío del puerto o una publicación estática; una IP interna no suele ser accesible desde el teléfono.

## Arquitectura y balance

| Archivo | Responsabilidad |
| --- | --- |
| `src/game/config.ts` | Balance, cinco escalas, partes y especies |
| `src/game/anatomy.ts` | Membranas, puntos de unión, formas y propulsión según posición |
| `src/game/art.ts` | Dibujo compartido de cuerpos, órganos, ojos y colas |
| `src/game/model.ts` | Dieta, daño, protección, montaje atómico, recolocación y crecimiento |
| `src/game/creatures.ts` | Entidades Phaser y texturas procedurales reutilizables |
| `src/game/scene.ts` | Ecosistema, simulación, cámara, alimentación, combate y final |
| `src/game/controls.ts` | Teclado, mouse y punteros táctiles independientes |
| `src/game/ai.ts` | Buscar alimento, huir, perseguir y señalar embestidas |
| `src/game/spatial.ts` | Índice espacial para evitar comprobar todos contra todos |
| `src/game/storage.ts` | Ajustes, mejor resultado, guardado y migración de anatomía |
| `src/game/audio.ts` | Sonidos originales sintetizados con Web Audio |
| `src/ui/editor.ts` | Taller de anatomía con montaje directo y transacciones reversibles |
| `src/ui/app.ts` | Menú, creación, HUD, pausa y resultados |
| `src/ui/portrait.ts` | Retratos animados que comparten el dibujo del juego |
| `src/style.css` | Interfaz adaptable a escritorio, móvil y tablet |

Modifica `BALANCE` para ajustar salud, comida requerida, daño, capacidad y presupuestos. `SPECIES` define nombres, siluetas, tamaño, equipamiento e IA; `PARTS` define costes, peso y efectos. `anatomy.ts` contiene colores, formas y eficiencia de propulsión/giro. Las partidas conservan ocho entradas internas por compatibilidad, pero los órganos se montan en ángulos libres; la capacidad de cuatro a seis sigue siendo el límite real.

La lógica usa pasos de hasta 25 ms, con un máximo de 250 ms de catch-up después de un bloqueo del navegador. Se pausa al ocultar la pestaña. Las texturas de cuerpos y órganos se generan una vez y se reutilizan. Hay un máximo de 30 organismos y 260 alimentos; el agua usa una textura procedural y se reducen las motas si cae el rendimiento. El lienzo se mantiene a resolución 1× en pantallas de alta densidad.

## Pruebas de navegador

```sh
npx playwright install chromium
npm run test:browser
```

Con Chromium ya instalado:

```sh
SPROUT_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

La suite inicia Vite si hace falta. Comprueba creación, compra al colocar, simetría, capacidad, saldo, undo, recolocación, retirada, cancelación, formas y color, migración/continuación, alimentación y daño localizados, teclado/mouse, multitáctil simultáneo y editor táctil. Recorre las cinco escalas, derrota/reinicio y objetivo final/división. Inspecciona escritorio de 1440×900, móvil horizontal de 844×390, vertical de 390×844 y tablet de 1024×768; genera capturas en `test-results/`.

Las pruebas adelantan el progreso para comprobar las transiciones y el final en un tiempo razonable; no representan una partida humana completa. El puente `window.__sprout` existe solo en desarrollo para la integración y no se incluye en producción.

## Límites pendientes

- La duración de 15–20 minutos y el equilibrio entre dietas necesitan partidas humanas completas. Las pruebas no certifican dificultad, diversión ni fidelidad a la sensación recordada de Spore.
- El tacto, audio y rendimiento sostenido deben verificarse en teléfonos/tablets físicos, especialmente Safari en iOS.
- Hay un solo guardado por navegador/sitio. La población ambiental se regenera al continuar de forma segura.
- Las siluetas modifican la geometría y los puntos de unión, pero no son un editor de escultura con vértices libres.
- Si el almacenamiento está bloqueado o lleno, el juego avisa y sigue en memoria; no puede garantizarse continuar tras cerrar la pestaña.
