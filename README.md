# SPROUT · v0.4

Juego de supervivencia celular para navegador, hecho con TypeScript, Phaser y Vite. Explora, come, adapta tu criatura en cinco escalas y alcanza el Jardín de Origen para dividirte.

**Jugar:** https://sprightly-sable-2d8306.netlify.app

## Pulido de v0.4

- Agua con nubes de luz, reflejos animados, burbujas y partículas a distintas profundidades. Membranas con borde húmedo, organelos y brillo; iris detallados y colas con relieve.
- Mandíbulas con apertura real al morder; cilios y filtros con ciclos animados. Estelas al nadar, ondas de impulso, partículas al comer, impactos, fragmentación al morir y efectos de veneno/electricidad. Los efectos tienen un límite de 180 partículas.
- Diez señales sonoras originales con capas de ruido filtrado y tonos, panorama estéreo, reverberación y compresión: comida, daño, impulso, crecimiento, división, editor, veneno, electricidad, muerte y derrota. Ambiente acuático y armonías suaves según pantalla; silencio al pausar y recuperación tras interrupciones del navegador.
- Lienzos del agua limitados a la pantalla; texturas liberadas al iniciar nuevas aventuras; alternativa Canvas cuando la aceleración gráfica no está disponible o usa software. Los efectos más intensos respetan la preferencia de movimiento reducido.
- Correcciones en contactos de bocas y pinchos, cuerpos cóncavos, reserva de carne, cadáveres, jardín persistente, cancelación de creación, teclado, recarga al pausar y estados de veneno/aturdimiento después de adaptar.

La revisión y sus comprobaciones están descritas en [docs/auditoria-v04.md](docs/auditoria-v04.md).

## Anatomía y editor

- **Simetría obligatoria:** una pieza en el frente o la cola; cualquier colocación lateral crea su pareja reflejada. Comprar, mover, sustituir y retirar actúan sobre el conjunto completo. Un conjunto tiene un coste de ADN; cada órgano físico ocupa capacidad. No se cobran dos veces los pares.
- **Cuerpo por cinco vértebras:** cambia el largo, mueve los nodos a lo largo del eje central y ajusta el ancho de piel en cada uno. Los tiradores laterales cambian ambos lados. La silueta modifica los puntos de unión, los contactos, la salud máxima y el arrastre. La edición conserva el porcentaje de salud.
- **Ojos:** órbitas, pedúnculos o mosaicos; uno a tres pares, posición y separación. Son cosméticos y no consumen ADN ni capacidad.
- **Piel:** cuatro bases de escultura, seis colores iniciales, color libre y cuatro texturas. Cuerpos con volumen, manchas, iris profundos y órganos de materiales distintos; editor, retratos y juego comparten el mismo dibujo procedural original.
- **Diez familias de órganos:** trompa recolectora, mandíbula, filtro, flagelo, cilios, sifón, espina, placa, glándula venenosa y órgano eléctrico. El flagelo es una cola orgánica, flexible y afinada, con eficiencia según su ubicación.

| Adaptación | Función en la partida |
| --- | --- |
| Trompa recolectora | Comer frutos verdes de las plantas |
| Mandíbula | Comer carne y morder desde la ubicación de la boca |
| Filtro | Recoger partículas pequeñas en un radio mayor |
| Flagelo | Propulsión y giro; depende de su ubicación |
| Cilios | Mejor aceleración y maniobra |
| Sifón | Impulso más potente, largo y frecuente |
| Espina | Daño por contacto localizado |
| Placa | Reduce el daño físico en su sector |
| Glándula venenosa | Nube por contacto, daño continuo y ralentización; no daña al emisor |
| Órgano eléctrico | Descarga por contacto y breve aturdimiento |

Las capacidades son 6, 8, 10, 12 y 12 órganos físicos según escala. Los ojos no cuentan. Empiezas con 6 ADN, una boca recolectora y un flagelo; puedes sustituirlos antes de nadar. Debes conservar al menos una boca al confirmar.

## Ecosistema

Hay **14 especies originales** con anatomías propias, tamaños, velocidades y seis comportamientos: recolectar, filtrar, huir, cazar, carroñear y defender un territorio. Las presas rápidas usan escapadas cortas; los depredadores anuncian sus embestidas y descansan después de perseguir. Las territoriales regresan a su zona. Consulta **Especies** en el menú para reconocerlas.

