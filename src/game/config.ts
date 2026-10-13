export type PartKind = 'gather' | 'jaw' | 'filter' | 'spike' | 'flagellum' | 'plate';
export type FoodKind = 'algae' | 'particle' | 'remains';
export type Parts = (PartKind | null)[];
export const PARTS: Record<PartKind, { name: string; cost: number; color: string; description: string; weight: number }> = {
  gather: { name: 'Boca recolectora', cost: 2, color: '#c2eda4', description: 'Una boca tubular que recoge algas al contacto. Se abre al comer.', weight: 0 },
  jaw: { name: 'Mandíbula', cost: 3, color: '#f8a788', description: 'Dos mandíbulas articuladas: muerden de frente y comen restos orgánicos.', weight: .05 },
  filter: { name: 'Filtradora', cost: 3, color: '#b4e6f3', description: 'Aspira partículas a corta distancia. +1 alimento.', weight: 0 },
  spike: { name: 'Pincho', cost: 2, color: '#f4d992', description: 'Daña al tocar con su punta. Añade peso.', weight: .09 },
  flagellum: { name: 'Flagelo', cost: 2, color: '#b7e7ce', description: 'Ondula para propulsarte. Atrás empuja mejor; a los lados ayuda al giro.', weight: 0 },
  plate: { name: 'Placa', cost: 2, color: '#90c7d6', description: 'Reduce el daño un 65% en su sector. Añade peso.', weight: .08 },
};
export const BALANCE = {
  world: 10400, foodCount: 260, population: 30, spatialCell: 180,
  acceleration: 6, friction: 7, baseSpeed: 125, baseHealth: 100,
  dashDuration: .26, dashCooldown: 3.5, hitInterval: .7, hurtProtection: .22,
  attackDamage: 14, spikeDamage: 11, armorReduction: .65, healPerFood: .45,
  finalFood: 150, finalZone: { x: 7550, y: 4900, radius: 700 },
  scales: [
    { name: 'Recién nacido', size: 1, food: 120, capacity: 4, points: 0 },
    { name: 'Explorador', size: 1.45, food: 180, capacity: 4, points: 6 },
    { name: 'Competidor', size: 2.05, food: 260, capacity: 5, points: 5 },
    { name: 'Dominante', size: 2.9, food: 360, capacity: 6, points: 5 },
    { name: 'Madurez', size: 4.1, food: 150, capacity: 6, points: 6 },
  ],
};
export type SpeciesKind = 'moss' | 'sieve' | 'dart' | 'hunter' | 'shell' | 'thorn';
export const SPECIES: Record<SpeciesKind, {name: string; color: number; shape: number; speed: number; parts: Parts; behavior: 'gather'|'filter'|'flee'|'hunt'; size: number}> = {
  moss: { name: 'Musguín', color: 0x9ecd91, shape: 1, speed: .7, behavior: 'gather', size: .95, parts: ['gather',null,null,null,'flagellum',null,null,null] },
  sieve: { name: 'Velaria', color: 0x90cbdc, shape: 2, speed: .65, behavior: 'filter', size: 1.1, parts: ['filter',null,'filter',null,null,null,'flagellum',null] },
  dart: { name: 'Centella', color: 0xe1c080, shape: 3, speed: 1.4, behavior: 'flee', size: .7, parts: ['gather',null,null,'flagellum','flagellum',null,null,null] },
  hunter: { name: 'Rojafauce', color: 0xe69a86, shape: 4, speed: 1.05, behavior: 'hunt', size: 1.2, parts: ['jaw',null,null,null,'flagellum',null,null,null] },
  shell: { name: 'Ámbaro', color: 0xd8b778, shape: 5, speed: .5, behavior: 'gather', size: 1.35, parts: ['gather','plate','plate',null,'flagellum',null,'plate','plate'] },
  thorn: { name: 'Espinaria', color: 0xdca491, shape: 6, speed: .8, behavior: 'hunt', size: 1.05, parts: ['jaw','spike','spike',null,'flagellum',null,'spike',null] },
};
export const SPECIES_KEYS = Object.keys(SPECIES) as SpeciesKind[];
