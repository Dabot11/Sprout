import { DEFAULT_ANGLES, DEFAULT_EYES, ORGAN_SLOTS, profileFor, type BodyProfile, type Eyes, type SkinPattern } from './anatomy';
export type PartKind='gather'|'jaw'|'filter'|'spike'|'flagellum'|'plate'|'cilia'|'jet'|'poison'|'electric';
export type FoodKind='algae'|'particle'|'remains';
export type Parts=(PartKind|null)[];
export const PARTS:Record<PartKind,{name:string;cost:number;color:string;description:string;weight:number;category:'mouth'|'motor'|'defense'}>={
  gather:{name:'Trompa recolectora',cost:2,color:'#c2eda4',description:'Una trompa muscular que recoge frutos vegetales. Se abre al comer.',weight:0,category:'mouth'},
  jaw:{name:'Mandíbula',cost:3,color:'#f8a788',description:'Muerde desde su posición y consume los trozos de carne que dejan otras células.',weight:.05,category:'mouth'},
  filter:{name:'Filtradora',cost:3,color:'#b4e6f3',description:'Un abanico bucal que recoge partículas próximas. Poco alimento, recogida frecuente.',weight:0,category:'mouth'},
  flagellum:{name:'Flagelo',cost:2,color:'#b7e7ce',description:'Una cola flexible. Detrás aumenta el avance; en los lados mejora el giro.',weight:0,category:'motor'},
  cilia:{name:'Cilios',cost:2,color:'#c9e0b4',description:'Peines que reman: mejoran la aceleración y el giro, con un pequeño aporte de velocidad.',weight:0,category:'motor'},
  jet:{name:'Sifón propulsor',cost:3,color:'#e1cba9',description:'Expulsa agua durante el impulso: más empuje, mayor duración y menor recarga.',weight:.03,category:'motor'},
  spike:{name:'Pincho',cost:2,color:'#f4d992',description:'Una punta rígida que daña al contacto desde su posición. Añade peso.',weight:.08,category:'defense'},
  plate:{name:'Placa',cost:2,color:'#90c7d6',description:'Escudo de membrana: reduce un 65% el daño físico recibido desde su sector.',weight:.08,category:'defense'},
  poison:{name:'Glándula tóxica',cost:3,color:'#abc75e',description:'Al tocar un enemigo, deja una nube dañina y ralentizadora. Recarga de 4 segundos.',weight:.06,category:'defense'},
  electric:{name:'Órgano eléctrico',cost:4,color:'#b0c9ff',description:'Descarga de contacto localizada: daño y aturdimiento breve. Recarga de 3 segundos.',weight:.08,category:'defense'},
};
export const BALANCE={world:10400,foodCount:320,population:34,spatialCell:180,acceleration:6,friction:7,baseSpeed:125,baseHealth:100,dashDuration:.26,dashCooldown:3.5,hitInterval:.7,hurtProtection:.22,attackDamage:14,spikeDamage:11,armorReduction:.65,healPerFood:.45,
  poisonCooldown:4,poisonDuration:2.6,poisonDamagePerSecond:5,electricCooldown:3,electricDamage:10,electricStun:.32,maxClouds:12,
  finalFood:150,finalZone:{x:7550,y:4900,radius:700},scales:[
    {name:'Recién nacido',size:1,food:120,capacity:6,points:0},
    {name:'Explorador',size:1.45,food:180,capacity:8,points:8},
    {name:'Competidor',size:2.05,food:260,capacity:10,points:8},
    {name:'Dominante',size:2.9,food:360,capacity:12,points:10},
    {name:'Madurez',size:4.1,food:150,capacity:12,points:10},
  ]};