Las plantas forman estrellas de seis ramas con doce frutos reales, consumibles por separado y que vuelven a crecer. Hay partículas microscópicas y poca carne ambiental; matar una criatura genera entre cuatro y diez pedazos de carne que permanecen hasta ser comidos o desvanecerse. La población y los recursos alrededor del jugador se renuevan. El Jardín de Origen tiene plantas para el objetivo final.

## Controles

- **WASD / flechas:** nadar. **Mouse:** mantén pulsado sobre el agua. **Espacio:** impulso. **Esc:** pausa/reanuda.
- **Táctil:** joystick izquierdo y botón ◇ derecho simultáneamente.
- **Órganos:** arrastra una tarjeta al cuerpo o selecciónala y toca la membrana. Selecciona una pieza equipada y arrástrala o toca otro lugar. Sus parejas se mueven juntas. Sustituir conserva el conjunto anterior en la reserva.
- **Cuerpo:** selecciona una vértebra; arrastra el huesito para moverlo y los tiradores para cambiar su ancho. También hay deslizadores de largo y ancho.
- **Ojos:** elige tipo, cantidad de pares, posición y separación.
- **Retirar:** inspector o Delete/Backspace. **Deshacer:** botón o Ctrl/Cmd+Z. **Cancelar:** flecha superior o Esc.

La dieta depende de tus bocas; puedes combinar dietas. Comer restaura un poco de salud. Las placas protegen sectores, y el impulso no da invulnerabilidad. En Madurez, solo la comida recogida dentro del Jardín de Origen cuenta para dividirte.

## Publicación automática

Netlify está conectado a `Dabot11/Sprout`, rama `main`. Cada actualización enviada a esa rama ejecuta `npm run build` y publica `dist/` según `netlify.toml`, con Node 24. No hace falta descargar carpetas ni arrastrarlas a Netlify. Los guardados permanecen en el navegador y dominio actuales.

El formato de guardado 3 incluye cuerpo, ojos, piel y conjuntos simétricos. Las partidas de las versiones 1 y 2 se migran: los órganos laterales obtienen su reflejo y los conjuntos que exceden la capacidad quedan en la reserva. Hay un guardado por navegador y sitio; la población ambiental se regenera al continuar.

## Desarrollo y comprobación

Node.js 22.12 o posterior; validado con Node 24.

```sh
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Con Chromium ya instalado: `SPROUT_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.

Las pruebas de reglas verifican simetría, compra y retirada de conjuntos, capacidad atómica, geometría, dieta, daño localizado, propulsión, veneno, electricidad, especies, frutas y migración. Las de navegador recorren editor, escultura, ojos, guardado, alimentos, combate, cinco escalas y final; comprueban teclado, mouse, multitáctil y pantallas de escritorio, móvil y tablet. El puente de inspección `window.__sprout` existe solo en desarrollo.

## Implementación

`config.ts` define balance, órganos y especies; `anatomy.ts` la silueta y los ojos; `art.ts` el dibujo compartido; `model.ts` las reglas del editor y progreso; `combat.ts` los efectos por contacto; `plants.ts` la geometría de plantas y frutos; `scene.ts` el ecosistema; `ai.ts` los comportamientos; `storage.ts` la persistencia y migración. `ui/editor.ts` implementa el taller y `ui/app.ts` los menús y HUD.

La simulación usa pasos de hasta 25 ms, con un máximo de 250 ms de recuperación tras un bloqueo del navegador. Se pausa al ocultar la pestaña. Las texturas se reutilizan y los contactos usan índices espaciales. El ecosistema mantiene 34 organismos ambientales y 320 posiciones de alimento, incluidas las reservas para carne.

## Alcance y próximos ajustes

La dirección visual y jugable se basa en las referencias aportadas; las decisiones están documentadas en [docs/referencias-v03.md](docs/referencias-v03.md). El render sigue siendo 2D con sombreado procedural: esta versión no es un motor 3D ni incorpora recursos de Spore.

El equilibrio entre dietas, la duración orientativa de 15–20 minutos y la sensación de nado necesitan partidas humanas completas. Las pruebas aceleran el progreso y no certifican esos aspectos. El rendimiento sostenido, audio y controles deben comprobarse también en dispositivos físicos, especialmente Safari en iOS. Si el almacenamiento está bloqueado o lleno, el juego avisa y continúa en memoria.
