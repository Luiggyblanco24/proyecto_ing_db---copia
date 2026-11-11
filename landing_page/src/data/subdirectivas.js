/**
 * Metadatos de subdirectivas y ubicación en el mapa de Norte de Santander.
 * 
 * Coordenadas relativas (%) calculadas de forma geográficamente coherente
 * sobre la silueta del departamento:
 * - Ocaña: Provincia de Ocaña (noroccidente)
 * - Ábrego: Valle de Ábrego (sur de Ocaña)
 * - San Calixto: Serranía / subregión Catatumbo (nororiente de Ocaña)
 * - El Tarra: Cuenca del Catatumbo (nororiente)
 */

export const municipiosSubdirectivas = [
  {
    id: 'ocana',
    nombre: 'Ocaña',
    coincidenciaRegex: /ocaña|ocana/i,
    x: 28, // % horizontal
    y: 45, // % vertical
    descripcion: 'Subdirectiva Ocaña',
    // Marca en código para cuando se confirme oficialmente la sede de la directiva:
    esSedeDepartamental: false, // [CONFIRMAR] - Oculto hasta confirmación
  },
  {
    id: 'abrego',
    nombre: 'Ábrego',
    coincidenciaRegex: /ábrego|abrego/i,
    x: 32,
    y: 60,
    descripcion: 'Subdirectiva Ábrego',
    esSedeDepartamental: false,
  },
  {
    id: 'san-calixto',
    nombre: 'San Calixto',
    coincidenciaRegex: /san calixto/i,
    x: 44,
    y: 40,
    descripcion: 'Subdirectiva San Calixto',
    esSedeDepartamental: false,
  },
  {
    id: 'el-tarra',
    nombre: 'El Tarra',
    coincidenciaRegex: /el tarra|tarra/i,
    x: 54,
    y: 26,
    descripcion: 'Subdirectiva El Tarra',
    esSedeDepartamental: false,
  },
];
