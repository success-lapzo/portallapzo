# assets/

El hub **no carga ningun archivo de imagen en tiempo de ejecucion**: todos los
iconos son SVG en linea, definidos en el objeto `IC` de `src/js/01-catalogos.js`,
y la marca del sidebar es SVG en linea dentro de `index.html`.

Esta carpeta existe para el trabajo de integracion:

- `lapzo-mark.svg` — la marca violeta del sidebar exportada como archivo suelto,
  por si Portal Lapzo la necesita como favicon o como icono del modulo.
  **No la referencia ningun archivo del proyecto.**

La unica dependencia externa de presentacion es la tipografia **Poppins**,
que `index.html` carga desde Google Fonts. Ver README raiz, seccion
"Dependencias".
