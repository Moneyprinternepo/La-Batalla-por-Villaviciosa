# La Batalla por Villaviciosa

Juego de estrategia táctica por turnos en HTML5, CSS y JavaScript, sin servidor ni dependencias.

## Cómo ejecutarlo

- **Versión de un solo archivo:** abre `index.html` con doble clic. Funciona sin conexión; sin internet usa tipografías del sistema en lugar de Pixelify Sans y Alegreya Sans.
- **Versión por archivos:** abre `src/index.html`. Carga `data.js`, `maps.js`, `engine.js`, `ai.js`, `art.js`, `audio.js`, `renderer.js` y `main.js` como scripts tradicionales, así que también funciona desde `file://`.
- **Pruebas:** `node tests/tests.js` en una terminal, o abre `tests/tests.html` en el navegador.
- **Ensamblado:** `python3 build.py` regenera el `index.html` de un solo archivo a partir de `src/`.

## Controles

| Acción | Control |
|---|---|
| Seleccionar, mover, atacar | Clic izquierdo |
| Cancelar | Clic derecho o Esc |
| Zoom | Rueda del ratón o botones + y − |
| Desplazar el mapa | Arrastrar sobre el tablero o flechas del teclado |
| Terminar turno | Espacio (pide confirmación si quedan unidades por actuar) |
| Reclutar | R |
| Siguiente unidad | N |
| Rejilla hexagonal | H |
| Zonas de control | Z |
| Sonido | M |

Al hacer clic en un enemigo lejano, la unidad seleccionada se acerca a la mejor casilla adyacente y se abre la previsualización de combate.

## Sistemas implementados

- **Tablero:** hexágonos odd-q con coordenadas cúbicas, Dijkstra con costes por terreno y arquetipo, zonas de control (Escurridizo ignora una por turno) y ruta prevista con su coste.
- **Combate:** golpes alternos resueltos uno a uno con un generador reproducible. Hay represalia del mismo alcance, cinco tipos de daño, resistencias por arquetipo con excepciones, probabilidad de impacto entre 20 % y 90 % y predicción exacta de la probabilidad de caer.
- **Ciclo día/noche:** seis fases con iluminación gradual y farolas por la noche. Las unidades diurnas y nocturnas varían un 25 % su daño.
- **Estados:** los ocho del documento más En guardia y Temazo. No se acumulan; solo renuevan duración.
- **Comandante:** empieza en nivel 3 (o en su nivel máximo si tiene menos).
- **Personajes:** 21 personajes con sus 60 versiones y 7 invocaciones (amigas de Teresa, Oyente Zombi, tres pumas y El Boss). Se pueden reclutar tantas veces como se quiera. Costes de 13 a 30 de oro, esquiva propia por personaje (de −15 % a +10 %) y resistencias propias.
- **Habilidades:** 53 habilidades programadas con tipos reutilizables: ataques preparados, mejoras, curación, debilitamientos, invocaciones, barricadas, casillas pringosas, ataques en área, a dos casillas o a dos objetivos, empujes, saltos y robo de oro.
- **Progresión:** experiencia según el documento, tarjeta de antes y después en cada evolución y hasta tres mejoras veteranas en nivel máximo.
- **Economía:** 75 de oro inicial, ingreso base, puestos con bandera, bonificaciones de facción y mantenimiento por nivel.
- **Mapas y eventos:** La Villa (26×20, 17 puestos con bandera), El Xiringüelu (30×20, 15 puestos) y El Puerto de Tazones (28×20, 18 puestos, con playa, acantilados, faros y lonja), simétricos para el equilibrio. Todos los puestos con bandera curan 8 PV y dan oro. Siete eventos anunciados.
- **IA:** evalúa cada acción con la distribución exacta de resultados, mapa de amenazas, captura, protección del comandante, habilidades, saltos y reclutamiento. Tres dificultades sin trampas.
- **Modos:** batalla clásica, Dominio de la Villa, límite de 30 rondas con puntuación y dos jugadores en el mismo equipo.
- **Guardado:** automático al inicio de cada turno humano y manual.

## Pixel art

Las figuras siguen el lenguaje visual de Battle for Wesnoth: vista frontal en tres cuartos con postura abierta y objetos hacia fuera, contorno casi negro, líneas interiores oscuras entre piezas, ribetes dorados en capas, túnicas y armaduras, paleta de tela apagada y textura pintada. Cada figura se compone de piezas con volumen iluminadas desde arriba a la izquierda y reducidas a rampas de cinco tonos con desplazamiento de tono. El esqueleto tiene cinco poses (reposo A y B, preparación, golpe y dolor) y se renderiza a triple resolución para retratos, enciclopedia y tarjetas de evolución. Los diseños de cada nivel están en `src/designs.js`.