export type Behavior='gather'|'filter'|'flee'|'hunt'|'scavenge'|'guard';
export interface Species {name:string;color:number;shape:number;speed:number;size:number;behavior:Behavior;description:string;modules:[PartKind,number][];profile:BodyProfile;eyes:Eyes;pattern:SkinPattern;minimumScale:number}
function species(name:string,color:number,shape:number,speed:number,size:number,behavior:Behavior,description:string,modules:[PartKind,number][],extra:Partial<Species>={}):Species{return {name,color,shape,speed,size,behavior,description,modules,profile:profileFor(shape),eyes:{...DEFAULT_EYES},pattern:'mottled',minimumScale:0,...extra};}
export const SPECIES={
  moss:species('Musguín',0xa8bf59,0,.65,.95,'gather','Pacífico. Pasta en las plantas y huye si te acercas armado.',[['gather',0],['flagellum',Math.PI]]),
  sieve:species('Velaria',0x8bacbf,2,.65,1.15,'filter','Tranquilo. Se desliza por las nubes de partículas.',[['filter',0],['filter',1.25],['flagellum',Math.PI]],{pattern:'plain',eyes:{kind:'stalk',pairs:1,position:.38,spacing:.75}}),
  dart:species('Centella',0xd4b653,2,1.5,.72,'flee','Presa ligera y veloz. Escapa con cambios de rumbo.',[['gather',0],['flagellum',2.65]],{pattern:'bands'}),
  hunter:species('Rojafauce',0xc05a66,0,1.1,1.2,'hunt','Cazador frontal. Señala la embestida y abandona las persecuciones largas.',[['jaw',0],['flagellum',Math.PI],['spike',1.3]],{eyes:{kind:'orb',pairs:1,position:.51,spacing:.9}}),
  shell:species('Ámbaro',0xcfaa63,1,.45,1.35,'gather','Lento e inofensivo. Sus placas protegen los flancos.',[['gather',0],['plate',.9],['plate',1.8],['flagellum',Math.PI]],{pattern:'bands'}),
  thorn:species('Espinaria',0xb64861,1,.7,1.2,'hunt','Espinosa. Evita sus laterales; la cola queda menos protegida.',[['jaw',0],['spike',.72],['spike',1.4],['spike',2.2],['flagellum',Math.PI]],{minimumScale:1,pattern:'granules',eyes:{kind:'orb',pairs:2,position:.25,spacing:1}}),
  cloud:species('Nébula',0x9b83c4,3,.45,1.45,'filter','Grande y pacífica. Filtra despacio entre el plancton.',[['filter',0],['filter',1.1],['cilia',2]],{eyes:{kind:'compound',pairs:2,position:0,spacing:.86},pattern:'granules'}),
  scavenger:species('Cormora',0xcd8183,2,.95,.8,'scavenge','Carroñero. Busca cadáveres y prefiere huir a combatir.',[['jaw',0],['cilia',1.4],['flagellum',Math.PI]],{pattern:'bands'}),
  toxic:species('Esporino',0x76a752,1,.5,1,'guard','Territorial. Protege su parche vegetal con glándulas tóxicas.',[['gather',0],['poison',1.3],['cilia',2.3]],{minimumScale:1,pattern:'granules',eyes:{kind:'stalk',pairs:2,position:.1,spacing:.8}}),
  electric:species('Voltaria',0x7391c7,3,.7,1.2,'guard','Territorial. Una descarga breve castiga acercarse a sus flancos.',[['filter',0],['electric',1.2],['cilia',2.35]],{minimumScale:2,pattern:'bands',eyes:{kind:'compound',pairs:1,position:.4,spacing:1}}),
  jet:species('Vorticela',0x977dc3,2,1.15,1.25,'hunt','Cazador de impulso. Rápido en línea recta y vulnerable al girar.',[['jaw',0],['jet',Math.PI],['cilia',1.6],['spike',.7]],{minimumScale:1,pattern:'granules'}),
  grazer:species('Coracinta',0x70aea0,2,.95,.9,'gather','Recolector social. Se desplaza con cilios entre plantas.',[['gather',0],['cilia',1.1],['cilia',2.2]],{pattern:'bands',eyes:{kind:'stalk',pairs:1,position:.45,spacing:.8}}),
  giant:species('Atrax',0x945c82,3,.6,1.85,'hunt','Depredador pesado. Muchas puntas, poca capacidad de giro.',[['jaw',0],['spike',.65],['spike',1.35],['plate',2.1],['jet',Math.PI]],{minimumScale:3,pattern:'granules',eyes:{kind:'orb',pairs:3,position:.1,spacing:.97}}),
  sprinter:species('Picoveloz',0xd5a358,2,1.45,.88,'hunt','Pequeño cazador. Ataca rápido, pero resiste poco daño.',[['jaw',0],['flagellum',2.7],['spike',1.4]],{minimumScale:2,pattern:'plain',eyes:{kind:'stalk',pairs:1,position:.51,spacing:.83}}),
} satisfies Record<string,Species>;
export type SpeciesKind=keyof typeof SPECIES;
export const SPECIES_KEYS=Object.keys(SPECIES) as SpeciesKind[];
export function speciesLoadout(spec:Species){const parts:Parts=Array(ORGAN_SLOTS).fill(null),angles=[...DEFAULT_ANGLES];let i=0;for(const [part,a]of spec.modules){for(const angle of Math.abs(Math.sin(a))<.15?[a]:[a,-a]){if(i<ORGAN_SLOTS){parts[i]=part;angles[i]=angle;i++;}}}return {parts,angles};}
