# Decisiones a partir de las referencias del usuario

Las nueve imágenes aportadas muestran una experiencia celular con anatomía legible y alimento integrado en el entorno. El objetivo de v0.3 es trasladar esas relaciones al editor y al juego de SPROUT, con especies y recursos gráficos originales.

| Referencia | Observación | Decisión implementada |
| --- | --- | --- |
| Escena turquesa con planta y varias células | Plantas ramificadas, comida agrupada y especies distinguibles por su silueta | Plantas en estrella de seis ramas, doce frutos consumibles, anatomías y colores propios por especie |
| Célula amarilla alargada junto a carne | Boca clara, grandes ojos, membrana con volumen y pedazos de carne separados | Trompas y mandíbulas reconocibles; ojos esféricos; cuerpo sombreado; cadáveres que generan carne |
| Tabla con muchas especies | Peligro, velocidad y defensa se leen en órganos y forma | Repertorio de catorce especies con seis comportamientos, progresión de población y guía ilustrada |
| Primer plano azul con ojos pedunculados | Los ojos sobresalen del cuerpo; pinchos y mandíbula tienen materiales diferenciados | Ojos sobre tallos, iris profundos y partes con raíces de piel, dientes y espinas de aspecto marfil |
| Célula rosa de silueta simple | La forma base puede seguir siendo expresiva con pocos órganos | Escultura del largo y ancho por cinco nodos; no exigir muchas piezas para personalizar |
| Lámina ilustrada de partes | Bocas, motores y defensas tienen funciones distintas | Diez familias funcionales de la etapa celular. Las filas de invertebrado y pez se reservan como inspiración futura |
| Criatura violeta con aletas y sifón | Volumen, textura, piezas bilaterales y propulsión visible | Simetría obligatoria; piel granulada; cilios laterales; sifón con efecto de impulso |
| Panel de piezas y ojos | El catálogo permite elegir anatomía y ojos por separado | Pestañas Órganos, Cuerpo y Ojos, categorías de piezas y tres tipos de ojos |
| Criatura azul con muchos ojos | Variación del número y posición de ojos sobre una misma piel | Uno a tres pares, ubicación longitudinal y separación; todos reflejados |

## Reglas de construcción

El eje longitudinal organiza todo el diseño. Frente y cola permiten un órgano central en cada extremo. Colocar en los laterales crea dos órganos reflejados; no existe una opción para desactivar la simetría. Mover, sustituir o retirar siempre opera sobre la adaptación completa.

Un conjunto lateral tiene el mismo precio que uno central, pero ocupa dos posiciones de capacidad. Esta distinción se muestra en el editor para evitar cobros sorpresa y mantiene un límite al número de piezas físicas. Al convertir un par en una pieza central se conserva el conjunto; no se cobra nuevamente.

Los cinco nodos tienen posiciones ordenadas y anchos positivos para mantener una membrana continua. La piel se interpola suavemente entre ellos. Las piezas se anclan a la silueta editada, y los contactos usan esa misma geometría. Más superficie da salud y arrastre; los ojos son cosméticos y gratuitos.

## Reglas de ecología

Los frutos pertenecen a plantas y vuelven a crecer individualmente. Los restos de carne son escasos en el ambiente y aparecen principalmente al matar criaturas. Los herbívoros y filtradores buscan su comida y huyen de organismos armados. Los carroñeros buscan restos. Los cazadores persiguen por tiempo limitado y señalan sus embestidas. Las especies territoriales protegen un área y regresan a ella.

La anatomía expresa esas diferencias: motores para presas rápidas, bocas para dietas, pinchos y placas para contacto físico, veneno y electricidad para defensa territorial. Todas las especies respetan las mismas reglas de simetría que el jugador.

## Dirección visual y límites

Se priorizó una membrana con volumen y manchas, ojos salientes, apéndices flexibles, materiales diferenciados y agua azul con motas y profundidad. Los mismos dibujos se usan en editor, catálogo y partida para que la construcción sea reconocible al nadar.

La geometría y las texturas son procedurales originales. El motor sigue siendo 2D y no reproduce iluminación ni escultura 3D del juego de referencia. La siguiente evaluación debe hacerse jugando: legibilidad al alejar la cámara, rapidez del editor, tacto del nado, duración y dificultad de cada dieta.