El terreno se pinta con bordes orgánicos entre zonas, orillas de arena, rejilla tenue, bosques de varios árboles por casilla, caserías asturianas con hórreo y casetas de peña. Cada puesto lleva una bandera grande que ondea: blanca con interrogación si es neutral y del color de la facción si es suyo.

## Interfaz de batalla

- Arriba: ronda, hora del día con su efecto, de quién es el turno, oro con ingreso neto, propiedades y próximo evento.
- Sobre el mapa: objetivo de la batalla (clic para centrar al comandante rival) y leyenda de colores.
- Abajo: tu ejército con el estado de cada unidad (lista, a medias, ya actuó, llega el próximo turno), instrucciones paso a paso de lo que puedes hacer ahora con las habilidades de la unidad elegida, y los botones Reclutar y Fin de turno (que indica cuántas unidades faltan y parpadea cuando no queda nada por hacer).
- Derecha: pestañas Ficha, Habilidades (todas, también las que se desbloquean al evolucionar, con botón Usar), Evolución (todos los niveles con sprite, estadísticas y progreso) y Crónica.
- Al pasar el ratón sobre un rival se ve su alcance de ataque en rojo tenue.

## Música

Composición original de inspiración asturiana en La eólico, compás de 3/4 a 66 pulsaciones: gaita con floreos, roncón continuo, cuerdas lentas, bajo y tambor, con reverberación de sala. Tiene siete secciones (introducción, dos temas, interludio de roncón y tambor, variaciones y coda) y dura unos 2 minutos y 10 segundos antes de repetirse.

## Rasgos únicos

Cada personaje tiene algo que solo hace él: Puntería de Pilar (nunca baja del 60 % a distancia), Musa literaria de Carlos (+15 % de daño a los aliados adyacentes), Absorber de Pedro (recupera la mitad del daño de su chapa), Carga de Ponchu (doble daño en ambos sentidos), Por la espalda de Chanchenchi (doble daño con un aliado al otro lado), Primer golpe de Guilletón, Azar de los dados de Tía Carmen (siempre 55 %), Brindis de victoria de Ramón, Cuerpo de piedra de Santiago (regenera 4 PV), Concierto de cabecera de Tía María (cura 4 PV a los adyacentes) y Beber vino de Tío Guillermo, que empieza débil y sube de nivel bebiendo (+7 XP y 4 PV, pero queda mareado). Se suman a las invocaciones, barricadas, saltos y demás habilidades de cada nivel.

## Decisiones de diseño

- Solo se reclutan los 21 personajes del documento, y se pueden repetir.
- Los nombres de nivel siguen el documento original; el primer nivel de Tío Guillermo se llama «Tío Guillermo».
- La habilidad de Tía María se llama «INVOCAR A EL BOSS» y muestra un rockero genérico inventado, para no usar el nombre de una persona real.
- Las habilidades ofensivas especiales no provocan represalia. Las mesas y barricadas no esquivan.
- Los costes se calculan a partir de un torneo de duelos entre todos los personajes y se ajustan con partidas completas de IA contra IA. En 144 partidas: Madriles 55 %, Astures 52 % y Veraneantes 43 % de victorias en sus partidas.

## Resultados de las pruebas

**23 de 23 pruebas superadas** en Node y en el navegador, incluidas 48 partidas completas de IA contra IA sin ninguna acción ilegal. En Chromium se jugaron partidas completas a través de la interfaz sin errores de JavaScript y se revisaron con capturas la enciclopedia, el reclutamiento, la previsualización, el combate, la evolución y las pestañas del panel.

## Pendiente o simplificado

- **Animaciones:** cinco poses por sprite más desplazamientos, destellos y partículas; no hay animaciones de 4 a 8 fotogramas dibujados para cada acción.
- **Monumentos:** los edificios singulares (iglesia, Ayuntamiento, Teatro Riera, Mercado, Casa de los Hevia) siguen dibujados con el sistema anterior, con sombreado añadido; las casas, árboles, sidrerías y casetas usan ya el nuevo motor de volumen.
- **Guerra de tres facciones:** el motor admite N facciones, pero no hay mapas ni interfaz para tres bandos.
- **Tutorial:** no hay tutorial interactivo; la barra inferior explica en cada momento qué se puede hacer.
- **Móvil:** se juega, pero el diseño está pensado para escritorio.
